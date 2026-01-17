import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { STORAGE_KEYS } from "../utils/constants";
import {
  unfoldLines,
  parseICSDate,
  determineClass,
  determineType,
  generateICS,
} from "../utils/helpers";

// --- Firebase Imports ---
import { auth } from "../utils/firebase";
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";

// --- NEW HOOKS ---
import { useRoomAuth } from "../hooks/useRoomAuth";
import { useFirestoreSync } from "../hooks/useFirestoreSync";

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

  // 2. Auth & Room State
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [roomPassword, setRoomPassword] = useState("");

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

  // 4. Auth Init
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- 5. SINGLE-DOC SYNC INTEGRATION ---

  const { isAuthorized, isHost, authError, peers } = useRoomAuth(
    roomId,
    roomPassword,
    user,
  );

  const { syncAction, syncColors, destroyRoomData } = useFirestoreSync(
    roomId,
    roomPassword,
    isAuthorized,
    setEvents,
    setClassColors,
    events,
  );

  // 6. AUTO-SYNC LOGIC (Debounced)
  // This replaces the manual sync calls. Whenever 'events' changes, we schedule a sync.
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    if (roomId && isAuthorized) {
      // Clear previous pending sync
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      // Wait 2 seconds of inactivity, then send the FULL state
      syncTimeoutRef.current = setTimeout(() => {
        syncAction(events);
      }, 2000);
    }
    return () => clearTimeout(syncTimeoutRef.current);
  }, [events, roomId, isAuthorized, syncAction]);

  // 7. Event Dispatcher (Purely Local Updates)
  // We no longer call syncAction here directly. The useEffect above handles it.
  const dispatchCalEvent = useCallback((type, payload) => {
    setEvents((prev) => {
      if (type === "ADD") return [...prev, payload];
      if (type === "UPDATE")
        return prev.map((e) => (e.id === payload.id ? payload : e));
      if (type === "DELETE") return prev.filter((e) => e.id !== payload);
      if (type === "BULK") return payload;
      return prev;
    });
  }, []);

  // Wrapper for Color Updates
  const handleSetClassColors = useCallback(
    (newColors) => {
      setClassColors(newColors);
      // Sync colors immediately as they change rarely
      if (roomId && isAuthorized) {
        syncColors(newColors);
      }
    },
    [roomId, isAuthorized, syncColors],
  );

  // 8. ICS Processing
  const processICSContent = useCallback(
    (text) => {
      try {
        const unfolded = unfoldLines(text);
        const lines = unfolded.split(/\r\n|\n|\r/);
        const newEvents = [];
        let currentEvent = null;
        let inEvent = false;
        const foundClasses = new Set();

        for (const line of lines) {
          if (line.startsWith("BEGIN:VEVENT")) {
            inEvent = true;
            currentEvent = {};
          } else if (line.startsWith("END:VEVENT")) {
            if (currentEvent) {
              const type = determineType(
                currentEvent.title,
                currentEvent.description,
              );
              const className = determineClass(
                currentEvent.location,
                currentEvent.title,
              );
              currentEvent.type = type;
              currentEvent.class = className;
              if (className) foundClasses.add(className);
              if (!currentEvent.id)
                currentEvent.id =
                  Date.now().toString(36) +
                  Math.random().toString(36).substr(2, 5);
              newEvents.push(currentEvent);
            }
            inEvent = false;
            currentEvent = null;
          } else if (inEvent) {
            const [key, ...valueParts] = line.split(":");
            const value = valueParts.join(":");
            if (key.includes("DTSTART"))
              currentEvent.date = parseICSDate(value);
            if (key.includes("SUMMARY")) currentEvent.title = value;
            if (key.includes("LOCATION")) currentEvent.location = value;
            if (key.includes("DESCRIPTION")) currentEvent.description = value;
          }
        }

        // Color Logic
        let finalColors = { ...classColors };
        const defaultPalette = [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#6366f1",
          "#14b8a6",
        ];
        let colorIndex = Object.keys(finalColors).length;

        foundClasses.forEach((cls) => {
          if (!finalColors[cls]) {
            finalColors[cls] =
              defaultPalette[colorIndex % defaultPalette.length];
            colorIndex++;
          }
        });

        handleSetClassColors(finalColors);

        // Update Local State (Effect will handle sync)
        setEvents((prev) => [...prev, ...newEvents]);

        return { success: true, count: newEvents.length };
      } catch (e) {
        console.error("ICS Parse Error", e);
        return { success: false, error: e.message };
      }
    },
    [classColors, handleSetClassColors],
  );

  // 9. JSON Import
  const importJsonData = useCallback((jsonString, append = false) => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        setEvents((prev) => (append ? [...prev, ...data] : data));
        return { success: true };
      }
      return { success: false, error: "Invalid JSON format" };
    } catch (e) {
      console.error("JSON Import failed", e);
      return { success: false, error: e.message };
    }
  }, []);

  // 10. Actions
  const addEvent = (event) => dispatchCalEvent("ADD", event);
  const updateEvent = (event) => dispatchCalEvent("UPDATE", event);
  const deleteEvent = (id) => dispatchCalEvent("DELETE", id);

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
    const updatedEvents = events.map((e) =>
      e.class === source ? { ...e, class: target } : e,
    );
    setEvents(updatedEvents);
    const newColors = { ...classColors };
    delete newColors[source];
    handleSetClassColors(newColors);
  };

  const renameClass = (oldName, newName) => {
    if (!oldName || !newName || oldName === newName) return;

    const updatedEvents = events.map((e) =>
      e.class === oldName ? { ...e, class: newName } : e,
    );
    setEvents(updatedEvents);

    const next = { ...classColors };
    next[newName] = next[oldName];
    delete next[oldName];
    handleSetClassColors(next);
  };

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

  const disconnectRoom = async () => {
    if (roomId && isHost) {
      await destroyRoomData();
    }
    setRoomId(null);
    setRoomPassword("");
  };

  return (
    <EventContext.Provider
      value={{
        events,
        setEvents,
        dispatchCalEvent,
        classColors,
        setClassColors: handleSetClassColors,
        hiddenClasses,
        setHiddenClasses,
        processICSContent,
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
        user,
        roomId,
        setRoomId,
        roomPassword,
        setRoomPassword,
        syncError: authError,
        isHost,
        peers,
        disconnectRoom,
        destroyRoomData,
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
    if (savedEvents.length > 0) setView("planner");
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
