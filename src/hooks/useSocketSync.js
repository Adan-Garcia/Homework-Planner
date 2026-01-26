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
  localEvents,
  localClassColors,
) => {
  const [socket, setSocket] = useState(null);
  const [peerCount, setPeerCount] = useState(0); // New state for peers
  const isInitialLoadDone = useRef(false);

  const localEventsRef = useRef(localEvents);
  const localColorsRef = useRef(localClassColors);

  useEffect(() => {
    localEventsRef.current = localEvents;
  }, [localEvents]);

  useEffect(() => {
    localColorsRef.current = localClassColors;
  }, [localClassColors]);

  const emitAsync = (eventName, data, socketInstance = socket) => {
    return new Promise((resolve, reject) => {
      if (!socketInstance) return reject(new Error("No socket connection"));

      socketInstance.emit(eventName, data, (response) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  };

  useEffect(() => {
    if (!roomId || !isAuthorized || !authToken || !cryptoKey) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setPeerCount(0);
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
        const rawEvents = Array.isArray(data.events) ? data.events : [];
        let serverMeta = data.meta || {};

        if (rawEvents.length > 0) {
          console.log(`[Sync] Found ${rawEvents.length} events on server.`);
          const decryptedEvents = await Promise.all(
            rawEvents.map((e) => decryptEvent(e, cryptoKey)),
          );
          setEvents(decryptedEvents);
        } else {
          const currentLocal = localEventsRef.current;
          if (currentLocal && currentLocal.length > 0) {
            console.log(
              `[Sync] Server empty. Re-seeding with ${currentLocal.length} local events.`,
            );
            const encryptedEvents = await Promise.all(
              currentLocal.map((e) => encryptEvent(e, cryptoKey)),
            );
            
            newSocket.emit("event:bulk_save", {
              roomId,
              events: encryptedEvents,
            });
          }
        }

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

  useEffect(() => {
    if (!socket || !cryptoKey) return;

    const handleEventSync = async (encryptedEvent) => {
      try {
        const decrypted = await decryptEvent(encryptedEvent, cryptoKey);
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === decrypted.id);
          if (exists) {
            return prev.map((e) => (e.id === decrypted.id ? decrypted : e));
          }
          return [...prev, decrypted];
        });
      } catch (e) {
        console.error("Failed to decrypt synced event", e);
      }
    };

    const handleBulkEventSync = async (encryptedEvents) => {
      try {
        const decryptedList = await Promise.all(
          encryptedEvents.map((e) => decryptEvent(e, cryptoKey)),
        );
        setEvents((prev) => {
          const newMap = new Map(prev.map((e) => [e.id, e]));
          decryptedList.forEach((e) => newMap.set(e.id, e));
          return Array.from(newMap.values());
        });
      } catch (e) {
        console.error("Failed to decrypt bulk sync", e);
      }
    };

    const handleEventRemove = (eventId) => {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const handleMetaSync = (meta) => {
      if (meta && meta.classColors) {
        setClassColors(meta.classColors);
      }
    };
    
    // Peer count listener
    const handleRoomCount = (count) => {
      setPeerCount(count);
    };

    socket.on("event:sync", handleEventSync);
    socket.on("event:bulk_sync", handleBulkEventSync);
    socket.on("event:remove", handleEventRemove);
    socket.on("meta:sync", handleMetaSync);
    socket.on("room:count", handleRoomCount);

    return () => {
      socket.off("event:sync", handleEventSync);
      socket.off("event:bulk_sync", handleBulkEventSync);
      socket.off("event:remove", handleEventRemove);
      socket.off("meta:sync", handleMetaSync);
      socket.off("room:count", handleRoomCount);
    };
  }, [socket, cryptoKey, setEvents, setClassColors]);

  const addEvent = useCallback(
    async (event) => {
      // 1. Optimistic Update (Always run this first)
      setEvents((prev) => [...prev, event]);

      // 2. Network Check
      if (!socket || !cryptoKey) return;

      try {
        const encrypted = await encryptEvent(event, cryptoKey);
        await emitAsync("event:save", { roomId, event: encrypted });
      } catch (err) {
        console.error("Sync failed:", err);
        // Rollback on error
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
      }
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const bulkAddEvents = useCallback(
    async (events) => {
      // 1. Optimistic Update
      setEvents((prev) => [...prev, ...events]);
      
      // 2. Network Check
      if (!socket || !cryptoKey || events.length === 0) return;

      try {
        const encryptedEvents = await Promise.all(
          events.map((e) => encryptEvent(e, cryptoKey)),
        );
        await emitAsync("event:bulk_save", { roomId, events: encryptedEvents });
      } catch (err) {
        console.error("Bulk sync failed:", err);
        // Rollback
        const newIds = new Set(events.map((e) => e.id));
        setEvents((prev) => prev.filter((e) => !newIds.has(e.id)));
      }
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const updateEvent = useCallback(
    async (event) => {
      // 1. Optimistic Update
      let previousEvent = null;
      setEvents((prev) => {
        previousEvent = prev.find((e) => e.id === event.id);
        return prev.map((e) => (e.id === event.id ? event : e));
      });

      // 2. Network Check
      if (!socket || !cryptoKey) return;

      try {
        const encrypted = await encryptEvent(event, cryptoKey);
        await emitAsync("event:save", { roomId, event: encrypted });
      } catch (err) {
        console.error("Update failed:", err);
        // Rollback
        if (previousEvent) {
          setEvents((prev) =>
            prev.map((e) => (e.id === event.id ? previousEvent : e)),
          );
        }
      }
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const deleteEvent = useCallback(
    async (eventId) => {
      // 1. Optimistic Update
      let deletedEvent = null;
      setEvents((prev) => {
        deletedEvent = prev.find((e) => e.id === eventId);
        return prev.filter((e) => e.id !== eventId);
      });

      // 2. Network Check
      if (!socket) return;

      try {
        await emitAsync("event:delete", { roomId, eventId });
      } catch (err) {
        console.error("Delete failed:", err);
        // Rollback
        if (deletedEvent) {
          setEvents((prev) => [...prev, deletedEvent]);
        }
      }
    },
    [socket, roomId, setEvents],
  );

  const syncColors = useCallback(
    async (colors) => {
      if (!socket) return;
      try {
        await emitAsync("meta:save", { roomId, meta: { classColors: colors } });
      } catch (err) {
        console.error("Color sync failed:", err);
      }
    },
    [socket, roomId],
  );

  const clearAllEvents = useCallback(async () => {
    // 1. Optimistic Update
    const eventsToDelete = localEventsRef.current || [];
    setEvents([]); 

    // 2. Network Check
    if (!socket) return;

    try {
      const eventIds = eventsToDelete.map((e) => e.id);
      await emitAsync("event:bulk_delete", { roomId, eventIds });
    } catch (err) {
      console.error("Clear all failed:", err);
      // Ideally rollback here, but clearing is destructive/rare
    }
  }, [socket, roomId, setEvents]);

  return {
    addEvent,
    updateEvent,
    deleteEvent,
    syncColors,
    bulkAddEvents,
    clearAllEvents,
    peerCount, // Export this!
  };
};