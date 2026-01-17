import { useState, useEffect, useRef } from 'react';
import { 
  doc, collection, setDoc, onSnapshot, query, orderBy, 
  serverTimestamp, updateDoc, getDoc, addDoc 
} from 'firebase/firestore';
import { db, appId } from '../utils/firebase';

// 1. Add setClassColors to arguments
export const usePlannerSync = (roomId, user, setEvents, setClassColors,roomPassword) => {
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState([]);
  const [syncError, setSyncError] = useState(null); // <--- NEW Error State
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Ref to prevent infinite loops (Applying Remote -> Triggers Local -> Sends Remote)
  const isApplyingRemote = useRef(false);
  // 0. NEW: PASSWORD & ACCESS VALIDATION
  useEffect(() => {
    if (!roomId || !user) {
      setIsAuthorized(false);
      setSyncError(null);
      return;
    }

    let active = true;

    const validateRoom = async () => {
      try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
          const data = snap.data();
          // If room has a password and it doesn't match input
          if (data.password && data.password !== roomPassword) {
            if (active) {
              setSyncError("Incorrect Room Password");
              setIsAuthorized(false);
            }
            return;
          }
        }
        // If room doesn't exist or password matches
        if (active) {
          setSyncError(null);
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error("Room validation error:", err);
      }
    };

    validateRoom();
    return () => { active = false; };
  }, [roomId, user, roomPassword]);
  // 1. HOST ELECTION & PEER TRACKING
  useEffect(() => {
    if (!roomId || !user || !isAuthorized) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const peersRef = collection(db, 'artifacts', appId, 'public', 'data', `rooms_${roomId}_peers`);
    const myPeerRef = doc(peersRef, user.uid);

    // Join Room
    setDoc(myPeerRef, {
      uid: user.uid,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      deviceType: 'web'
    }, { merge: true });

    // Listen to Peers for "Oldest Client" election
    const unsubscribePeers = onSnapshot(
      query(peersRef, orderBy('joinedAt', 'asc')),
      async (snapshot) => {
        const activePeers = snapshot.docs.map(d => d.data());
        setPeers(activePeers);

        if (activePeers.length === 0) return;

        const oldestPeer = activePeers[0];
        const roomSnap = await getDoc(roomRef);
        const currentHostId = roomSnap.exists() ? roomSnap.data().hostId : null;

        // If I am oldest and host is missing/wrong, I take over
        if (oldestPeer.uid === user.uid && currentHostId !== user.uid) {
          console.log("👑 Taking over as Host");
          // FIX: Use setDoc with merge: true to create the doc if missing
          const updateData = { hostId: user.uid };
           if (roomPassword) updateData.password = roomPassword;
           
           setDoc(roomRef, updateData, { merge: true });
           setIsHost(true);
        } else {
           setIsHost(oldestPeer.uid === user.uid);
        }
      }
    );

    // Heartbeat to keep "lastActive" fresh
    const interval = setInterval(() => {
      setDoc(myPeerRef, { lastActive: serverTimestamp() }, { merge: true });
    }, 30000);

    return () => {
      unsubscribePeers();
      clearInterval(interval);
    };
  }, [roomId, user, isAuthorized]);

  // 2. DATA SYNC (Modification Protocol)
  useEffect(() => {
    if (!roomId || !user || !isAuthorized) return;

    const actionsRef = collection(db, 'artifacts', appId, 'public', 'data', `rooms_${roomId}_actions`);
    
    // Listen for delta updates
    const unsubscribeActions = onSnapshot(
      query(actionsRef, orderBy('timestamp', 'asc')), 
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const action = change.doc.data();
            // Ignore my own actions
            if (action.authorId !== user.uid) {
               isApplyingRemote.current = true;
               
               // 2. Handle COLORS action specifically
               if (action.type === 'COLORS') {
                  setClassColors(action.payload);
               } 
               // 3. Handle Event actions normally
               else {
                  setEvents(prev => {
                    if (action.type === 'ADD') {
                        if (prev.some(e => e.id === action.payload.id)) return prev;
                        return [...prev, action.payload];
                    }
                    if (action.type === 'UPDATE') return prev.map(e => e.id === action.payload.id ? action.payload : e);
                    if (action.type === 'DELETE') return prev.filter(e => e.id !== action.payload);
                    if (action.type === 'BULK') return action.payload;
                    return prev;
                  });
               }
               
               isApplyingRemote.current = false;
            }
          }
        });
      }
    );
    return () => unsubscribeActions();
  }, [roomId, user, setEvents]);

  // 3. OUTBOUND SYNC
  const syncAction = async (type, payload) => {
    if (roomId && user && isAuthorized && !isApplyingRemote.current) {
      try {
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', `rooms_${roomId}_actions`),
          {
            type,
            payload,
            authorId: user.uid,
            timestamp: serverTimestamp()
          }
        );
      } catch (e) {
        console.error("Sync failed:", e);
      }
    }
  };

  return { isHost, peers, syncAction, syncError };
};