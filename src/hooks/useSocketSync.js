import { useEffect, useCallback, useState, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../utils/constants";
import { encryptEvent, decryptEvent } from "../utils/crypto";

/**
 * Custom Hook: Socket Sync
 * * Manages the real-time synchronization between the client and the backend server.
 * This hook is responsible for the transport layer security:
 * 1. Encrypting data before sending it to the server.
 * 2. Decrypting data received from the server.
 * 3. Handling optimistic updates by emitting events but also allowing local state updates.
 */
export const useSocketSync = (
  roomId,
  authToken,
  cryptoKey, // The AES-GCM key derived from the password
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
    // Only connect if we have full authorization credentials
    if (!roomId || !isAuthorized || !authToken || !cryptoKey) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setPeerCount(0);
      }
      return;
    }
    
    // 1. Establish connection
    const newSocket = io(API_BASE_URL, {
      path: "/backend/socket.io", 
    });
    setSocket(newSocket);

    // 2. Join the specific room
    newSocket.emit("join", roomId);

    // 3. Fetch Initial Data Strategy
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
          // A. Server has data: Decrypt and load it
          console.log(`[Sync] Found ${rawEvents.length} events on server.`);
          const decryptedEvents = await Promise.all(
            rawEvents.map((e) => decryptEvent(e, cryptoKey)),
          );
          setEvents(decryptedEvents);
        } else {
          // B. Server is empty: Re-seed from local storage
          // This happens if the server data expired (10 min TTL) but the user returns.
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

        // Handle Metadata (Class Colors) logic similar to events
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

  // --- Real-time Event Listeners ---
  useEffect(() => {
    if (!socket || !cryptoKey) return;

    // Incoming Event: Decrypt and update state
    const handleEventSync = async (encryptedEvent) => {
      try {
        const decrypted = await decryptEvent(encryptedEvent, cryptoKey);
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === decrypted.id);
          if (exists) {
            // Update existing
            return prev.map((e) => (e.id === decrypted.id ? decrypted : e));
          }
          // Add new
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
    
    
    const handleRoomCount = (count) => {
      setPeerCount(count);
    };

    // Attach listeners
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

  // --- CRUD Actions (Encrypt & Emit) ---

  const addEvent = useCallback(
    async (event) => {
      // 1. Optimistic Update (Immediate Feedback)
      setEvents((prev) => [...prev, event]);

      
      if (!socket || !cryptoKey) return;

      try {
        // 2. Encrypt
        const encrypted = await encryptEvent(event, cryptoKey);
        // 3. Emit
        await emitAsync("event:save", { roomId, event: encrypted });
      } catch (err) {
        console.error("Sync failed:", err);
        // Rollback on failure
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
      }
    },
    [socket, cryptoKey, roomId, setEvents],
  );

  const bulkAddEvents = useCallback(
    async (events) => {
      // Optimistic Update
      setEvents((prev) => [...prev, ...events]);
      
      
      if (!socket || !cryptoKey || events.length === 0) return;

      try {
        // Parallel Encryption
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
      // Optimistic Update
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
      // Optimistic Update
      let deletedEvent = null;
      setEvents((prev) => {
        deletedEvent = prev.find((e) => e.id === eventId);
        return prev.filter((e) => e.id !== eventId);
      });

      
      if (!socket) return;

      try {
        // ID is not encrypted for deletes to allow server to find the record
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
        // Meta data is usually not sensitive, so we send it plain text (or could encrypt if needed)
        // For this app, class colors are considered public room metadata
        await emitAsync("meta:save", { roomId, meta: { classColors: colors } });
      } catch (err) {
        console.error("Color sync failed:", err);
      }
    },
    [socket, roomId],
  );

  const clearAllEvents = useCallback(async () => {
    // Optimistic Update
    const eventsToDelete = localEventsRef.current || [];
    setEvents([]); 

    
    if (!socket) return;

    try {
      const eventIds = eventsToDelete.map((e) => e.id);
      await emitAsync("event:bulk_delete", { roomId, eventIds });
    } catch (err) {
      console.error("Clear all failed:", err);
      // Note: Rollback for clear all is complex, omitted for brevity
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