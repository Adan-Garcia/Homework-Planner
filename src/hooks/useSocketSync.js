import { useEffect, useCallback, useState, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../utils/constants";
import { encryptEvent, decryptEvent } from "../utils/crypto";

export const useSocketSync = (
  roomId,
  authToken,
  cryptoKey,
  isAuthorized,
  setEvents,
  setClassColors,
  localEvents, // NEW: Current local state
  localClassColors, // NEW: Current local colors
) => {
  const [socket, setSocket] = useState(null);
  const isInitialLoadDone = useRef(false);

  // Refs to hold latest local state without triggering effect re-runs
  const localEventsRef = useRef(localEvents);
  const localColorsRef = useRef(localClassColors);

  useEffect(() => {
    localEventsRef.current = localEvents;
  }, [localEvents]);

  useEffect(() => {
    localColorsRef.current = localClassColors;
  }, [localClassColors]);

  // 1. Connect to Socket & Fetch Initial Data
  useEffect(() => {
    if (!roomId || !isAuthorized || !authToken || !cryptoKey) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.emit("join", roomId);

    const fetchInitialData = async () => {
      try {
        console.log(`[Sync] Fetching events for room: ${roomId}`);
        const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/events`, {
          headers: { Authorization: authToken },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(
            `[Sync] Failed to fetch events: ${res.status} ${errText}`,
          );
          return;
        }

        const data = await res.json();
        // Safety check: ensure events is an array
        const rawEvents = Array.isArray(data.events) ? data.events : [];
        let serverMeta = data.meta || {};

        // --- HANDLE EVENTS ---
        if (rawEvents.length > 0) {
          console.log(`[Sync] Found ${rawEvents.length} events on server.`);
          const decryptedEvents = await Promise.all(
            rawEvents.map((e) => decryptEvent(e, cryptoKey)),
          );
          setEvents(decryptedEvents);
        } else {
          // Server is empty. Check if we have local data to re-seed.
          const currentLocal = localEventsRef.current;
          if (currentLocal && currentLocal.length > 0) {
            console.log(
              `[Sync] Server empty. Re-seeding with ${currentLocal.length} local events.`,
            );
            // Encrypt all local events
            const encryptedEvents = await Promise.all(
              currentLocal.map((e) => encryptEvent(e, cryptoKey)),
            );
            // Send to server (don't update local state, it's already there)
            newSocket.emit("event:bulk_save", {
              roomId,
              events: encryptedEvents,
            });
          }
        }

        // --- HANDLE COLORS ---
        // Parse server colors if they exist
        let serverColors = null;
        if (serverMeta && serverMeta.classColors) {
          serverColors =
            typeof serverMeta.classColors === "string"
              ? JSON.parse(serverMeta.classColors)
              : serverMeta.classColors;
        }

        if (serverColors && Object.keys(serverColors).length > 0) {
          setClassColors(serverColors);
        } else {
          // Server has no colors. Check local.
          const currentColors = localColorsRef.current;
          if (currentColors && Object.keys(currentColors).length > 0) {
            console.log("[Sync] Server missing colors. Re-seeding.");
            newSocket.emit("meta:save", {
              roomId,
              meta: { classColors: currentColors },
            });
          }
        }

        isInitialLoadDone.current = true;
      } catch (e) {
        console.error("[Sync] Initial load error:", e);
      }
    };

    fetchInitialData();

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, isAuthorized, authToken, cryptoKey]);

  // 2. Listen for Real-time Updates
  useEffect(() => {
    if (!socket || !cryptoKey) return;

    const handleEventSync = async (encryptedEvent) => {
      const decrypted = await decryptEvent(encryptedEvent, cryptoKey);
      setEvents((prev) => {
        const exists = prev.find((e) => e.id === decrypted.id);
        if (exists) {
          return prev.map((e) => (e.id === decrypted.id ? decrypted : e));
        }
        return [...prev, decrypted];
      });
    };

    const handleBulkEventSync = async (encryptedEvents) => {
      const decryptedList = await Promise.all(
        encryptedEvents.map((e) => decryptEvent(e, cryptoKey)),
      );

      setEvents((prev) => {
        const newMap = new Map(prev.map((e) => [e.id, e]));
        decryptedList.forEach((e) => newMap.set(e.id, e));
        return Array.from(newMap.values());
      });
    };

    const handleEventRemove = (eventId) => {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const handleMetaSync = (meta) => {
      if (meta && meta.classColors) {
        setClassColors(meta.classColors);
      }
    };

    socket.on("event:sync", handleEventSync);
    socket.on("event:bulk_sync", handleBulkEventSync);
    socket.on("event:remove", handleEventRemove);
    socket.on("meta:sync", handleMetaSync);

    return () => {
      socket.off("event:sync", handleEventSync);
      socket.off("event:bulk_sync", handleBulkEventSync);
      socket.off("event:remove", handleEventRemove);
      socket.off("meta:sync", handleMetaSync);
    };
  }, [socket, cryptoKey, setEvents, setClassColors]);

  // 3. Actions
  const addEvent = useCallback(
    async (event) => {
      if (!socket || !cryptoKey) return;
      const encrypted = await encryptEvent(event, cryptoKey);
      socket.emit("event:save", { roomId, event: encrypted });
      setEvents((prev) => [...prev, event]);
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const bulkAddEvents = useCallback(
    async (events) => {
      if (!socket || !cryptoKey || events.length === 0) return;

      const encryptedEvents = await Promise.all(
        events.map((e) => encryptEvent(e, cryptoKey)),
      );

      socket.emit("event:bulk_save", { roomId, events: encryptedEvents });
      setEvents((prev) => [...prev, ...events]);
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const updateEvent = useCallback(
    async (event) => {
      if (!socket || !cryptoKey) return;
      const encrypted = await encryptEvent(event, cryptoKey);
      socket.emit("event:save", { roomId, event: encrypted });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const deleteEvent = useCallback(
    async (eventId) => {
      if (!socket) return;
      socket.emit("event:delete", { roomId, eventId });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    },
    [socket, roomId, setEvents],
  );

  const syncColors = useCallback(
    (colors) => {
      if (!socket) return;
      socket.emit("meta:save", { roomId, meta: { classColors: colors } });
    },
    [socket, roomId],
  );

  return { addEvent, updateEvent, deleteEvent, syncColors, bulkAddEvents };
};
