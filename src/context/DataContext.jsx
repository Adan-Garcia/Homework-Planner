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
    peerCount, // 1. Destructure peerCount from the hook
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

  const bulkAddEvents = useCallback(
    (newEvents) => {
      if (isAuthorized) serverBulkAdd(newEvents);
      else setEvents((prev) => [...prev, ...newEvents]);
    },
    [isAuthorized, serverBulkAdd],
  );

  const addEvent = useCallback(
    (event) => {
      if (
        event.recurrence &&
        event.recurrence !== "none" &&
        event.recurrenceEnd
      ) {
        const eventsToCreate = [];
        const groupId = crypto.randomUUID();
        const startDate = parseISO(event.date);
        const endDate = parseISO(event.recurrenceEnd);
        let current = startDate;

        const interval = event.recurrence === "weekly" ? 7 : 14;

        while (!isAfter(current, endDate)) {
          eventsToCreate.push({
            ...event,
            id: crypto.randomUUID(),
            groupId,
            date: format(current, "yyyy-MM-dd"),
          });
          current = addDays(current, interval);
        }

        bulkAddEvents(eventsToCreate);
      } else {
        const eventWithId = { ...event, id: event.id || crypto.randomUUID() };
        if (isAuthorized) serverAdd(eventWithId);
        else setEvents((prev) => [...prev, eventWithId]);
      }
    },
    [isAuthorized, serverAdd, bulkAddEvents],
  );

  const updateEvent = useCallback(
    (event) => {
      if (event.editScope === "series" && event.groupId) {
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
        if (isAuthorized) serverUpdate(event);
        else
          setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
      }
    },
    [isAuthorized, serverUpdate],
  );

  const deleteEvent = useCallback(
    (id, deleteSeries = false, groupId = null) => {
      if (deleteSeries && groupId) {
        // Find all events in the series
        const eventsToDelete = eventsRef.current.filter(e => e.groupId === groupId);
        
        if (isAuthorized) {
           // For authorized rooms, we delete each event individually 
           // since we don't have a direct "bulkDelete" exposed yet.
           eventsToDelete.forEach(ev => serverDelete(ev.id));
        } else {
           // Local delete: filter out everything in the group
           setEvents((prev) => prev.filter((e) => e.groupId !== groupId));
        }
      } else {
        // Standard single delete
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

  // New function to handle URL imports via backend proxy
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
      peerCount, // 2. Add peerCount to value object
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
      peerCount, // 3. Add peerCount to dependencies
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};