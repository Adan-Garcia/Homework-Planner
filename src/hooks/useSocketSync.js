import { useEffect, useCallback, useState, useRef } from "react";
import { io } from "socket.io-client";
import { getApiBaseUrl, SOCKET_EVENTS, SOCKET_TIMEOUT_MS, SOCKET_PATH } from "../utils/constants";
import { encryptEvent, decryptEvent } from "../utils/crypto";
import { normalizeEvent, validateEvent } from "../utils/helpers";
import { useNotification } from "../context/NotificationContext";
import logger from "../utils/logger";

/**
 * useSocketSync Hook
 * * Manages real-time synchronization of events across multiple clients using Socket.io.
 * * Handles encryption/decryption, conflict resolution, and initial data fetch.
 * 
 * Architecture Notes:
 * * Uses refs (localEventsRef, localColorsRef) instead of direct dependencies because:
 * 1. Socket callbacks capture state at listener setup time, not at callback invocation time.
 * 2. Adding events/colors to dependencies would cause socket to reconnect on every state change,
 *    creating a cascade of reconnections and lost messages.
 * 3. Refs allow callbacks to always access the latest state without triggering re-setup.
 * 4. useEffect dependencies only include credential-related values that warrant reconnection.
 */
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const isInitialLoadDone = useRef(false);
  const socketRef = useRef(null);
  const notify = useNotification();
  const notifyRef = useRef(notify);

  /**
   * Critical: Use refs instead of direct state dependencies for socket callbacks
   * * Why: Socket event listeners are registered once during connection setup.
   * * If we put events/colors in useEffect dependencies, the socket would reconnect
   *   on every state change, causing cascade failures and lost messages.
   * * Refs allow callbacks to always read the latest state without triggering reconnection.
   */
  const localEventsRef = useRef(localEvents);
  const localColorsRef = useRef(localClassColors);

  useEffect(() => {
    localEventsRef.current = localEvents;
  }, [localEvents]);

  useEffect(() => {
    localColorsRef.current = localClassColors;
  }, [localClassColors]);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Helper to wrap socket emissions in a Promise with timeout and connection check
  /**
   * Emits an event through socket with automatic timeout.
   * * Ensures the socket is connected before emitting.
   * * Rejects if no response is received within 5 seconds.
   * * @param {string} eventName - The event name to emit
   * @param {any} data - The data to send
   * @param {Socket} socketInstance - The socket instance (defaults to current socket)
   * @returns {Promise} - Resolves with server response or rejects on error/timeout
   */
  /**
   * Emits a socket event with timeout protection and connection validation.
   * * Prevents race conditions by checking connection state before and during emission.
   * * @param {string} eventName - The socket event name
   * * @param {any} data - The data payload to emit
   * * @param {Socket} socketInstance - The socket instance (defaults to current socket)
   * * @returns {Promise} Resolves with server response or rejects on error/timeout
   */
  const emitAsync = (eventName, data, socketInstance = socket, retryCount = 0) => {
    const MAX_RETRIES = 2;
    
    return new Promise((resolve, reject) => {
      if (!socketInstance?.connected) {
        return reject(new Error("Socket not connected. Cannot emit event: " + eventName));
      }

      let timeoutId = null;
      let responded = false;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        responded = true;
        cleanup();
        
        // Retry logic for transient failures
        if (retryCount < MAX_RETRIES) {
          logger.warn(`[Sync] Retrying ${eventName} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            emitAsync(eventName, data, socketInstance, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          reject(new Error(`Socket operation timeout: ${eventName} took longer than ${SOCKET_TIMEOUT_MS}ms`));
        }
      }, SOCKET_TIMEOUT_MS);

      // Double-check connection right before emit to minimize race condition window
      if (!socketInstance?.connected) {
        cleanup();
        return reject(new Error("Socket disconnected before emit: " + eventName));
      }

      socketInstance.emit(eventName, data, (response) => {
        if (responded) return; // Prevent callback after timeout
        
        // Critical: Check if socket disconnected during the round-trip
        if (!socketInstance?.connected) {
          responded = true;
          cleanup();
          return reject(new Error("Socket disconnected during operation: " + eventName));
        }
        
        responded = true;
        cleanup();
        
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
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (socket) {
        setSocket(null);
        setPeerCount(0);
      }
      return;
    }
    
    // 1. Establish connection with CREDENTIALS
    // We turn off autoConnect to ensure we can set auth headers before connecting
    const newSocket = io(getApiBaseUrl(), {
      path: SOCKET_PATH, 
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
        logger.log("[Sync] Received event update");
        const decrypted = await decryptEvent(encryptedEvent, cryptoKey);
        const normalized = normalizeEvent(decrypted);
        if (!normalized) {
          notifyRef.current.warning("Received invalid event payload (ignored).", 5000);
          return;
        }
        const validation = validateEvent(normalized);
        if (!validation.isValid) {
          notifyRef.current.warning("Received malformed event (ignored).", 5000);
          return;
        }
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === normalized.id);
          // If the timestamp/version is identical, ignore? (Optional optimization)
          if (exists) {
            return prev.map((e) => (e.id === normalized.id ? normalized : e));
          }
          return [...prev, normalized];
        });
      } catch (e) {
        logger.error("Failed to decrypt synced event", e);
        notifyRef.current.error("Sync failed while processing an event.");
      }
    };

    const handleBulkEventSync = async (encryptedEvents) => {
      try {
        logger.log("[Sync] Received bulk update", encryptedEvents.length);
        const decryptedList = await Promise.all(
          encryptedEvents.map((e) => decryptEvent(e, cryptoKey)),
        );
        const normalized = decryptedList
          .map((event) => normalizeEvent(event))
          .filter(Boolean);
        const validEvents = normalized.filter(
          (event) => validateEvent(event).isValid,
        );
        if (validEvents.length !== normalized.length) {
          notifyRef.current.warning("Some synced events were invalid and ignored.");
        }
        setEvents((prev) => {
          const newMap = new Map(prev.map((e) => [e.id, e]));
          validEvents.forEach((e) => newMap.set(e.id, e));
          return Array.from(newMap.values());
        });
      } catch (e) {
        logger.error("Failed to decrypt bulk sync", e);
        notifyRef.current.error("Sync failed while processing multiple events.");
      }
    };

    const handleEventRemove = (eventId) => {
      logger.log("[Sync] Received remove event", eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const handleMetaSync = (meta) => {
      if (!meta || !meta.classColors) return;
      try {
        const colors =
          typeof meta.classColors === "string"
            ? JSON.parse(meta.classColors)
            : meta.classColors;
        if (colors && typeof colors === "object") {
          setClassColors(colors);
        }
      } catch (e) {
        logger.error("Failed to parse class colors", e);
        notifyRef.current.warning("Received invalid class color data (ignored).");
      }
    };
    
    const handleRoomCount = (count) => {
      setPeerCount(count);
    };

    // Remove any existing listeners before adding new ones to prevent duplicates
    // Note: Using .off() without handler removes ALL listeners for that event
    // This is intentional here as we're setting up fresh listeners
    newSocket.off(SOCKET_EVENTS.EVENT_SYNC);
    newSocket.off(SOCKET_EVENTS.EVENT_BULK_SYNC);
    newSocket.off(SOCKET_EVENTS.EVENT_REMOVE);
    newSocket.off(SOCKET_EVENTS.META_SYNC);
    newSocket.off(SOCKET_EVENTS.ROOM_COUNT);
    newSocket.off(SOCKET_EVENTS.CONNECT);
    newSocket.off(SOCKET_EVENTS.CONNECT_ERROR);
    newSocket.off(SOCKET_EVENTS.DISCONNECT);
    
    newSocket.on(SOCKET_EVENTS.EVENT_SYNC, handleEventSync);
    newSocket.on(SOCKET_EVENTS.EVENT_BULK_SYNC, handleBulkEventSync);
    newSocket.on(SOCKET_EVENTS.EVENT_REMOVE, handleEventRemove);
    newSocket.on(SOCKET_EVENTS.META_SYNC, handleMetaSync);
    newSocket.on(SOCKET_EVENTS.ROOM_COUNT, handleRoomCount);
    newSocket.on(SOCKET_EVENTS.CONNECT, () => {
      logger.log("[Sync] Connected, joining room:", roomId);
      setReconnectAttempts(0); // Reset on successful connection
      newSocket.emit(SOCKET_EVENTS.JOIN, roomId);
    });
    newSocket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
      logger.error("[Sync] Connection error:", err);
      setReconnectAttempts(prev => prev + 1);
      const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      logger.log(`[Sync] Will retry in ${backoffDelay}ms (attempt ${reconnectAttempts + 1})`);
      notifyRef.current.error(`Sync connection error. Retrying in ${backoffDelay / 1000}s...`);
    });
    newSocket.on(SOCKET_EVENTS.DISCONNECT, () => {
      setPeerCount(0);
    });
    
    // Track connection readiness for initial data fetch
    const connectionReady = new Promise((resolve) => {
      if (newSocket.connected) {
        resolve();
      } else {
        const onConnect = () => {
          newSocket.off(SOCKET_EVENTS.CONNECT, onConnect);
          resolve();
        };
        newSocket.on(SOCKET_EVENTS.CONNECT, onConnect);
      }
    });
    
    // Connect now that listeners are ready
    newSocket.connect();
    setSocket(newSocket);
    socketRef.current = newSocket;

    // 4. Fetch Initial Data
    const abortController = new AbortController();
    const fetchInitialData = async () => {
      try {
        // Wait for socket connection before attempting any emits
        await connectionReady;
        
        logger.log(`[Sync] Fetching events for room: ${roomId}`);
        const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomId}/events`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: abortController.signal,
        });

        if (!res.ok) {
            logger.error(`[Sync] Fetch failed: ${res.status}`);
          notifyRef.current.error("Failed to fetch sync data.");
            return;
        }

        const data = await res.json();
        const rawEvents = Array.isArray(data.events) ? data.events : [];
        let serverMeta = data.meta || {};

        if (rawEvents.length > 0) {
          const decryptedEvents = await Promise.all(
            rawEvents.map((e) => decryptEvent(e, cryptoKey)),
          );
          const normalized = decryptedEvents
            .map((event) => normalizeEvent(event))
            .filter(Boolean);
          const validEvents = normalized.filter(
            (event) => validateEvent(event).isValid,
          );
          if (validEvents.length !== normalized.length) {
            notifyRef.current.warning("Some imported events were invalid and ignored.");
          }
          setEvents(validEvents);
        } else {
          // Re-seed logic
          const currentLocal = localEventsRef.current;
          if (currentLocal && currentLocal.length > 0) {
            logger.log(`[Sync] Re-seeding ${currentLocal.length} events.`);
            const encryptedEvents = await Promise.all(
              currentLocal.map((e) => encryptEvent(e, cryptoKey)),
            );
            await emitAsync(
              SOCKET_EVENTS.EVENT_BULK_SAVE,
              { roomId, events: encryptedEvents },
              newSocket,
            );
          }
        }

        // Color sync logic - always process meta regardless of events
        if (serverMeta && serverMeta.classColors) {
            const colors = typeof serverMeta.classColors === "string"
              ? JSON.parse(serverMeta.classColors)
              : serverMeta.classColors;
            if (colors && typeof colors === "object") {
              setClassColors(colors);
            }
        }

        isInitialLoadDone.current = true;
      } catch (e) {
        logger.error("[Sync] Initial load error:", e);
        notifyRef.current.error("Failed to load initial sync data.");
      }
    };

    fetchInitialData().catch((err) => {
      logger.error("[Sync] Initial load unhandled error:", err);
      notifyRef.current.error("Failed to load initial sync data.");
    });

    // Cleanup function - ensure all listeners are removed and socket is properly disconnected
    return () => {
      // Abort any pending fetch requests
      abortController.abort();
      
      // Remove all event listeners before disconnect to prevent memory leaks
      newSocket.off(SOCKET_EVENTS.EVENT_SYNC, handleEventSync);
      newSocket.off(SOCKET_EVENTS.EVENT_BULK_SYNC, handleBulkEventSync);
      newSocket.off(SOCKET_EVENTS.EVENT_REMOVE, handleEventRemove);
      newSocket.off(SOCKET_EVENTS.META_SYNC, handleMetaSync);
      newSocket.off(SOCKET_EVENTS.ROOM_COUNT, handleRoomCount);
      newSocket.off(SOCKET_EVENTS.CONNECT);
      newSocket.off(SOCKET_EVENTS.CONNECT_ERROR);
      newSocket.off(SOCKET_EVENTS.DISCONNECT);
      
      // Fully disconnect and clean up the socket
      newSocket.removeAllListeners();
      newSocket.disconnect();
      
      // Clear refs
      if (socketRef.current === newSocket) {
        socketRef.current = null;
        setSocket(null);
      }
      
      logger.log("[Sync] Socket cleanup completed");
    };
  }, [roomId, isAuthorized, authToken, cryptoKey]); // Re-run if auth changes

  // --- CRUD Actions ---

  const addEvent = useCallback(async (event) => {
      const normalized = normalizeEvent(event);
      if (!normalized) return;
      const validation = validateEvent(normalized);
      if (!validation.isValid) {
        notifyRef.current.error("Task is missing required fields.");
        return;
      }
      setEvents((prev) => [...prev, normalized]);
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(normalized, cryptoKey);
        // CRITICAL: Ensure we send 'roomId' as expected by server
        await emitAsync(SOCKET_EVENTS.EVENT_SAVE, { roomId, event: encrypted });
      } catch (err) {
        logger.error("Sync failed:", err);
        notifyRef.current.error("Sync failed. Your change was rolled back.");
        setEvents((prev) => prev.filter((e) => e.id !== normalized.id));
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  const bulkAddEvents = useCallback(async (events) => {
      const normalized = events
        .map((event) => normalizeEvent(event))
        .filter(Boolean);
      const validEvents = normalized.filter(
        (event) => validateEvent(event).isValid,
      );
      if (validEvents.length === 0) {
        notifyRef.current.warning("No valid events to import.");
        return;
      }
      setEvents((prev) => [...prev, ...validEvents]);
      if (!socket || !cryptoKey || validEvents.length === 0) return;
      try {
        const encryptedEvents = await Promise.all(
          validEvents.map((e) => encryptEvent(e, cryptoKey)),
        );
        await emitAsync(SOCKET_EVENTS.EVENT_BULK_SAVE, { roomId, events: encryptedEvents });
      } catch (err) {
        logger.error("Bulk sync failed:", err);
        notifyRef.current.error("Bulk sync failed. Some items may be unsynced.");
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  const updateEvent = useCallback(async (event) => {
      const normalized = normalizeEvent(event);
      if (!normalized) return;
      const validation = validateEvent(normalized);
      if (!validation.isValid) {
        notifyRef.current.error("Task is missing required fields.");
        return;
      }
      let previousEvent = null;
      setEvents((prev) => {
        previousEvent = prev.find((e) => e.id === normalized.id);
        return prev.map((e) => (e.id === normalized.id ? normalized : e));
      });
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(normalized, cryptoKey);
        await emitAsync(SOCKET_EVENTS.EVENT_SAVE, { roomId, event: encrypted });
      } catch (err) {
        logger.error("Update failed:", err);
        notifyRef.current.error("Update failed. Your change was rolled back.");
        if (previousEvent) {
          setEvents((prev) => prev.map((e) => (e.id === normalized.id ? previousEvent : e)));
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
        await emitAsync(SOCKET_EVENTS.EVENT_DELETE, { roomId, eventId });
      } catch (err) {
        logger.error("Delete failed:", err);
        notifyRef.current.error("Delete failed. Your change was rolled back.");
        if (deletedEvent) {
          setEvents((prev) => [...prev, deletedEvent]);
        }
      }
    }, [socket, roomId, setEvents]);

  const syncColors = useCallback(async (colors) => {
      if (!socket) return;
      const previousColors = localColorsRef.current;
      try {
        await emitAsync(SOCKET_EVENTS.META_SAVE, { roomId, meta: { classColors: colors } });
      } catch (err) {
        logger.error("Color sync failed:", err);
        notifyRef.current.error("Color sync failed. Changes were rolled back.");
        setClassColors(previousColors);
      }
    }, [socket, roomId]);

  const clearAllEvents = useCallback(async () => {
    const previousEvents = localEventsRef.current || [];
    setEvents([]); 
    if (!socket) return;
    try {
      const eventIds = previousEvents.map((e) => e.id);
      await emitAsync(SOCKET_EVENTS.EVENT_BULK_DELETE, { roomId, eventIds });
    } catch (err) {
      logger.error("Clear all failed:", err);
      notifyRef.current.error("Failed to clear all events. Changes were rolled back.");
      setEvents(previousEvents);
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