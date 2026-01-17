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
import { createAccessChallenge, verifyAccessChallenge } from "../utils/crypto";

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

        // 1. Validate or Create Room
        if (!snapshot.exists()) {
          // Room doesn't exist -> Create it with a Challenge
          const challenge = await createAccessChallenge(roomPassword, roomId);

          await setDoc(roomRef, {
            created: serverTimestamp(),
            hostId: user.uid,
            authChallenge: challenge, // Store this instead of passwordHash
            classColors: {},
          });
          setIsHost(true);
          setIsAuthorized(true);
        } else {
          // Room exists -> Verify using the Challenge
          const data = snapshot.data();

          // Check if authorized
          const isValid = await verifyAccessChallenge(
            roomPassword || "",
            roomId,
            data.authChallenge,
          );

          if (!isValid) {
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
