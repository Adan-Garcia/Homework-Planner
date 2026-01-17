import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { STORAGE_KEYS, PALETTE } from "../utils/constants";
import {
  unfoldLines,
  parseICSDate,
  parseICSTime,
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
import { usePlannerSync } from "../hooks/usePlannerSync";

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
  const [events, setEvents] = useState(() =>
    loadState(STORAGE_KEYS.EVENTS, [])
  );
  const [classColors, setClassColors] = useState(() =>
    loadState(STORAGE_KEYS.COLORS, {})
  );
  const [hiddenClasses, setHiddenClasses] = useState(() =>
    loadState(STORAGE_KEYS.HIDDEN, [])
  );

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors));
  }, [classColors]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses));
  }, [hiddenClasses]);

  // --- ICS Processing ---
  const processICSContent = useCallback((text) => {
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
              currentEvent.description
            );
            const className = determineClass(
              currentEvent.location,
              currentEvent.title
            );

            currentEvent.type = type;
            currentEvent.class = className;
            currentEvent.color = PALETTE[type] || PALETTE.other;

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
          if (key.includes("DTSTART")) currentEvent.date = parseICSDate(value);
          if (key.includes("SUMMARY")) currentEvent.title = value;
          if (key.includes("LOCATION")) currentEvent.location = value;
          if (key.includes("DESCRIPTION")) currentEvent.description = value;
        }
      }

      setClassColors((prevColors) => {
        const updatedColors = { ...prevColors };
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
        let colorIndex = Object.keys(prevColors).length;

        foundClasses.forEach((cls) => {
          if (!updatedColors[cls]) {
            updatedColors[cls] =
              defaultPalette[colorIndex % defaultPalette.length];
            colorIndex++;
          }
        });
        return updatedColors;
      });

      setEvents((prev) => {
        return [...prev, ...newEvents];
      });

      return { success: true, count: newEvents.length };
    } catch (e) {
      console.error("ICS Parse Error", e);
      return { success: false, error: e.message };
    }
  }, []);

  const openTaskModal = () => {};

  // --- Collaboration State ---
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [roomPassword, setRoomPassword] = useState("");

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

  // 1. Pass setClassColors to the hook
  const { isHost, peers, syncAction, syncError } = usePlannerSync(
    roomId,
    user,
    setEvents,
    setClassColors,
    roomPassword
  );
  // 2. Broadcast Events AND Colors when becoming Host
  useEffect(() => {
    if (isHost) {
      if (events.length > 0) {
        console.log("📤 Host broadcasting events...");
        syncAction("BULK", events);
      }
      // Add this block:
      if (Object.keys(classColors).length > 0) {
        console.log("📤 Host broadcasting colors...");
        syncAction("COLORS", classColors);
      }
    }
  }, [isHost]);
  const dispatchCalEvent = (type, payload) => {
    setEvents((prev) => {
      if (type === "ADD") return [...prev, payload];
      if (type === "UPDATE")
        return prev.map((e) => (e.id === payload.id ? payload : e));
      if (type === "DELETE") return prev.filter((e) => e.id !== payload);
      if (type === "BULK") return payload;
      return prev;
    });
    syncAction(type, payload);
  };

  // --- Data Helper Wrappers ---
  const addEvent = (event) => dispatchCalEvent("ADD", event);
  const updateEvent = (event) => dispatchCalEvent("UPDATE", event);
  const deleteEvent = (id) => dispatchCalEvent("DELETE", id);

  const toggleTaskCompletion = (id) => {
    setEvents((prev) => {
      const task = prev.find((e) => e.id === id);
      if (task) {
        return prev;
      }
      return prev;
    });

    const task = events.find((e) => e.id === id);
    if (task) {
      updateEvent({ ...task, completed: !task.completed });
    }
  };

  const resetAllData = () => {
    dispatchCalEvent("BULK", []);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    setClassColors({});
    setHiddenClasses([]);
  };

  const importJsonData = (jsonString, append = false) => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        dispatchCalEvent("BULK", append ? [...events, ...data] : data);

        const uniqueClasses = new Set(data.map((e) => e.class).filter(Boolean));
        setClassColors((prev) => {
          const next = { ...prev };
          const palette = [
            "#3b82f6",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
          ];
          let idx = Object.keys(next).length;
          uniqueClasses.forEach((c) => {
            if (!next[c]) {
              next[c] = palette[idx % palette.length];
              idx++;
            }
          });
          return next;
        });

        return { success: true };
      }
      return {
        success: false,
        error: "Invalid JSON format: Expected an array",
      };
    } catch (e) {
      console.error("JSON Import failed", e);
      return { success: false, error: e.message };
    }
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

  const deleteClass = (className) => {
    const newColors = { ...classColors };
    delete newColors[className];
    setClassColors(newColors);
  };

  const mergeClasses = (source, target) => {
    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.class === source ? { ...e, class: target } : e
      );
      dispatchCalEvent("BULK", updated);
      return updated;
    });
    deleteClass(source);
  };

  const renameClass = (oldName, newName) => {
    if (!oldName || !newName || oldName === newName) return;

    if (classColors[newName]) {
      if (
        window.confirm(
          `Class "${newName}" already exists. Merge "${oldName}" into it?`
        )
      ) {
        mergeClasses(oldName, newName);
      }
      return;
    }

    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.class === oldName ? { ...e, class: newName } : e
      );
      dispatchCalEvent("BULK", updated);
      return updated;
    });

    setClassColors((prev) => {
      const next = { ...prev };
      next[newName] = next[oldName];
      delete next[oldName];
      return next;
    });
  };

  return (
    <EventContext.Provider
      value={{
        events,
        setEvents,
        dispatchCalEvent,
        classColors,
        setClassColors,
        hiddenClasses,
        setHiddenClasses,
        processICSContent,
        openTaskModal,
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
        roomPassword, // <--- EXPORT
        setRoomPassword, // <--- EXPORT
        syncError,
        isHost,
        peers,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const UIProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() =>
    loadState(STORAGE_KEYS.THEME, false)
  );
  const [calendarView, setCalendarView] = useState(() =>
    loadState(STORAGE_KEYS.CAL_MODE, "month")
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
