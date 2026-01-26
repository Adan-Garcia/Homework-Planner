import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { addDays, format, parseISO, isAfter } from "date-fns";
import { useAuth } from "./AuthContext.jsx";
import { useSocketSync } from "../hooks/useSocketSync.js";
import { STORAGE_KEYS, PALETTE } from "../utils/constants.js";
import { generateICS } from "../utils/helpers.js";
import { processICSContent, fetchRemoteICS } from "../utils/icsHelpers.js";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Helper to safely load JSON from localStorage
const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * DataContext Provider
 * * Acts as the "Brain" of the application. It manages:
 * 1. Local State (events, colors, settings)
 * 2. Persistence (localStorage)
 * 3. Synchronization (via useSocketSync)
 * 4. Business Logic (recurrence, merging classes, imports)
 */
export const DataProvider = ({ children }) => {
  const { roomId, authToken, cryptoKey, isAuthorized } = useAuth();

  // --- Local State Initialization ---
  const [events, setEvents] = useState(() =>
    loadState(STORAGE_KEYS.EVENTS, []),
  );
  const [classColors, setClassColors] = useState(() =>
    loadState(STORAGE_KEYS.COLORS, {}),
  );
  const [hiddenClasses, setHiddenClasses] = useState(() =>
    loadState(STORAGE_KEYS.HIDDEN, []),
  );

  // Ref to keep track of latest events state inside callbacks/effects without adding dependencies
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // --- Persistence Effects ---
  // Automatically save to localStorage whenever state changes
  useEffect(
    () => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)),
    [events],
  );
  useEffect(
    () =>
      localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors)),
    [classColors],
  );
  useEffect(
    () =>
      localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses)),
    [hiddenClasses],
  );

  // --- Synchronization Hook ---
  // This hook handles the encryption/decryption pipeline and socket events.
  const {
    addEvent: serverAdd,
    updateEvent: serverUpdate,
    deleteEvent: serverDelete,
    syncColors,
    bulkAddEvents: serverBulkAdd,
    clearAllEvents: serverClear,
    peerCount, 
  } = useSocketSync(
    roomId,
    authToken,
    cryptoKey,
    isAuthorized,
    setEvents,
    setClassColors,
    events,
    classColors,
  );

  // --- Business Logic ---

  /**
   * Bulk Add Events
   * Handles adding multiple events at once (e.g. from imports).
   * Uses server sync if authorized, otherwise updates local state.
   */
  const bulkAddEvents = useCallback(
    (newEvents) => {
      if (isAuthorized) serverBulkAdd(newEvents);
      else setEvents((prev) => [...prev, ...newEvents]);
    },
    [isAuthorized, serverBulkAdd],
  );

  /**
   * Add Event (with Recurrence Logic)
   * * If an event is marked as recurring:
   * 1. It calculates the interval (7 days for weekly).
   * 2. Generates individual event instances from start date to end date.
   * 3. Assigns a common `groupId` to all instances for future batch edits.
   */
  const addEvent = useCallback(
    (event) => {
      if (
        event.recurrence &&
        event.recurrence !== "none" &&
        event.recurrenceEnd
      ) {
        // --- Recurrence Expansion Logic ---
        const eventsToCreate = [];
        const groupId = crypto.randomUUID(); // Link all instances together
        const startDate = parseISO(event.date);
        const endDate = parseISO(event.recurrenceEnd);
        let current = startDate;

        const interval = event.recurrence === "weekly" ? 7 : 14;

        while (!isAfter(current, endDate)) {
          eventsToCreate.push({
            ...event,
            id: crypto.randomUUID(), // Unique ID per instance
            groupId, // Shared ID for the series
            date: format(current, "yyyy-MM-dd"),
          });
          current = addDays(current, interval);
        }

        bulkAddEvents(eventsToCreate);
      } else {
        // --- Single Event Logic ---
        const eventWithId = { ...event, id: event.id || crypto.randomUUID() };
        if (isAuthorized) serverAdd(eventWithId);
        else setEvents((prev) => [...prev, eventWithId]);
      }
    },
    [isAuthorized, serverAdd, bulkAddEvents],
  );

  /**
   * Update Event
   * Handles "Single" vs "Series" updates using the `editScope` property.
   */
  const updateEvent = useCallback(
    (event) => {
      if (event.editScope === "series" && event.groupId) {
        // Update all events with matching groupId
        const {
          title,
          description,
          time,
          type,
          priority,
          class: className,
        } = event;

        const siblings = eventsRef.current.filter(
          (e) => e.groupId === event.groupId,
        );

        if (isAuthorized) {
          siblings.forEach((sibling) => {
            serverUpdate({
              ...sibling,
              title,
              description,
              time,
              type,
              priority,
              class: className,
            });
          });
        } else {
          setEvents((prev) =>
            prev.map((e) => {
              if (e.groupId === event.groupId) {
                return {
                  ...e,
                  title,
                  description,
                  time,
                  type,
                  priority,
                  class: className,
                };
              }
              return e;
            }),
          );
        }
      } else {
        // Standard single event update
        if (isAuthorized) serverUpdate(event);
        else
          setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
      }
    },
    [isAuthorized, serverUpdate],
  );

  /**
   * Delete Event
   * Handles deleting a single event or an entire series.
   */
  const deleteEvent = useCallback(
    (id, deleteSeries = false, groupId = null) => {
      if (deleteSeries && groupId) {
        // Find all siblings to delete
        const eventsToDelete = eventsRef.current.filter(e => e.groupId === groupId);
        
        if (isAuthorized) {
           // Server: Send individual delete commands (or bulk delete if implemented)
           eventsToDelete.forEach(ev => serverDelete(ev.id));
        } else {
           // Local: Filter out the whole group
           setEvents((prev) => prev.filter((e) => e.groupId !== groupId));
        }
      } else {
        // Single delete
        if (isAuthorized) serverDelete(id);
        else setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    },
    [isAuthorized, serverDelete],
  );

  const handleSetClassColors = useCallback(
    (newColors) => {
      setClassColors(newColors);
      if (isAuthorized) syncColors(newColors);
    },
    [isAuthorized, syncColors],
  );

  // Optimistic toggle for task completion
  const toggleTaskCompletion = useCallback(
    (id) => {
      const task = eventsRef.current.find((e) => e.id === id);
      if (task) {
        if (isAuthorized) serverUpdate({ ...task, completed: !task.completed });
        else
          setEvents((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, completed: !e.completed } : e,
            ),
          );
      }
    },
    [isAuthorized, serverUpdate],
  );

  // --- Class Management Helpers ---
  
  const deleteClass = useCallback(
    (className) => {
      const newColors = { ...classColors };
      delete newColors[className];
      handleSetClassColors(newColors);
    },
    [classColors, handleSetClassColors],
  );

  const mergeClasses = useCallback(
    (source, target) => {
      // Find all tasks in source class and move them to target class
      const tasksToUpdate = events.filter((e) => e.class === source);
      tasksToUpdate.forEach((task) => {
        if (isAuthorized) serverUpdate({ ...task, class: target });
        else
          setEvents((prev) =>
            prev.map((e) => (e.id === task.id ? { ...e, class: target } : e)),
          );
      });
      // Remove the old color entry
      const newColors = { ...classColors };
      delete newColors[source];
      handleSetClassColors(newColors);
    },
    [events, classColors, handleSetClassColors, isAuthorized, serverUpdate],
  );

  const renameClass = useCallback(
    (oldName, newName) => {
      if (!oldName || !newName || oldName === newName) return;
      const tasksToUpdate = events.filter((e) => e.class === oldName);
      tasksToUpdate.forEach((task) => {
        if (isAuthorized) serverUpdate({ ...task, class: newName });
        else
          setEvents((prev) =>
            prev.map((e) => (e.id === task.id ? { ...e, class: newName } : e)),
          );
      });
      const next = { ...classColors };
      next[newName] = next[oldName];
      delete next[oldName];
      handleSetClassColors(next);
    },
    [events, classColors, handleSetClassColors, isAuthorized, serverUpdate],
  );

  // Assigns random colors to any classes that don't have one assigned yet
  const refreshClassColors = useCallback(() => {
    const uniqueClasses = new Set(
      events.map((e) => e.class).filter((c) => c && c !== "General"),
    );
    const newColors = { ...classColors };
    let hasChanges = false;
    let colorIndex = Object.keys(newColors).length;

    uniqueClasses.forEach((cls) => {
      if (!newColors[cls]) {
        newColors[cls] = PALETTE[colorIndex % PALETTE.length];
        colorIndex++;
        hasChanges = true;
      }
    });

    if (!newColors["General"]) {
      newColors["General"] = "#94a3b8";
      hasChanges = true;
    }

    if (hasChanges) {
      handleSetClassColors(newColors);
      return true;
    }
    return false;
  }, [events, classColors, handleSetClassColors]);

  /**
   * Import JSON Backup
   * Validates structure before replacing or appending data.
   */
  const importJsonData = useCallback(
    (jsonString, append = false) => {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
          if (!append) {
            if (isAuthorized) serverClear();
            else setEvents([]);
          }
          bulkAddEvents(data);
          return { success: true };
        }
        return { success: false, error: "Invalid JSON format" };
      } catch (e) {
        console.error("JSON Import failed", e);
        return { success: false, error: e.message };
      }
    },
    [bulkAddEvents, isAuthorized, serverClear],
  );

  const exportICS = useCallback(() => {
    const content = generateICS(events);
    const blob = new Blob([content], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planner.ics";
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const handleProcessICS = useCallback(
    (text) => {
      return processICSContent(
        text,
        classColors,
        handleSetClassColors,
        isAuthorized,
        bulkAddEvents,
        setEvents,
      );
    },
    [classColors, handleSetClassColors, isAuthorized, bulkAddEvents],
  );

  
  const importICSFromUrl = useCallback(async (url) => {
    try {
      const text = await fetchRemoteICS(url);
      if (text) {
        return processICSContent(
          text,
          classColors,
          handleSetClassColors,
          isAuthorized,
          bulkAddEvents,
          setEvents
        );
      }
      return { success: false, error: "No content received" };
    } catch (e) {
        return { success: false, error: e.message };
    }
  }, [classColors, handleSetClassColors, isAuthorized, bulkAddEvents]);

  const resetAllData = useCallback(() => {
    setEvents([]);
    setClassColors({});
    setHiddenClasses([]);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
  }, []);

  const value = useMemo(
    () => ({
      events,
      setEvents,
      classColors,
      setClassColors: handleSetClassColors,
      hiddenClasses,
      setHiddenClasses,
      addEvent,
      updateEvent,
      deleteEvent,
      bulkAddEvents,
      toggleTaskCompletion,
      deleteClass,
      mergeClasses,
      renameClass,
      refreshClassColors,
      importJsonData,
      exportICS,
      processICSContent: handleProcessICS,
      importICSFromUrl, 
      resetAllData,
      isAuthorized,
      peerCount, 
    }),
    [
      events,
      classColors,
      hiddenClasses,
      handleSetClassColors,
      addEvent,
      updateEvent,
      deleteEvent,
      bulkAddEvents,
      toggleTaskCompletion,
      deleteClass,
      mergeClasses,
      renameClass,
      refreshClassColors,
      importJsonData,
      exportICS,
      handleProcessICS,
      importICSFromUrl,
      resetAllData,
      isAuthorized,
      peerCount, 
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};