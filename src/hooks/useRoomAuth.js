import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { db, appId } from "../utils/firebase";
import { hashPassword } from "../utils/crypto";

export const useRoomAuth = (roomId, roomPassword, user) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    // Reset state if inputs are invalid
    if (!roomId || !user) {
      setIsAuthorized(false);
      setIsHost(false);
      setPeers([]);
      return;
    }

    setAuthError(null);
    let unsubscribeRoom = () => {};
    let unsubscribePeers = () => {};

    const roomRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "rooms",
      roomId,
    );
    const peersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `rooms_${roomId}_peers`,
    );

    const connectToRoom = async () => {
      try {
        const snapshot = await getDoc(roomRef);
        const currentHash = await hashPassword(roomPassword || "", roomId);

        // 1. Validate or Create Room
        if (!snapshot.exists()) {
          // Room doesn't exist -> Create it -> User becomes Host
          // Store HASH, not plaintext password
          await setDoc(roomRef, {
            created: serverTimestamp(),
            hostId: user.uid,
            passwordHash: currentHash,
            classColors: {},
          });
          setIsHost(true);
          setIsAuthorized(true);
        } else {
          // Room exists -> Validate Password Hash
          const data = snapshot.data();

          if (data.passwordHash && data.passwordHash !== currentHash) {
            setAuthError("Incorrect Room Password");
            setIsAuthorized(false);
            return;
          }

          setIsHost(data.hostId === user.uid);
          setIsAuthorized(true);
        }

        // 2. Register Presence (Peers)
        await setDoc(
          doc(peersRef, user.uid),
          {
            uid: user.uid,
            name: user.displayName || "Anonymous",
            joinedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
          },
          { merge: true },
        );

        // 3. Listen for Peers
        const q = query(peersRef, orderBy("joinedAt", "asc"));
        unsubscribePeers = onSnapshot(q, (peerSnap) => {
          setPeers(peerSnap.docs.map((d) => d.data()));
        });

        // 4. Listen to Room Metadata (in case host changes or room deleted)
        unsubscribeRoom = onSnapshot(roomRef, (snap) => {
          if (!snap.exists()) {
            setAuthError("Room was deleted.");
            setIsAuthorized(false);
          }
        });
      } catch (err) {
        console.error("Room Auth Error:", err);
        setAuthError("Failed to connect to room.");
        setIsAuthorized(false);
      }
    };

    connectToRoom();

    return () => {
      unsubscribeRoom();
      unsubscribePeers();
    };
  }, [roomId, user, roomPassword]);

  return { isAuthorized, isHost, authError, peers };
};
