import { useState, useEffect, useRef } from 'react';
import { 
  doc, collection, setDoc, onSnapshot, query, orderBy, 
  serverTimestamp, updateDoc, getDoc, addDoc 
} from 'firebase/firestore';
import { db, appId } from '../utils/firebase';

export const usePlannerSync = (roomId, user, setEvents) => {
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState([]);
  
  // Ref to prevent infinite loops (Applying Remote -> Triggers Local -> Sends Remote)
  const isApplyingRemote = useRef(false);

  // 1. HOST ELECTION & PEER TRACKING
  useEffect(() => {
    if (!roomId || !user) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', `rooms_${roomId}`);
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
           updateDoc(roomRef, { hostId: user.uid });
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
  }, [roomId, user]);

  // 2. DATA SYNC (Modification Protocol)
  useEffect(() => {
    if (!roomId || !user) return;

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
               
               // Apply delta to local state
               setEvents(prev => {
                 if (action.type === 'ADD') return [...prev, action.payload];
                 if (action.type === 'UPDATE') return prev.map(e => e.id === action.payload.id ? action.payload : e);
                 if (action.type === 'DELETE') return prev.filter(e => e.id !== action.payload);
                 if (action.type === 'BULK') return action.payload;
                 return prev;
               });
               
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
    if (roomId && user && !isApplyingRemote.current) {
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

  return { isHost, peers, syncAction };
};