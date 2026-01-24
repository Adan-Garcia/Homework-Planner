import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { useSocketSync } from "../hooks/useSocketSync";
import { STORAGE_KEYS, PALETTE } from "../utils/constants"; // Imported PALETTE
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

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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

  const {
    addEvent: serverAdd,
    updateEvent: serverUpdate,
    deleteEvent: serverDelete,
    syncColors,
    bulkAddEvents: serverBulkAdd,
    clearAllEvents: serverClear,
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

  // ... (Existing addEvent, updateEvent, deleteEvent, bulkAddEvents wrappers remain unchanged)
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

  // ... (deleteClass, mergeClasses, renameClass remain unchanged)
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
      const tasksToUpdate = events.filter((e) => e.class === source);
      tasksToUpdate.forEach((task) => {
        if (isAuthorized) serverUpdate({ ...task, class: target });
        else
          setEvents((prev) =>
            prev.map((e) => (e.id === task.id ? { ...e, class: target } : e)),
          );
      });
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

  // --- NEW FUNCTION: Scans existing tasks for missing class colors ---
  const refreshClassColors = useCallback(() => {
    const uniqueClasses = new Set(events.map(e => e.class).filter(c => c && c !== "General"));
    const newColors = { ...classColors };
    let hasChanges = false;
    let colorIndex = Object.keys(newColors).length;
    
    uniqueClasses.forEach(cls => {
      if (!newColors[cls]) {
        newColors[cls] = PALETTE[colorIndex % PALETTE.length];
        colorIndex++;
        hasChanges = true;
      }
    });
    
    // Ensure "General" always has a color if used
    if (!newColors["General"]) {
       newColors["General"] = "#94a3b8"; // Slate-400
       hasChanges = true;
    }

    if (hasChanges) {
      handleSetClassColors(newColors);
      return true;
    }
    return false;
  }, [events, classColors, handleSetClassColors]);


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
          // Optional: You could auto-call refreshClassColors here, 
          // but we will stick to the manual button as requested.
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

  // ... (exportICS, handleProcessICS, resetAllData remain unchanged)
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
      refreshClassColors, // Exporting the new function
      importJsonData,
      exportICS,
      processICSContent: handleProcessICS,
      resetAllData,
      isAuthorized,
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
      refreshClassColors, // Exporting the new function
      importJsonData,
      exportICS,
      handleProcessICS,
      resetAllData,
      isAuthorized,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};