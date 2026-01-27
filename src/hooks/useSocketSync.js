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
  const [peerCount, setPeerCount] = useState(0); 
  const isInitialLoadDone = useRef(false);

  // Refs to access latest local state during socket callbacks
  const localEventsRef = useRef(localEvents);
  const localColorsRef = useRef(localClassColors);

  useEffect(() => {
    localEventsRef.current = localEvents;
  }, [localEvents]);

  useEffect(() => {
    localColorsRef.current = localClassColors;
  }, [localClassColors]);

  // Helper to wrap socket emissions in a Promise
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

  // --- Connection & Initial Data Fetch ---
  useEffect(() => {
    if (!roomId || !isAuthorized || !authToken || !cryptoKey) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setPeerCount(0);
      }
      return;
    }
    
    // 1. Establish connection with CREDENTIALS
    // We turn off autoConnect to ensure we can set auth headers before connecting
    const newSocket = io(API_BASE_URL, {
      path: "/backend/socket.io", 
      autoConnect: false, // Wait for explicit connect
      auth: {
        token: authToken,
        roomId: roomId
      },
      query: {
        roomId: roomId
      }
    });

    // 2. Setup listeners BEFORE connecting to catch early events
    
    // Incoming Event: Decrypt and update state
    const handleEventSync = async (encryptedEvent) => {
      try {
        console.log("[Sync] Received event update");
        const decrypted = await decryptEvent(encryptedEvent, cryptoKey);
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === decrypted.id);
          // If the timestamp/version is identical, ignore? (Optional optimization)
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
        console.log("[Sync] Received bulk update", encryptedEvents.length);
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
      console.log("[Sync] Received remove event", eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const handleMetaSync = (meta) => {
      if (meta && meta.classColors) {
        setClassColors(meta.classColors);
      }
    };
    
    const handleRoomCount = (count) => {
      setPeerCount(count);
    };

    newSocket.on("event:sync", handleEventSync);
    newSocket.on("event:bulk_sync", handleBulkEventSync);
    newSocket.on("event:remove", handleEventRemove);
    newSocket.on("meta:sync", handleMetaSync);
    newSocket.on("room:count", handleRoomCount);
    
    // Connect now that listeners are ready
    newSocket.connect();
    setSocket(newSocket);

    // 3. Explicitly Join Room
    newSocket.emit("join", roomId);

    // 4. Fetch Initial Data
    const fetchInitialData = async () => {
      try {
        console.log(`[Sync] Fetching events for room: ${roomId}`);
        const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/events`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) {
            console.error(`[Sync] Fetch failed: ${res.status}`);
            return;
        }

        const data = await res.json();
        const rawEvents = Array.isArray(data.events) ? data.events : [];
        let serverMeta = data.meta || {};

        if (rawEvents.length > 0) {
          const decryptedEvents = await Promise.all(
            rawEvents.map((e) => decryptEvent(e, cryptoKey)),
          );
          setEvents(decryptedEvents);
        } else {
          // Re-seed logic
          const currentLocal = localEventsRef.current;
          if (currentLocal && currentLocal.length > 0) {
            console.log(`[Sync] Re-seeding ${currentLocal.length} events.`);
            const encryptedEvents = await Promise.all(
              currentLocal.map((e) => encryptEvent(e, cryptoKey)),
            );
            newSocket.emit("event:bulk_save", {
              roomId,
              events: encryptedEvents,
            });
          }
        }

        // Color sync logic...
        if (serverMeta.classColors) {
            const colors = typeof serverMeta.classColors === 'string' 
                ? JSON.parse(serverMeta.classColors) 
                : serverMeta.classColors;
            setClassColors(colors);
        }

        isInitialLoadDone.current = true;
      } catch (e) {
        console.error("[Sync] Initial load error:", e);
      }
    };

    fetchInitialData();

    return () => {
      newSocket.off("event:sync", handleEventSync);
      newSocket.off("event:bulk_sync", handleBulkEventSync);
      newSocket.off("event:remove", handleEventRemove);
      newSocket.off("meta:sync", handleMetaSync);
      newSocket.off("room:count", handleRoomCount);
      newSocket.disconnect();
    };
  }, [roomId, isAuthorized, authToken, cryptoKey]); // Re-run if auth changes

  // --- CRUD Actions ---

  const addEvent = useCallback(async (event) => {
      setEvents((prev) => [...prev, event]);
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(event, cryptoKey);
        // CRITICAL: Ensure we send 'roomId' as expected by server
        await emitAsync("event:save", { roomId, event: encrypted });
      } catch (err) {
        console.error("Sync failed:", err);
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  const bulkAddEvents = useCallback(async (events) => {
      setEvents((prev) => [...prev, ...events]);
      if (!socket || !cryptoKey || events.length === 0) return;
      try {
        const encryptedEvents = await Promise.all(
          events.map((e) => encryptEvent(e, cryptoKey)),
        );
        await emitAsync("event:bulk_save", { roomId, events: encryptedEvents });
      } catch (err) {
        console.error("Bulk sync failed:", err);
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  const updateEvent = useCallback(async (event) => {
      let previousEvent = null;
      setEvents((prev) => {
        previousEvent = prev.find((e) => e.id === event.id);
        return prev.map((e) => (e.id === event.id ? event : e));
      });
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(event, cryptoKey);
        await emitAsync("event:save", { roomId, event: encrypted });
      } catch (err) {
        console.error("Update failed:", err);
        if (previousEvent) {
          setEvents((prev) => prev.map((e) => (e.id === event.id ? previousEvent : e)));
        }
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  const deleteEvent = useCallback(async (eventId) => {
      let deletedEvent = null;
      setEvents((prev) => {
        deletedEvent = prev.find((e) => e.id === eventId);
        return prev.filter((e) => e.id !== eventId);
      });
      if (!socket) return;
      try {
        await emitAsync("event:delete", { roomId, eventId });
      } catch (err) {
        console.error("Delete failed:", err);
        if (deletedEvent) {
          setEvents((prev) => [...prev, deletedEvent]);
        }
      }
    }, [socket, roomId, setEvents]);

  const syncColors = useCallback(async (colors) => {
      if (!socket) return;
      try {
        await emitAsync("meta:save", { roomId, meta: { classColors: colors } });
      } catch (err) {
        console.error("Color sync failed:", err);
      }
    }, [socket, roomId]);

  const clearAllEvents = useCallback(async () => {
    const eventsToDelete = localEventsRef.current || [];
    setEvents([]); 
    if (!socket) return;
    try {
      const eventIds = eventsToDelete.map((e) => e.id);
      await emitAsync("event:bulk_delete", { roomId, eventIds });
    } catch (err) {
      console.error("Clear all failed:", err);
    }
  }, [socket, roomId, setEvents]);

  return {
    addEvent,
    updateEvent,
    deleteEvent,
    syncColors,
    bulkAddEvents,
    clearAllEvents,
    peerCount, 
  };
};