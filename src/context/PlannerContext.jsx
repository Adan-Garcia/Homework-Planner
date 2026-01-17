import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { STORAGE_KEYS } from "../utils/constants.js";
import { generateICS } from "../utils/helpers.js";
import { processICSContent } from "../utils/icsHelpers.js";

// --- HOOKS ---
import { useRoomAuth } from "../hooks/useRoomAuth.js";
import { useSocketSync } from "../hooks/useSocketSync.js";

// --- Context Definitions ---
const EventContext = createContext();
const UIContext = createContext();

// --- Hooks ---
export const useEvents = () => useContext(EventContext);
export const useUI = () => useContext(UIContext);

// --- Helper ---
const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key}`, e);
    return fallback;
  }
};

export const EventProvider = ({ children }) => {
  // 1. Local State
  const [events, setEvents] = useState(() =>
    loadState(STORAGE_KEYS.EVENTS, []),
  );
  const [classColors, setClassColors] = useState(() =>
    loadState(STORAGE_KEYS.COLORS, {}),
  );
  const [hiddenClasses, setHiddenClasses] = useState(() =>
    loadState(STORAGE_KEYS.HIDDEN, []),
  );

  // 2. Room State
  const [roomId, setRoomId] = useState(() =>
    loadState("planner_curr_room_id", null),
  );
  const [roomPassword, setRoomPassword] = useState(() =>
    loadState("planner_curr_room_pass", ""),
  );

  // 3. Persistence (Local Storage)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors));
  }, [classColors]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses));
  }, [hiddenClasses]);

  // Persist Room Credentials for Reconnection
  useEffect(() => {
    if (roomId) {
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));
    } else {
      localStorage.removeItem("planner_curr_room_id");
    }
  }, [roomId]);

  useEffect(() => {
    if (roomPassword) {
      localStorage.setItem(
        "planner_curr_room_pass",
        JSON.stringify(roomPassword),
      );
    } else {
      localStorage.removeItem("planner_curr_room_pass");
    }
  }, [roomPassword]);

  // --- 4. SERVER AUTH ---
  const { isAuthorized, authToken, cryptoKey, authError, isNewRoom } =
    useRoomAuth(roomId, roomPassword);

  // --- 5. SERVER SYNC ---
  const {
    addEvent: serverAdd,
    updateEvent: serverUpdate,
    deleteEvent: serverDelete,
    syncColors,
    bulkAddEvents,
  } = useSocketSync(
    roomId,
    authToken,
    cryptoKey,
    isAuthorized,
    setEvents,
    setClassColors,
    events, // Pass current local events for re-seeding
    classColors, // Pass current local colors for re-seeding
  );

  // --- 6. EVENT DISPATCHER ---
  const addEvent = useCallback(
    (event) => {
      if (isAuthorized) {
        serverAdd(event);
      } else {
        setEvents((prev) => [...prev, event]);
      }
    },
    [isAuthorized, serverAdd],
  );

  const updateEvent = useCallback(
    (event) => {
      if (isAuthorized) {
        serverUpdate(event);
      } else {
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
      }
    },
    [isAuthorized, serverUpdate],
  );

  const deleteEvent = useCallback(
    (id) => {
      if (isAuthorized) {
        serverDelete(id);
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    },
    [isAuthorized, serverDelete],
  );

  const handleSetClassColors = useCallback(
    (newColors) => {
      setClassColors(newColors);
      if (isAuthorized) {
        syncColors(newColors);
      }
    },
    [isAuthorized, syncColors],
  );

  // --- 7. HELPER ACTIONS ---

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

  // 8. ICS Processing (Delegated)
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

  // 9. JSON Import
  const importJsonData = useCallback(
    (jsonString, append = false) => {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
          if (isAuthorized) {
            if (!append) setEvents([]);
            bulkAddEvents(data);
          } else {
            if (!append) {
              setEvents(data);
            } else {
              setEvents((prev) => [...prev, ...data]);
            }
          }
          return { success: true };
        }
        return { success: false, error: "Invalid JSON format" };
      } catch (e) {
        console.error("JSON Import failed", e);
        return { success: false, error: e.message };
      }
    },
    [isAuthorized, bulkAddEvents],
  );

  const resetAllData = () => {
    setEvents([]);
    setClassColors({});
    setHiddenClasses([]);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
  };

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

  const disconnectRoom = () => {
    setRoomId(null);
    setRoomPassword("");
    setEvents([]);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        setEvents,
        classColors,
        setClassColors: handleSetClassColors,
        hiddenClasses,
        setHiddenClasses,
        processICSContent: handleProcessICS,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleTaskCompletion,
        importJsonData,
        exportICS,
        resetAllData,
        deleteClass,
        mergeClasses,
        renameClass,
        roomId,
        setRoomId,
        roomPassword,
        setRoomPassword,
        syncError: authError,
        isAuthorized,
        disconnectRoom,
        isNewRoom,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const UIProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() =>
    loadState(STORAGE_KEYS.THEME, false),
  );
  const [calendarView, setCalendarView] = useState(() =>
    loadState(STORAGE_KEYS.CAL_MODE, "month"),
  );
  const [view, setView] = useState("setup");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(true);
  const [hideOverdue, setHideOverdue] = useState(false);
  const [modals, setModals] = useState({
    settings: false,
    task: false,
    jsonEdit: false,
  });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    const savedEvents = loadState(STORAGE_KEYS.EVENTS, []);
    const savedRoom = loadState("planner_curr_room_id", null);
    if (savedEvents.length > 0 || savedRoom) setView("planner");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAL_MODE, JSON.stringify(calendarView));
  }, [calendarView]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const openModal = (name) => setModals((prev) => ({ ...prev, [name]: true }));
  const closeModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: false }));

  const openTaskModal = (task = null) => {
    setEditingTask(task);
    openModal("task");
  };

  return (
    <UIContext.Provider
      value={{
        darkMode,
        setDarkMode,
        calendarView,
        setCalendarView,
        view,
        setView,
        currentDate,
        setCurrentDate,
        searchQuery,
        setSearchQuery,
        activeTypeFilter,
        setActiveTypeFilter,
        showCompleted,
        setShowCompleted,
        hideOverdue,
        setHideOverdue,
        modals,
        openModal,
        closeModal,
        editingTask,
        setEditingTask,
        openTaskModal,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
