import { useEffect, useRef, useCallback, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../utils/firebase";
import { deriveKey, encryptEvent, decryptEvent } from "../utils/crypto";

export const useFirestoreSync = (
  roomId,
  roomPassword,
  isAuthorized,
  setEvents,
  setClassColors,
  events, // We need access to current events for some logic, though mainly handled via effect in Context
) => {
  // Flag to prevent infinite loops: Server Update -> Local State -> Server Update
  const isSyncingRef = useRef(false);
  const [cryptoKey, setCryptoKey] = useState(null);

  // 0. INIT: Derive Key
  useEffect(() => {
    const initKey = async () => {
      if (roomId && roomPassword) {
        try {
          const key = await deriveKey(roomPassword, roomId);
          setCryptoKey(key);
        } catch (e) {
          console.error("Key derivation failed", e);
          setCryptoKey(null);
        }
      } else {
        setCryptoKey(null);
      }
    };
    initKey();
  }, [roomId, roomPassword]);

  // 1. LISTEN: Inbound Data (Server -> Client)
  // Single Document Read: 1 Read Operation per update
  useEffect(() => {
    if (!roomId || !isAuthorized || !cryptoKey) return;

    // We now listen to the ROOM document directly, not a subcollection
    const roomRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "rooms",
      roomId,
    );

    console.log(`[Sync] Subscribing to Room Doc: ${roomId}`);

    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      // Handle Class Colors (Unencrypted for shared styling)
      if (data.classColors) {
        setClassColors((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(data.classColors)) {
            return data.classColors;
          }
          return prev;
        });
      }

      // Handle Events (Encrypted Blob)
      if (data.encryptedData) {
        // LOCK: This update is from server
        isSyncingRef.current = true;

        try {
          // Decrypt the single blob containing ALL events
          // Re-using decryptEvent logic since it handles { iv, data } format
          const decryptedPayload = await decryptEvent(
            data.encryptedData,
            cryptoKey,
          );

          // The payload itself is the array of events
          if (Array.isArray(decryptedPayload)) {
            setEvents(decryptedPayload);
          }
        } catch (e) {
          console.error("Failed to decrypt sync data", e);
        }

        // UNLOCK after a moment
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 500); // Higher timeout to ensure local React rendering settles
      }
    });

    return () => unsubscribe();
  }, [roomId, isAuthorized, cryptoKey, setEvents, setClassColors]);

  // 2. WRITE: Outbound Actions (Client -> Server)
  // Accepts the FULL state array. 1 Write Operation per save.
  const syncAction = useCallback(
    async (allEvents) => {
      if (!roomId || !isAuthorized || !cryptoKey) return;
      if (isSyncingRef.current) {
        console.log("Skipping sync: Update came from server");
        return;
      }

      const roomRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "rooms",
        roomId,
      );

      try {
        console.log(`[Sync] Saving Snapshot (${allEvents.length} items)`);

        // Encrypt the ENTIRE array as one object
        // We reuse encryptEvent but pass the whole array as the "data"
        // The ID field in the result will be undefined, which is fine for the blob
        const encryptedBlob = await encryptEvent(allEvents, cryptoKey);

        await setDoc(
          roomRef,
          {
            encryptedData: encryptedBlob,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (e) {
        console.error(`[Sync] Save Failed:`, e);
      }
    },
    [roomId, isAuthorized, cryptoKey],
  );

  // Helper for colors (separate to avoid encrypting style prefs)
  const syncColors = useCallback(
    async (colors) => {
      if (!roomId || !isAuthorized) return;
      const roomRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "rooms",
        roomId,
      );
      await setDoc(roomRef, { classColors: colors }, { merge: true });
    },
    [roomId, isAuthorized],
  );

  // 3. EPHEMERAL: Destroy Room
  const destroyRoomData = useCallback(async () => {
    if (!roomId || !isAuthorized) return;
    try {
      const roomRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "rooms",
        roomId,
      );
      await deleteDoc(roomRef);
      console.log("Room data destroyed");
    } catch (e) {
      console.error("Failed to destroy room", e);
    }
  }, [roomId, isAuthorized]);

  return { syncAction, syncColors, destroyRoomData };
};
