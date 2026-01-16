import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { generateSyncCode } from '../utils/helpers';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

export const usePlannerSync = (firebaseState, dataState) => {
  const { db, user, appId } = firebaseState;
  const { events, classColors, hiddenClasses, setEvents, setClassColors, setHiddenClasses } = dataState;

  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected'); // disconnected, connecting, connected
  
  const pc = useRef(null);
  const dc = useRef(null);
  const isHost = useRef(false);
  const isRemoteUpdate = useRef(false);
  const processedCandidates = useRef(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupRTC();
  }, []);

  const cleanupRTC = useCallback(() => {
    if (dc.current) dc.current.close();
    if (pc.current) pc.current.close();
    pc.current = null;
    dc.current = null;
    processedCandidates.current.clear();
    setSyncStatus('disconnected');
    setSyncCode(null);
  }, []);

  // --- Data Channel Logic ---

  const setupDataChannel = useCallback((channel) => {
    dc.current = channel;
    
    channel.onopen = () => {
      setSyncStatus('connected');
      // Send current state immediately on connect
      sendSyncData(true);
    };
    
    channel.onclose = () => setSyncStatus('disconnected');
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SYNC_UPDATE') {
          handleRemoteUpdate(data);
        }
      } catch (e) {
        console.error("Sync parse error", e);
      }
    };
  }, [events, classColors, hiddenClasses]); // Dependencies might trigger re-binds but needed for closure capture if not careful, actually sendSyncData uses latest

  const handleRemoteUpdate = (data) => {
    isRemoteUpdate.current = true;

    // CRITICAL: Equality check to prevent infinite loops.
    // We only update state if the incoming data is actually different.
    let hasChanges = false;

    if (JSON.stringify(data.events) !== JSON.stringify(events)) {
       setEvents(data.events);
       hasChanges = true;
    }
    if (JSON.stringify(data.classColors) !== JSON.stringify(classColors)) {
       setClassColors(data.classColors);
       hasChanges = true;
    }
    if (JSON.stringify(data.hiddenClasses) !== JSON.stringify(hiddenClasses)) {
       setHiddenClasses(data.hiddenClasses);
       hasChanges = true;
    }

    // Release the lock after a safe delay
    setTimeout(() => { isRemoteUpdate.current = false; }, 300);
  };

  const sendSyncData = (force = false) => {
    if (!dc.current || dc.current.readyState !== 'open') return;
    
    // If this change came from a remote update, do NOT echo it back.
    if (isRemoteUpdate.current && !force) return;

    const payload = JSON.stringify({
      type: 'SYNC_UPDATE',
      events,
      classColors,
      hiddenClasses,
      timestamp: Date.now()
    });

    try {
      dc.current.send(payload);
    } catch (e) {
      console.error("Failed to send sync data", e);
    }
  };

  // Auto-send when local state changes
  useEffect(() => {
    sendSyncData();
  }, [events, classColors, hiddenClasses]);

  // --- Session Management ---

  const createSyncSession = useCallback(async () => {
    if (!db) return alert("Database connection not established. Please refresh the page.");
    if (!user) return alert("Signing in... Please wait a moment and try again.");

    cleanupRTC();
    const code = generateSyncCode();
    setSyncCode(code);
    setSyncStatus('connecting');
    isHost.current = true;

    // 1. Setup PeerConnection
    pc.current = new RTCPeerConnection(RTC_CONFIG);
    
    // 2. Setup Signaling Listeners (ICE)
    // FIX: Race condition handling. ICE candidates might appear before the 
    // offer document is created. We use setDoc({merge: true}) to ensure 
    // the document is created if it's not there yet.
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
        setDoc(docRef, {
          host_candidates: arrayUnion(JSON.stringify(event.candidate))
        }, { merge: true }).catch((e) => console.error("Error storing host candidate:", e));
      }
    };

    // 3. Create Data Channel (Host creates it)
    const channel = pc.current.createDataChannel("planner_sync");
    setupDataChannel(channel);

    // 4. Create Offer
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    // 5. Write to Signaling
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    await setDoc(docRef, {
      offer: JSON.stringify(offer),
      created: Date.now(),
      hostId: user.uid
    }, { merge: true }); // Merge to avoid wiping candidates if they arrived first

    // 6. Listen for Answer
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists() || !pc.current) return;
      const data = snap.data();

      if (!pc.current.currentRemoteDescription && data.answer) {
        pc.current.setRemoteDescription(JSON.parse(data.answer));
      }

      if (data.peer_candidates) {
        data.peer_candidates.forEach(c => {
          if (!processedCandidates.current.has(c)) {
            processedCandidates.current.add(c);
            pc.current.addIceCandidate(JSON.parse(c)).catch(() => {});
          }
        });
      }
    });
  }, [db, user, appId, cleanupRTC, setupDataChannel]);

  const joinSyncSession = useCallback(async (code) => {
    if (!db) return alert("Database connection not established. Please refresh the page.");
    if (!user) return alert("Signing in... Please wait a moment and try again.");
    if (!code) return;

    cleanupRTC();
    setSyncCode(code);
    setSyncStatus('connecting');
    isHost.current = false;

    // 1. Setup PC
    pc.current = new RTCPeerConnection(RTC_CONFIG);

    // 2. Handle Data Channel (Guest waits for it)
    pc.current.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    // 3. ICE Candidates
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
        // Robustness: Ensure doc exists or merge nicely
        setDoc(docRef, {
          peer_candidates: arrayUnion(JSON.stringify(event.candidate))
        }, { merge: true }).catch((e) => console.error("Error storing peer candidate:", e));
      }
    };

    // 4. Read Offer & Answer
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
    const unsub = onSnapshot(docRef, async (snap) => {
      if (!snap.exists() || !pc.current) return;
      const data = snap.data();

      // Handle Offer
      if (!pc.current.currentRemoteDescription && data.offer) {
        await pc.current.setRemoteDescription(JSON.parse(data.offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        
        await updateDoc(docRef, {
          answer: JSON.stringify(answer),
          peerId: user.uid
        });
      }

      // Handle Host Candidates
      if (data.host_candidates) {
        data.host_candidates.forEach(c => {
          if (!processedCandidates.current.has(c)) {
            processedCandidates.current.add(c);
            pc.current.addIceCandidate(JSON.parse(c)).catch(() => {});
          }
        });
      }
    });
  }, [db, user, appId, cleanupRTC, setupDataChannel]);

  return {
    syncCode,
    syncStatus,
    createSyncSession,
    joinSyncSession,
    leaveSyncSession: cleanupRTC
  };
};