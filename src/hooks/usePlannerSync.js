import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp, getDoc, collection, addDoc } from 'firebase/firestore';
import { generateSyncCode } from '../utils/helpers';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const CHUNK_SIZE = 16384; // 16KB for safe WebRTC transfer
const HEARTBEAT_INTERVAL = 5000;
const CONNECTION_TIMEOUT = 15000;

export const usePlannerSync = (firebaseState, dataState) => {
  const { db, user, appId } = firebaseState;
  const { 
    events, 
    classColors, 
    hiddenClasses, 
    changeLog,          
    syncWithRemote      
  } = dataState;

  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [activePeers, setActivePeers] = useState([]); // List of connected peer IDs
  
  // Refs for Multi-User Management
  const peerConnections = useRef(new Map()); // Map<peerId, RTCPeerConnection>
  const dataChannels = useRef(new Map());    // Map<peerId, RTCDataChannel>
  const processedCandidates = useRef(new Set());
  const incomingChunks = useRef(new Map());  // Map<peerId, { buffers: [], total: 0, received: 0 }>
  const lastHeartbeat = useRef(new Map());   // Map<peerId, timestamp>
  const heartbeatTimer = useRef(null);
  const isHost = useRef(false);

  // cleanup
  useEffect(() => {
    return () => cleanupRTC();
  }, []);

  const cleanupRTC = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    dataChannels.current.forEach(dc => dc.close());
    dataChannels.current.clear();
    processedCandidates.current.clear();
    incomingChunks.current.clear();
    lastHeartbeat.current.clear();
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    
    setSyncStatus('disconnected');
    setSyncCode(null);
    setActivePeers([]);
  }, []);

  // --- Data Channel Logic (Chunking & Heartbeat) ---

  const handleDataMessage = useCallback((peerId, event) => {
    try {
      const msg = JSON.parse(event.data);

      // 1. Heartbeat
      if (msg.type === 'PING') {
        dataChannels.current.get(peerId)?.send(JSON.stringify({ type: 'PONG' }));
        lastHeartbeat.current.set(peerId, Date.now());
        return;
      }
      if (msg.type === 'PONG') {
        lastHeartbeat.current.set(peerId, Date.now());
        return;
      }

      // 2. Chunking Logic
      if (msg.type === 'CHUNK') {
        if (!incomingChunks.current.has(peerId)) {
          incomingChunks.current.set(peerId, { chunks: new Array(msg.total), count: 0 });
        }
        
        const transfer = incomingChunks.current.get(peerId);
        transfer.chunks[msg.index] = msg.data;
        transfer.count++;

        if (transfer.count === msg.total) {
          // All chunks received, reassemble
          const fullData = transfer.chunks.join('');
          incomingChunks.current.delete(peerId);
          handleRemoteUpdate(JSON.parse(fullData));
        }
        return;
      }

      // 3. Normal Message
      if (msg.type === 'SYNC_UPDATE') {
        handleRemoteUpdate(msg);
      }

    } catch (e) {
      console.error("Sync parse error", e);
    }
  }, [syncWithRemote]);

  const handleRemoteUpdate = (data) => {
    // Use Context's smart sync logic
    if (syncWithRemote) {
        syncWithRemote(data);
    }
  };

  const sendToPeer = (peerId, payload) => {
    const channel = dataChannels.current.get(peerId);
    if (!channel || channel.readyState !== 'open') return;

    const json = JSON.stringify(payload);
    
    // Check if we need chunking
    if (json.length > CHUNK_SIZE) {
        const total = Math.ceil(json.length / CHUNK_SIZE);
        for (let i = 0; i < total; i++) {
            const chunk = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            channel.send(JSON.stringify({
                type: 'CHUNK',
                index: i,
                total: total,
                data: chunk
            }));
        }
    } else {
        channel.send(json);
    }
  };

  const broadcastSyncData = useCallback((force = false) => {
    const payload = {
      type: 'SYNC_UPDATE',
      events,
      classColors,
      hiddenClasses,
      changeLog, 
      timestamp: Date.now()
    };

    dataChannels.current.forEach((_, peerId) => {
        sendToPeer(peerId, payload);
    });
  }, [events, classColors, hiddenClasses, changeLog]);

  // Auto-send when logs change
  useEffect(() => {
    // Debounce slightly to avoid flood
    const t = setTimeout(() => broadcastSyncData(), 100);
    return () => clearTimeout(t);
  }, [broadcastSyncData]);

  // --- Heartbeat Monitor ---
  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
        const now = Date.now();
        dataChannels.current.forEach((dc, peerId) => {
            if (dc.readyState === 'open') {
                dc.send(JSON.stringify({ type: 'PING' }));
                
                // Check for timeout
                const last = lastHeartbeat.current.get(peerId) || now;
                if (now - last > CONNECTION_TIMEOUT) {
                    console.warn(`Peer ${peerId} timed out. Closing.`);
                    dc.close();
                    peerConnections.current.get(peerId)?.close();
                    // Cleanup maps
                    dataChannels.current.delete(peerId);
                    peerConnections.current.delete(peerId);
                    setActivePeers(prev => prev.filter(p => p !== peerId));
                }
            }
        });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeatTimer.current);
  }, []);


  // --- WebRTC Connection Factory ---

  const createPeerConnection = (peerId, initiator) => {
    if (peerConnections.current.has(peerId)) return peerConnections.current.get(peerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peerId, pc);
    lastHeartbeat.current.set(peerId, Date.now()); // Initialize heartbeat

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to signaling
        const coll = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', syncCode, 'candidates');
        addDoc(coll, {
           target: peerId,
           sender: user.uid,
           candidate: JSON.stringify(event.candidate)
        });
      }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
             if (!activePeers.includes(peerId)) setActivePeers(prev => [...prev, peerId]);
             setSyncStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
             setActivePeers(prev => prev.filter(p => p !== peerId));
             if (activePeers.length === 0) setSyncStatus('connecting'); // Revert to connecting if lost all
        }
    };

    if (initiator) {
        const channel = pc.createDataChannel("planner_sync");
        setupChannel(peerId, channel);
    } else {
        pc.ondatachannel = (e) => {
            setupChannel(peerId, e.channel);
        };
    }

    return pc;
  };

  const setupChannel = (peerId, channel) => {
      dataChannels.current.set(peerId, channel);
      channel.onmessage = (e) => handleDataMessage(peerId, e);
      channel.onopen = () => {
          // Send initial state
          const payload = {
            type: 'SYNC_UPDATE',
            events, classColors, hiddenClasses, changeLog, 
            timestamp: Date.now()
          };
          sendToPeer(peerId, payload);
      };
  };

  // --- Session Management ---

  const createSyncSession = useCallback(async (password) => {
    if (!db || !user) return;

    cleanupRTC();
    const code = generateSyncCode();
    setSyncCode(code);
    setSyncStatus('active'); // Host is always active
    isHost.current = true;

    // Create Session Doc with Password
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    await setDoc(docRef, {
      created: Date.now(),
      hostId: user.uid,
      password: password || '', // Simple password storage (hashing recommended for prod)
      peers: []
    });

    // Listen for joining peers
    const unsub = onSnapshot(docRef, async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        
        // Check for new peers in the 'peers' array
        if (data.peers) {
            data.peers.forEach(async (peerId) => {
                if (peerId !== user.uid && !peerConnections.current.has(peerId)) {
                    // Host initiates connection to new peer
                    const pc = createPeerConnection(peerId, true);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    // Send Offer
                    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
                    await addDoc(offerColl, {
                        to: peerId,
                        from: user.uid,
                        type: 'offer',
                        sdp: JSON.stringify(offer)
                    });
                }
            });
        }
    });

    // Listen for Answers
    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
    const unsubOffers = onSnapshot(offerColl, (snap) => {
        snap.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.to === user.uid && data.type === 'answer') {
                    const pc = peerConnections.current.get(data.from);
                    if (pc && !pc.currentRemoteDescription) {
                        await pc.setRemoteDescription(JSON.parse(data.sdp));
                    }
                }
            }
        });
    });

    // Listen for Candidates
    const candColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'candidates');
    const unsubCand = onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.target === user.uid) {
                    const pc = peerConnections.current.get(data.sender);
                    if (pc) pc.addIceCandidate(JSON.parse(data.candidate)).catch(e => {});
                }
            }
        });
    });

  }, [db, user, appId, cleanupRTC, events, classColors, hiddenClasses, changeLog]); // Deps

  const joinSyncSession = useCallback(async (code, password) => {
    if (!db || !user) return;
    if (!code) return;

    cleanupRTC();
    setSyncCode(code);
    setSyncStatus('connecting');
    isHost.current = false;

    // 1. Verify Session & Password
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
        alert("Session not found");
        return;
    }
    
    const sessionData = snap.data();
    if (sessionData.password && sessionData.password !== password) {
        alert("Invalid Password");
        setSyncStatus('disconnected');
        return;
    }

    // 2. Announce Presence
    await updateDoc(docRef, {
        peers: arrayUnion(user.uid)
    });

    // 3. Listen for Offers
    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
    const unsubOffers = onSnapshot(offerColl, (snap) => {
        snap.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.to === user.uid && data.type === 'offer') {
                    const pc = createPeerConnection(data.from, false);
                    await pc.setRemoteDescription(JSON.parse(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    // Send Answer
                    await addDoc(offerColl, {
                        to: data.from,
                        from: user.uid,
                        type: 'answer',
                        sdp: JSON.stringify(answer)
                    });
                }
            }
        });
    });

    // 4. Listen for Candidates
    const candColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'candidates');
    const unsubCand = onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.target === user.uid) {
                    const pc = peerConnections.current.get(data.sender);
                    if (pc) pc.addIceCandidate(JSON.parse(data.candidate)).catch(e => {});
                }
            }
        });
    });

  }, [db, user, appId, cleanupRTC, events, classColors, hiddenClasses, changeLog]);

  return {
    syncCode,
    syncStatus,
    activePeersCount: activePeers.length,
    createSyncSession,
    joinSyncSession,
    leaveSyncSession: cleanupRTC
  };
};