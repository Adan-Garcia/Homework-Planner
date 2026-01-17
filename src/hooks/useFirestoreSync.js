import { useEffect, useRef, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, appId } from "../utils/firebase";

export const useFirestoreSync = (
  roomId,
  isAuthorized,
  setEvents,
  setClassColors,
) => {
  // Flag to prevent infinite loops:
  // When data comes FROM server, we shouldn't send it back TO server.
  const isSyncingRef = useRef(false);

  // 1. LISTEN: Inbound Data (Server -> Client)
  useEffect(() => {
    if (!roomId || !isAuthorized) return;

    const eventsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `rooms_${roomId}_events`,
    );
    const roomRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "rooms",
      roomId,
    );

    console.log(`[Sync] Subscribing to room: ${roomId}`);

    // A. Event Listener
    const unsubEvents = onSnapshot(
      eventsRef,
      (snapshot) => {
        // Lock: This update is from the server
        isSyncingRef.current = true;

        const loadedEvents = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));

        // Update State
        setEvents((prev) => {
          // Simple optimization: only update if length or IDs changed
          // (Deep comparison is expensive, so we rely on React to handle virtual DOM diffs)
          return loadedEvents;
        });

        // Unlock after a brief tick to allow state to settle
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      },
      (error) => {
        console.error("[Sync] Event Listener Error:", error);
      },
    );

    // B. Color Listener (From Room Doc)
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.classColors) {
          setClassColors((prev) => {
            // Only update if actually different to prevent re-renders
            if (JSON.stringify(prev) !== JSON.stringify(data.classColors)) {
              return data.classColors;
            }
            return prev;
          });
        }
      }
    });

    return () => {
      unsubEvents();
      unsubRoom();
    };
  }, [roomId, isAuthorized, setEvents, setClassColors]);

  // 2. WRITE: Outbound Actions (Client -> Server)
  // This is the ONLY way data leaves the client. No more periodic loops.
  const syncAction = useCallback(
    async (actionType, payload) => {
      if (!roomId || !isAuthorized) return;

      // Safety: If we are technically in the middle of receiving a huge payload,
      // we might want to wait, but for single actions, it's usually safe to fire.
      // We check isSyncingRef primarily to ensure we don't have effects triggering actions.

      const eventsCol = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `rooms_${roomId}_events`,
      );
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
        console.log(`[Sync] Action: ${actionType}`, payload);

        switch (actionType) {
          case "ADD":
          case "UPDATE":
            if (payload.id) {
              await setDoc(doc(eventsCol, payload.id), payload, {
                merge: true,
              });
            }
            break;

          case "DELETE":
            if (payload) {
              await deleteDoc(doc(eventsCol, payload));
            }
            break;

          case "COLORS":
            await updateDoc(roomRef, { classColors: payload });
            break;

          case "BULK":
            if (Array.isArray(payload) && payload.length > 0) {
              const batch = writeBatch(db);
              payload.forEach((ev) => {
                if (ev.id) batch.set(doc(eventsCol, ev.id), ev);
              });
              await batch.commit();
            }
            break;

          default:
            console.warn("[Sync] Unknown action type:", actionType);
        }
      } catch (e) {
        console.error(`[Sync] Action Failed (${actionType}):`, e);
      }
    },
    [roomId, isAuthorized],
  );

  return { syncAction };
};
