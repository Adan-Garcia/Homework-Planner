import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useSocketSync } from "../hooks/useSocketSync";
import { STORAGE_KEYS } from "../utils/constants";
import { generateICS } from "../utils/helpers";
import { processICSContent } from "../utils/icsHelpers";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const DataProvider = ({ children }) => {
  const { roomId, authToken, cryptoKey, isAuthorized } = useAuth();

  const [events, setEvents] = useState(() =>
    loadState(STORAGE_KEYS.EVENTS, []),
  );
  const [classColors, setClassColors] = useState(() =>
    loadState(STORAGE_KEYS.COLORS, {}),
  );
  const [hiddenClasses, setHiddenClasses] = useState(() =>
    loadState(STORAGE_KEYS.HIDDEN, []),
  );

  // Persistence
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

  // Hook up Socket Sync
  const {
    addEvent: serverAdd,
    updateEvent: serverUpdate,
    deleteEvent: serverDelete,
    syncColors,
    bulkAddEvents: serverBulkAdd,
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

  // --- CRUD WRAPPERS ---

  const addEvent = useCallback(
    (event) => {
      const eventWithId = { ...event, id: event.id || crypto.randomUUID() };
      if (isAuthorized) serverAdd(eventWithId);
      else setEvents((prev) => [...prev, eventWithId]);
    },
    [isAuthorized, serverAdd],
  );

  const updateEvent = useCallback(
    (event) => {
      if (isAuthorized) serverUpdate(event);
      else
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    },
    [isAuthorized, serverUpdate],
  );

  const deleteEvent = useCallback(
    (id) => {
      if (isAuthorized) serverDelete(id);
      else setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [isAuthorized, serverDelete],
  );

  const bulkAddEvents = useCallback(
    (newEvents) => {
      if (isAuthorized) serverBulkAdd(newEvents);
      else setEvents((prev) => [...prev, ...newEvents]);
    },
    [isAuthorized, serverBulkAdd],
  );

  const handleSetClassColors = useCallback(
    (newColors) => {
      setClassColors(newColors);
      if (isAuthorized) syncColors(newColors);
    },
    [isAuthorized, syncColors],
  );

  // --- HELPER ACTIONS ---

  const toggleTaskCompletion = (id) => {
    const task = events.find((e) => e.id === id);
    if (task) {
      updateEvent({ ...task, completed: !task.completed });
    }
  };

  const deleteClass = (className) => {
    const newColors = { ...classColors };
    delete newColors[className];
    handleSetClassColors(newColors);
  };

  const mergeClasses = (source, target) => {
    const tasksToUpdate = events.filter((e) => e.class === source);
    // Optimistic loop update
    tasksToUpdate.forEach((task) => {
      updateEvent({ ...task, class: target });
    });
    const newColors = { ...classColors };
    delete newColors[source];
    handleSetClassColors(newColors);
  };

  const renameClass = (oldName, newName) => {
    if (!oldName || !newName || oldName === newName) return;
    const tasksToUpdate = events.filter((e) => e.class === oldName);
    tasksToUpdate.forEach((task) => {
      updateEvent({ ...task, class: newName });
    });
    const next = { ...classColors };
    next[newName] = next[oldName];
    delete next[oldName];
    handleSetClassColors(next);
  };

  const importJsonData = useCallback(
    (jsonString, append = false) => {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
          if (!append && !isAuthorized) setEvents([]); // Reset if not appending and local
          // If authorized, serverBulkAdd handles the sync, but we might want to clear first if not append?
          // For safety, this logic keeps it simple:
          bulkAddEvents(data);
          return { success: true };
        }
        return { success: false, error: "Invalid JSON format" };
      } catch (e) {
        console.error("JSON Import failed", e);
        return { success: false, error: e.message };
      }
    },
    [bulkAddEvents, isAuthorized],
  );

  const exportICS = () => {
    const content = generateICS(events);
    const blob = new Blob([content], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planner.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const resetAllData = () => {
    setEvents([]);
    setClassColors({});
    setHiddenClasses([]);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
  };

  return (
    <DataContext.Provider
      value={{
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
        importJsonData,
        exportICS,
        processICSContent: handleProcessICS,
        resetAllData,
        isAuthorized, // Exposed for UI checks
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
