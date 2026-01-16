import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, getDoc, collection, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { generateSyncCode } from '../utils/helpers';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const CHUNK_SIZE = 16384; 
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
  const [activePeers, setActivePeers] = useState([]); 
  const [errorMsg, setErrorMsg] = useState('');
  
  const peerConnections = useRef(new Map());
  const dataChannels = useRef(new Map());
  const incomingChunks = useRef(new Map());
  const lastHeartbeat = useRef(new Map());
  const heartbeatTimer = useRef(null);
  const roomLivenessTimer = useRef(null);

  useEffect(() => {
    return () => cleanupRTC();
  }, []);

  const cleanupRTC = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    dataChannels.current.forEach(dc => dc.close());
    dataChannels.current.clear();
    incomingChunks.current.clear();
    lastHeartbeat.current.clear();
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (roomLivenessTimer.current) clearInterval(roomLivenessTimer.current);
    
    setSyncStatus('disconnected');
    setSyncCode(null);
    setActivePeers([]);
    setErrorMsg('');
  }, []);

  // --- Data Channel Logic ---
  const handleDataMessage = useCallback((peerId, event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'PING') {
        dataChannels.current.get(peerId)?.send(JSON.stringify({ type: 'PONG' }));
        lastHeartbeat.current.set(peerId, Date.now());
        return;
      }
      if (msg.type === 'PONG') {
        lastHeartbeat.current.set(peerId, Date.now());
        return;
      }

      if (msg.type === 'CHUNK') {
        if (!incomingChunks.current.has(peerId)) {
          incomingChunks.current.set(peerId, { chunks: new Array(msg.total), count: 0 });
        }
        const transfer = incomingChunks.current.get(peerId);
        transfer.chunks[msg.index] = msg.data;
        transfer.count++;

        if (transfer.count === msg.total) {
          const fullData = transfer.chunks.join('');
          incomingChunks.current.delete(peerId);
          handleRemoteUpdate(JSON.parse(fullData));
        }
        return;
      }

      if (msg.type === 'SYNC_UPDATE') {
        handleRemoteUpdate(msg);
      }
    } catch (e) {
      console.error("Sync parse error", e);
    }
  }, [syncWithRemote]);

  const handleRemoteUpdate = (data) => {
    if (syncWithRemote) syncWithRemote(data);
  };

  const sendToPeer = (peerId, payload) => {
    const channel = dataChannels.current.get(peerId);
    if (!channel || channel.readyState !== 'open') return;

    const json = JSON.stringify(payload);
    
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

  const broadcastSyncData = useCallback(() => {
    const payload = {
      type: 'SYNC_UPDATE',
      events,
      classColors,
      hiddenClasses,
      changeLog, 
      timestamp: Date.now()
    };
    dataChannels.current.forEach((_, peerId) => sendToPeer(peerId, payload));
  }, [events, classColors, hiddenClasses, changeLog]);

  useEffect(() => {
    const t = setTimeout(() => broadcastSyncData(), 200);
    return () => clearTimeout(t);
  }, [broadcastSyncData]);

  // --- Internal Heartbeat (WebRTC level) ---
  useEffect(() => {
    heartbeatTimer.current = setInterval(() => {
        const now = Date.now();
        dataChannels.current.forEach((dc, peerId) => {
            if (dc.readyState === 'open') {
                dc.send(JSON.stringify({ type: 'PING' }));
                const last = lastHeartbeat.current.get(peerId) || now;
                if (now - last > CONNECTION_TIMEOUT) {
                    console.warn(`Peer ${peerId} timed out.`);
                    dc.close();
                    peerConnections.current.get(peerId)?.close();
                    dataChannels.current.delete(peerId);
                    peerConnections.current.delete(peerId);
                    setActivePeers(prev => prev.filter(p => p !== peerId));
                }
            }
        });
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(heartbeatTimer.current);
  }, []);

  // --- Peer Gen ---
  const createPeerConnection = (peerId, initiator) => {
    if (peerConnections.current.has(peerId)) return peerConnections.current.get(peerId);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peerId, pc);
    lastHeartbeat.current.set(peerId, Date.now());

    pc.onicecandidate = (event) => {
      if (event.candidate && syncCode) {
        const coll = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', syncCode, 'candidates');
        addDoc(coll, {
           target: peerId,
           sender: user.uid,
           candidate: JSON.stringify(event.candidate)
        }).catch(e => {
            console.error("Candidate write failed", e);
            setSyncStatus('error');
            setErrorMsg("Permissions Error: Check Firestore Rules");
        });
      }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
             if (!activePeers.includes(peerId)) setActivePeers(prev => [...prev, peerId]);
             setSyncStatus('connected');
             setErrorMsg('');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
             setActivePeers(prev => prev.filter(p => p !== peerId));
             if (activePeers.length === 0) setSyncStatus('connecting');
        }
    };

    if (initiator) {
        const channel = pc.createDataChannel("planner_sync");
        setupChannel(peerId, channel);
    } else {
        pc.ondatachannel = (e) => setupChannel(peerId, e.channel);
    }

    return pc;
  };

  const setupChannel = (peerId, channel) => {
      dataChannels.current.set(peerId, channel);
      channel.onmessage = (e) => handleDataMessage(peerId, e);
      channel.onopen = () => {
          const payload = {
            type: 'SYNC_UPDATE',
            events, classColors, hiddenClasses, changeLog, 
            timestamp: Date.now()
          };
          sendToPeer(peerId, payload);
      };
  };

  // --- Session Public API ---

  const createSyncSession = useCallback(async (customCode, password) => {
    if (!db || !user) return;
    cleanupRTC();
    
    const code = customCode || generateSyncCode();
    setSyncCode(code);
    setSyncStatus('active'); 

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    
    // Clear old data if taking over
    try {
        const offers = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers'));
        offers.forEach(d => deleteDoc(d.ref));
        const cands = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'candidates'));
        cands.forEach(d => deleteDoc(d.ref));
    } catch(e) { console.warn("Cleanup warning", e); }

    await setDoc(docRef, {
      created: Date.now(),
      last_seen: Date.now(),
      hostId: user.uid,
      password: password || '', 
      peers: []
    });

    // Start Host Heartbeat
    roomLivenessTimer.current = setInterval(() => {
        updateDoc(docRef, { last_seen: Date.now() }).catch(e => {
            console.error("Heartbeat failed", e);
            // Don't error UI on heartbeat fail alone, but log it
        });
    }, 5000);

    onSnapshot(docRef, async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.peers) {
            data.peers.forEach(async (peerId) => {
                if (peerId !== user.uid && !peerConnections.current.has(peerId)) {
                    const pc = createPeerConnection(peerId, true);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
                    await addDoc(offerColl, {
                        to: peerId, from: user.uid, type: 'offer', sdp: JSON.stringify(offer)
                    });
                }
            });
        }
    }, (err) => {
        console.error("Room listener error", err);
        setSyncStatus('error');
        setErrorMsg("Permission Denied: Cannot listen to Room");
    });

    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
    onSnapshot(offerColl, (snap) => {
        snap.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.to === user.uid && data.type === 'answer') {
                    const pc = peerConnections.current.get(data.from);
                    if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(JSON.parse(data.sdp));
                }
            }
        });
    }, (err) => console.error("Offers listener error", err));

    const candColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'candidates');
    onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.target === user.uid) {
                    const pc = peerConnections.current.get(data.sender);
                    if (pc) pc.addIceCandidate(JSON.parse(data.candidate)).catch(e => {});
                }
            }
        });
    }, (err) => console.error("Candidates listener error", err));

  }, [db, user, appId, cleanupRTC, events]);

  const joinSyncSession = useCallback(async (code, password) => {
    if (!db || !user || !code) return;

    cleanupRTC();
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
        throw new Error("Room not found");
    }
    
    const sessionData = snap.data();
    
    if (sessionData.password && sessionData.password !== password) {
        throw new Error("Invalid Password");
    }

    // Check Liveness (Host must have updated within last 15 seconds)
    const lastSeen = sessionData.last_seen || 0;
    if (Date.now() - lastSeen > 15000) {
        throw new Error("Room is inactive");
    }

    setSyncCode(code);
    setSyncStatus('connecting');

    await updateDoc(docRef, { peers: arrayUnion(user.uid) });

    const offerColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'offers');
    onSnapshot(offerColl, (snap) => {
        snap.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.to === user.uid && data.type === 'offer') {
                    const pc = createPeerConnection(data.from, false);
                    await pc.setRemoteDescription(JSON.parse(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await addDoc(offerColl, {
                        to: data.from, from: user.uid, type: 'answer', sdp: JSON.stringify(answer)
                    });
                }
            }
        });
    }, (err) => {
        setSyncStatus('error');
        setErrorMsg("Permission Denied: Cannot listen to Offers");
    });

    const candColl = collection(db, 'artifacts', appId, 'public', 'data', 'signaling', code, 'candidates');
    onSnapshot(candColl, (snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.target === user.uid) {
                    const pc = peerConnections.current.get(data.sender);
                    if (pc) pc.addIceCandidate(JSON.parse(data.candidate)).catch(e => {});
                }
            }
        });
    }, (err) => console.error("Candidates listener error", err));

  }, [db, user, appId, cleanupRTC, events]);

  return {
    syncCode,
    syncStatus,
    activePeersCount: activePeers.length,
    createSyncSession,
    joinSyncSession,
    leaveSyncSession: cleanupRTC,
    errorMsg
  };
};