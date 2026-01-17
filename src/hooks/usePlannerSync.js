import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db, appId } from "../utils/firebase";

export const usePlannerSync = (
  roomId,
  user,
  currentEvents,
  classColors, // <--- NEW ARGUMENT
  setEvents,
  setClassColors,
  roomPassword
) => {
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState([]);
  const [syncError, setSyncError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Refs for access inside intervals/effects without dependency cycles
  const eventsRef = useRef(currentEvents);
  const colorsRef = useRef(classColors);

  // Track confirmed server state
  const remoteEventsMap = useRef(new Map());
  const remoteColorsRef = useRef({});

  useEffect(() => {
    eventsRef.current = currentEvents;
  }, [currentEvents]);

  useEffect(() => {
    colorsRef.current = classColors;
  }, [classColors]);

  // 1. Authorization, Host Logic & Initial Merge
  useEffect(() => {
    if (!roomId || !user) {
      setIsAuthorized(false);
      setSyncError(null);
      return;
    }

    let unsubscribeRoom = () => {};
    let unsubscribeEvents = () => {};
    let unsubscribePeers = () => {};

    const setupRoom = async () => {
      try {
        const roomRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "rooms",
          roomId
        );
        const eventsRef = collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `rooms_${roomId}_events`
        );

        const roomSnap = await getDoc(roomRef);

        // A. Validate or Create Room
        if (!roomSnap.exists()) {
          // New Room -> You are Host
          await setDoc(roomRef, {
            created: serverTimestamp(),
            hostId: user.uid,
            password: roomPassword || "",
            classColors: colorsRef.current || {},
          });
          setIsHost(true);
        } else {
          // Existing Room -> Check Password
          const data = roomSnap.data();
          if (data.password && data.password !== roomPassword) {
            setSyncError("Incorrect Room Password");
            setIsAuthorized(false);
            return;
          }
          setIsHost(data.hostId === user.uid);
        }

        setIsAuthorized(true);
        setSyncError(null);

        // B. Initial Merge (Immediate Sync on Join)
        const localEvents = eventsRef.current || [];
        if (localEvents.length > 0) {
          const remoteSnap = await getDocs(eventsRef);
          const remoteIds = new Set(remoteSnap.docs.map((d) => d.id));

          const batch = writeBatch(db);
          let hasUpdates = false;

          localEvents.forEach((ev) => {
            if (!remoteIds.has(ev.id)) {
              const docRef = doc(eventsRef, ev.id);
              batch.set(docRef, ev);
              hasUpdates = true;
            }
          });

          if (hasUpdates) {
            await batch.commit();
          }
        }

        // C. Setup Listeners

        // Colors & Metadata
        unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.classColors) {
              remoteColorsRef.current = data.classColors; // Update server tracker
              setClassColors(data.classColors);
            }
          }
        });

        // Events
        unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
          const loadedEvents = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));

          // Update server tracker
          const map = new Map();
          loadedEvents.forEach((e) => map.set(e.id, e));
          remoteEventsMap.current = map;

          setEvents(loadedEvents);
        });

        // Peers
        const peersRef = collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `rooms_${roomId}_peers`
        );
        await setDoc(
          doc(peersRef, user.uid),
          {
            uid: user.uid,
            joinedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            name: user.displayName || "Anonymous",
          },
          { merge: true }
        );

        const q = query(peersRef, orderBy("joinedAt", "asc"));
        unsubscribePeers = onSnapshot(q, (snapshot) => {
          setPeers(snapshot.docs.map((d) => d.data()));
        });
      } catch (err) {
        console.error("Sync Setup Error:", err);
        setSyncError("Connection failed.");
      }
    };

    setupRoom();

    return () => {
      unsubscribeRoom();
      unsubscribeEvents();
      unsubscribePeers();
    };
  }, [roomId, user, roomPassword]); // Keep dependencies stable

  // 2. Periodic Safety Sync (The "Periodic" Feature)
  useEffect(() => {
    if (!roomId || !user || !isAuthorized) return;

    // Run every 10 seconds to catch missed events/colors
    const intervalId = setInterval(async () => {
      const batch = writeBatch(db);
      let hasChanges = false;

      // 1. Check Events
      const localEvents = eventsRef.current || [];
      const remoteMap = remoteEventsMap.current;
      const eventsRefCol = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `rooms_${roomId}_events`
      );

      // Find events that are local but missing on server
      const missingEvents = localEvents.filter((ev) => !remoteMap.has(ev.id));

      // Limit batch size (Firestore max 500)
      const batchSafeEvents = missingEvents.slice(0, 400);

      if (batchSafeEvents.length > 0) {
        console.log(
          `Auto-Sync: Pushing ${batchSafeEvents.length} missing events...`
        );
        batchSafeEvents.forEach((ev) => {
          if (ev.id) {
            batch.set(doc(eventsRefCol, ev.id), ev);
            hasChanges = true;
          }
        });
      }

      // 2. Check Colors
      const localColors = colorsRef.current || {};
      const remoteColors = remoteColorsRef.current || {};

      // Simple equality check
      if (JSON.stringify(localColors) !== JSON.stringify(remoteColors)) {
        // If local has changed and server hasn't updated yet, push local
        // Note: This favors local changes.
        console.log("Auto-Sync: Updating colors...");
        const roomRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "rooms",
          roomId
        );
        batch.update(roomRef, { classColors: localColors });
        hasChanges = true;
      }

      if (hasChanges) {
        try {
          await batch.commit();
        } catch (e) {
          console.warn("Auto-Sync failed (will retry):", e);
        }
      }
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [roomId, user, isAuthorized]);

  // 3. Imperative Sync Actions
  const syncAction = useCallback(
    async (type, payload) => {
      if (!roomId || !user || !isAuthorized) return;

      const roomRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "rooms",
        roomId
      );
      const eventsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `rooms_${roomId}_events`
      );

      try {
        switch (type) {
          case "ADD":
          case "UPDATE":
            if (payload.id) {
              await setDoc(doc(eventsRef, payload.id), payload, {
                merge: true,
              });
            }
            break;
          case "DELETE":
            await deleteDoc(doc(eventsRef, payload));
            break;
          case "COLORS":
            await updateDoc(roomRef, { classColors: payload });
            break;
          case "BULK":
            if (Array.isArray(payload) && payload.length > 0) {
              const batch = writeBatch(db);
              payload.forEach((ev) => {
                if (ev.id) {
                  const docRef = doc(eventsRef, ev.id);
                  batch.set(docRef, ev);
                }
              });
              await batch.commit();
            }
            break;
        }
      } catch (e) {
        console.error("Sync Action Failed:", e);
      }
    },
    [roomId, user, isAuthorized]
  );

  return { isHost, peers, syncAction, syncError };
};
