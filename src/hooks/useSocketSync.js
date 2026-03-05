import { useEffect, useCallback, useState, useRef } from "react";
import { io } from "socket.io-client";
import { getApiBaseUrl, SOCKET_EVENTS, SOCKET_TIMEOUT_MS, SOCKET_PATH } from "../utils/constants";
import { encryptEvent, decryptEvent } from "../utils/crypto";
import { normalizeEvent, validateEvent } from "../utils/helpers";
import { fieldLevelMerge, lastWriteWins } from "../utils/mergeUtils";
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
  const reconnectAttemptsRef = useRef(0);

  /**
   * Sync version map: tracks the server version for each event ID.
   * Used for optimistic concurrency control — sent with updates so the
   * server can detect conflicts.
   * Key: event ID, Value: version number (integer)
   */
  const versionMapRef = useRef(new Map());

  /**
   * Base event map: stores the last-known-good copy of each event (before local edits).
   * Used as the common ancestor for three-way field-level merge when conflicts occur.
   * Key: event ID, Value: plain-text event object
   */
  const baseEventsRef = useRef(new Map());

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

    // Reset for this connection cycle — prevents stale flag from a previous
    // effect run causing the "reconnect" branch to wipe local data.
    isInitialLoadDone.current = false;
    
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
        // Extract version before decryption (version is unencrypted metadata)
        const serverVersion = encryptedEvent.version;
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
        // Update version map and base event with the incoming server state
        if (typeof serverVersion === 'number') {
          versionMapRef.current.set(normalized.id, serverVersion);
        }
        baseEventsRef.current.set(normalized.id, { ...normalized });
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === normalized.id);
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
        // Extract versions before decryption
        const versions = encryptedEvents.map(e => ({ id: e.id, version: e.version }));
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
        // Update version map and base events
        for (const v of versions) {
          if (v.id && typeof v.version === 'number') {
            versionMapRef.current.set(v.id, v.version);
          }
        }
        for (const event of validEvents) {
          baseEventsRef.current.set(event.id, { ...event });
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
      versionMapRef.current.delete(eventId);
      baseEventsRef.current.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    };

    const handleBulkEventRemove = (eventIds) => {
      if (!Array.isArray(eventIds) || eventIds.length === 0) return;
      logger.log("[Sync] Received bulk remove", eventIds.length, "events");
      const idSet = new Set(eventIds);
      for (const id of eventIds) {
        versionMapRef.current.delete(id);
        baseEventsRef.current.delete(id);
      }
      setEvents((prev) => prev.filter((e) => !idSet.has(e.id)));
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
    newSocket.off(SOCKET_EVENTS.EVENT_BULK_REMOVE);
    newSocket.off(SOCKET_EVENTS.META_SYNC);
    newSocket.off(SOCKET_EVENTS.ROOM_COUNT);
    newSocket.off(SOCKET_EVENTS.CONNECT);
    newSocket.off(SOCKET_EVENTS.CONNECT_ERROR);
    newSocket.off(SOCKET_EVENTS.DISCONNECT);
    
    newSocket.on(SOCKET_EVENTS.EVENT_SYNC, handleEventSync);
    newSocket.on(SOCKET_EVENTS.EVENT_BULK_SYNC, handleBulkEventSync);
    newSocket.on(SOCKET_EVENTS.EVENT_REMOVE, handleEventRemove);
    newSocket.on(SOCKET_EVENTS.EVENT_BULK_REMOVE, handleBulkEventRemove);
    newSocket.on(SOCKET_EVENTS.META_SYNC, handleMetaSync);
    newSocket.on(SOCKET_EVENTS.ROOM_COUNT, handleRoomCount);
    newSocket.on(SOCKET_EVENTS.CONNECT, () => {
      logger.log("[Sync] Connected, joining room:", roomId);
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0; // Reset ref too
      newSocket.emit(SOCKET_EVENTS.JOIN, roomId);
    });
    newSocket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
      logger.error("[Sync] Connection error:", err);
      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);
      const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      logger.log(`[Sync] Will retry in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current})`);
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

        // Guard: if the effect was cleaned up while we awaited, bail out.
        if (abortController.signal.aborted) return;
        
        logger.log(`[Sync] Fetching events for room: ${roomId}`);
        const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomId}/events`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: abortController.signal,
        });

        // Guard: abort may have fired right after fetch completed.
        if (abortController.signal.aborted) return;

        if (!res.ok) {
            logger.error(`[Sync] Fetch failed: ${res.status}`);
          notifyRef.current.error("Failed to fetch sync data.");
            return;
        }

        const data = await res.json();
        const rawEvents = Array.isArray(data.events) ? data.events : [];
        let serverMeta = data.meta || {};

        if (rawEvents.length > 0) {
          // Build version map from server data (version is unencrypted)
          versionMapRef.current.clear();
          for (const rawEvent of rawEvents) {
            if (rawEvent.id && typeof rawEvent.version === 'number') {
              versionMapRef.current.set(rawEvent.id, rawEvent.version);
            }
          }
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
          // Populate base events for future three-way merges
          baseEventsRef.current.clear();
          for (const event of validEvents) {
            baseEventsRef.current.set(event.id, { ...event });
          }
          // Merge with local state to preserve any optimistic adds in flight
          setEvents((prev) => {
            const serverIds = new Set(validEvents.map(e => e.id));
            const localOnly = prev.filter(e => !serverIds.has(e.id));
            return [...validEvents, ...localOnly];
          });

          // Seed any local-only events that the server doesn't have yet
          // (handles partial-sync / first-device-with-existing-data scenarios)
          const serverIdSet = new Set(validEvents.map(e => e.id));
          const currentLocal = localEventsRef.current || [];
          const unseeded = currentLocal.filter(e => !serverIdSet.has(e.id));
          if (unseeded.length > 0 && !abortController.signal.aborted) {
            logger.log(`[Sync] Seeding ${unseeded.length} local-only events to server.`);
            try {
              const encUnseeded = await Promise.all(
                unseeded.map((e) => encryptEvent(e, cryptoKey)),
              );
              const seedRes = await emitAsync(
                SOCKET_EVENTS.EVENT_BULK_SAVE,
                { roomId, events: encUnseeded },
                newSocket,
              );
              if (seedRes && Array.isArray(seedRes.versions)) {
                for (const v of seedRes.versions) {
                  if (v.id && typeof v.version === 'number') {
                    versionMapRef.current.set(v.id, v.version);
                  }
                }
              }
              for (const event of unseeded) {
                baseEventsRef.current.set(event.id, { ...event });
              }
            } catch (seedErr) {
              logger.error("[Sync] Failed to seed local-only events:", seedErr);
            }
          }
        } else {
          // Server has 0 events — seed local data if this is a fresh connection.
          // isInitialLoadDone is reset at the top of each effect cycle, so this
          // correctly distinguishes "first fetch" from "socket.io internal reconnect".
          if (!isInitialLoadDone.current) {
            const currentLocal = localEventsRef.current;
            if (currentLocal && currentLocal.length > 0) {
              logger.log(`[Sync] First connection with empty server — seeding ${currentLocal.length} events.`);
              const encryptedEvents = await Promise.all(
                currentLocal.map((e) => encryptEvent(e, cryptoKey)),
              );
              if (abortController.signal.aborted) return;
              const seedResponse = await emitAsync(
                SOCKET_EVENTS.EVENT_BULK_SAVE,
                { roomId, events: encryptedEvents },
                newSocket,
              );
              // Track versions from the server so OCC works for subsequent edits
              if (seedResponse && Array.isArray(seedResponse.versions)) {
                for (const v of seedResponse.versions) {
                  if (v.id && typeof v.version === 'number') {
                    versionMapRef.current.set(v.id, v.version);
                  }
                }
              }
              for (const event of currentLocal) {
                baseEventsRef.current.set(event.id, { ...event });
              }
            } else {
              logger.log("[Sync] First connection — both server and local are empty.");
            }
          } else {
            // isInitialLoadDone was set within THIS cycle, meaning fetchInitialData
            // somehow ran twice (should not happen). Log and leave state untouched.
            logger.warn("[Sync] Server returned 0 events on repeat fetch — leaving local state intact.");
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
      newSocket.off(SOCKET_EVENTS.EVENT_BULK_REMOVE, handleBulkEventRemove);
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

  // --- CRUD Actions (with Optimistic Concurrency Control) ---

  const addEvent = useCallback(async (event) => {
      const normalized = normalizeEvent(event);
      if (!normalized) return;
      const validation = validateEvent(normalized);
      if (!validation.isValid) {
        notifyRef.current.error("Task is missing required fields.");
        return;
      }
      // Optimistic update
      setEvents((prev) => [...prev, normalized]);
      // Store as base event for future merges
      baseEventsRef.current.set(normalized.id, { ...normalized });
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(normalized, cryptoKey);
        // New events don't need version (no existing server state to conflict with)
        const response = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, { roomId, event: encrypted });
        // Track the version assigned by the server
        if (response && typeof response.version === 'number') {
          versionMapRef.current.set(normalized.id, response.version);
        }
      } catch (err) {
        logger.error("Sync failed:", err);
        // Keep the optimistic update — don't roll back new events on sync failure.
        // The event stays visible locally and will be re-synced on next connection.
        notifyRef.current.warning("Sync pending. Your task is saved locally.");
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
      // Store base events
      for (const event of validEvents) {
        baseEventsRef.current.set(event.id, { ...event });
      }
      if (!socket || !cryptoKey || validEvents.length === 0) return;
      try {
        const encryptedEvents = await Promise.all(
          validEvents.map((e) => encryptEvent(e, cryptoKey)),
        );
        const response = await emitAsync(SOCKET_EVENTS.EVENT_BULK_SAVE, { roomId, events: encryptedEvents });
        // Track versions from bulk save response
        if (response && Array.isArray(response.versions)) {
          for (const v of response.versions) {
            if (v.id && typeof v.version === 'number') {
              versionMapRef.current.set(v.id, v.version);
            }
          }
        }
      } catch (err) {
        logger.error("Bulk sync failed:", err);
        notifyRef.current.error("Bulk sync failed. Some items may be unsynced.");
      }
    }, [socket, cryptoKey, roomId, setEvents]);

  /**
   * Updates an event with Optimistic Concurrency Control.
   * 
   * Flow:
   * 1. Apply optimistic update locally
   * 2. Send update with current version to server
   * 3. If server confirms → update version tracker
   * 4. If conflict → attempt field-level merge using base event as common ancestor
   * 5. If merge fails (same fields changed) → last-write-wins force save
   */
  const updateEvent = useCallback(async (event) => {
      const normalized = normalizeEvent(event);
      if (!normalized) return;
      const validation = validateEvent(normalized);
      if (!validation.isValid) {
        notifyRef.current.error("Task is missing required fields.");
        return;
      }
      // Capture previous state for rollback
      let previousEvent = null;
      setEvents((prev) => {
        previousEvent = prev.find((e) => e.id === normalized.id);
        return prev.map((e) => (e.id === normalized.id ? normalized : e));
      });
      if (!socket || !cryptoKey) return;
      try {
        const encrypted = await encryptEvent(normalized, cryptoKey);
        const currentVersion = versionMapRef.current.get(normalized.id);
        const response = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, {
          roomId,
          event: encrypted,
          version: currentVersion, // Send version for OCC check
        });

        if (response && response.conflict) {
          // --- Conflict detected! Attempt field-level merge ---
          logger.warn("[Sync] Conflict detected for event:", normalized.id,
            "local version:", currentVersion, "server version:", response.serverVersion);

          try {
            // Decrypt the server's current version
            const serverDecrypted = await decryptEvent(response.serverEvent, cryptoKey);
            const serverNormalized = normalizeEvent(serverDecrypted);

            // Get the base (common ancestor) for three-way merge
            const baseEvent = baseEventsRef.current.get(normalized.id) || null;

            // Attempt field-level merge
            const mergeResult = fieldLevelMerge(baseEvent, normalized, serverNormalized);

            if (mergeResult.merged) {
              // Merge succeeded! Re-encrypt and save the merged version
              logger.log("[Sync] Field-level merge succeeded for event:", normalized.id);
              const mergedEncrypted = await encryptEvent(mergeResult.merged, cryptoKey);
              const retryResponse = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, {
                roomId,
                event: mergedEncrypted,
                version: response.serverVersion, // Use the server's current version
              });

              if (retryResponse && retryResponse.conflict) {
                // Another conflict during merge retry — force LWW
                logger.warn("[Sync] Conflict during merge retry — falling back to last-write-wins");
                const lwwEvent = lastWriteWins(mergeResult.merged, serverNormalized);
                const lwwEncrypted = await encryptEvent(lwwEvent, cryptoKey);
                const forceResponse = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, {
                  roomId,
                  event: lwwEncrypted,
                  force: true,
                });
                // Update local state and version
                setEvents((prev) => prev.map((e) => (e.id === lwwEvent.id ? lwwEvent : e)));
                baseEventsRef.current.set(lwwEvent.id, { ...lwwEvent });
                if (forceResponse && typeof forceResponse.version === 'number') {
                  versionMapRef.current.set(lwwEvent.id, forceResponse.version);
                }
              } else {
                // Merge retry succeeded
                setEvents((prev) => prev.map((e) => (e.id === mergeResult.merged.id ? mergeResult.merged : e)));
                baseEventsRef.current.set(mergeResult.merged.id, { ...mergeResult.merged });
                if (retryResponse && typeof retryResponse.version === 'number') {
                  versionMapRef.current.set(mergeResult.merged.id, retryResponse.version);
                }
              }
            } else {
              // Merge failed (conflicting fields) — use last-write-wins
              logger.warn("[Sync] Field merge failed (conflicts:", mergeResult.conflicts, ") — using last-write-wins");
              const lwwEvent = lastWriteWins(normalized, serverNormalized);
              const lwwEncrypted = await encryptEvent(lwwEvent, cryptoKey);
              const forceResponse = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, {
                roomId,
                event: lwwEncrypted,
                force: true, // Skip version check — force save
              });
              // Update state with our version
              setEvents((prev) => prev.map((e) => (e.id === lwwEvent.id ? lwwEvent : e)));
              baseEventsRef.current.set(lwwEvent.id, { ...lwwEvent });
              if (forceResponse && typeof forceResponse.version === 'number') {
                versionMapRef.current.set(lwwEvent.id, forceResponse.version);
              }
              notifyRef.current.warning("A sync conflict was resolved automatically.");
            }
          } catch (mergeErr) {
            // Merge process itself failed — force save local version as fallback
            logger.error("[Sync] Merge process failed:", mergeErr);
            try {
              const forceEncrypted = await encryptEvent(normalized, cryptoKey);
              const forceResponse = await emitAsync(SOCKET_EVENTS.EVENT_SAVE, {
                roomId,
                event: forceEncrypted,
                force: true,
              });
              if (forceResponse && typeof forceResponse.version === 'number') {
                versionMapRef.current.set(normalized.id, forceResponse.version);
              }
              baseEventsRef.current.set(normalized.id, { ...normalized });
            } catch (forceErr) {
              logger.error("[Sync] Force save also failed:", forceErr);
              notifyRef.current.error("Update failed. Your change was rolled back.");
              if (previousEvent) {
                setEvents((prev) => prev.map((e) => (e.id === normalized.id ? previousEvent : e)));
              }
            }
          }
        } else if (response && typeof response.version === 'number') {
          // Success — update version tracker and base event
          versionMapRef.current.set(normalized.id, response.version);
          baseEventsRef.current.set(normalized.id, { ...normalized });
        }
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
      // Clean up version and base tracking
      versionMapRef.current.delete(eventId);
      baseEventsRef.current.delete(eventId);
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
        // Stringify to pass server validation which rejects objects in meta values
        const payload = JSON.stringify(colors);
        await emitAsync(SOCKET_EVENTS.META_SAVE, { roomId, meta: { classColors: payload } });
      } catch (err) {
        logger.error("Color sync failed:", err);
        notifyRef.current.error("Color sync failed. Changes were rolled back.");
        setClassColors(previousColors);
      }
    }, [socket, roomId]);

  const clearAllEvents = useCallback(async (idsToDelete) => {
    const previousEvents = localEventsRef.current || [];
    
    // Determine target IDs: if idsToDelete is array, use it. Else use all.
    const targets = Array.isArray(idsToDelete) ? idsToDelete : previousEvents.map(e => e.id);
    
    if (targets.length === 0) return;

    // Optimistic update
    setEvents((prev) => prev.filter(e => !targets.includes(e.id)));
    // Clean up version and base tracking for deleted events
    for (const id of targets) {
      versionMapRef.current.delete(id);
      baseEventsRef.current.delete(id);
    }
    
    if (!socket) return;
    try {
      await emitAsync(SOCKET_EVENTS.EVENT_BULK_DELETE, { roomId, eventIds: targets });
    } catch (err) {
      logger.error("Clear/Bulk delete failed:", err);
      notifyRef.current.error("Failed to delete events. Changes were rolled back.");
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