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
import { auth } from '../utils/firebase';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { usePlannerSync } from '../hooks/usePlannerSync';

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
  const [events, setEvents] = useState(() => loadState(STORAGE_KEYS.EVENTS, []));
  const [classColors, setClassColors] = useState(() => loadState(STORAGE_KEYS.COLORS, {}));
  const [hiddenClasses, setHiddenClasses] = useState(() => loadState(STORAGE_KEYS.HIDDEN, []));

  // Persistence
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors)); }, [classColors]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses)); }, [hiddenClasses]);

  // --- ICS Processing (FIXED) ---
  const processICSContent = useCallback((text) => {
    try {
      // FIX: Pass the raw string to unfoldLines, THEN split
      const unfolded = unfoldLines(text); 
      const lines = unfolded.split(/\r\n|\n|\r/);
      
      const newEvents = [];
      let currentEvent = null;
      let inEvent = false;

      for (const line of lines) {
        if (line.startsWith("BEGIN:VEVENT")) {
          inEvent = true;
          currentEvent = {};
        } else if (line.startsWith("END:VEVENT")) {
          if (currentEvent) {
            const type = determineType(currentEvent);
            currentEvent.type = type;
            currentEvent.class = determineClass(currentEvent);
            currentEvent.color = PALETTE[type] || PALETTE.other;
            if (!currentEvent.id) currentEvent.id = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))
            newEvents.push(currentEvent);
          }
          inEvent = false;
          currentEvent = null;
        } else if (inEvent) {
          const [key, ...valueParts] = line.split(":");
          const value = valueParts.join(":");
          if (key.includes("DTSTART")) currentEvent.start = parseICSDate(value);
          if (key.includes("DTEND")) currentEvent.end = parseICSDate(value);
          if (key.includes("SUMMARY")) currentEvent.title = value;
          if (key.includes("LOCATION")) currentEvent.location = value;
          if (key.includes("DESCRIPTION")) currentEvent.description = value;
        }
      }

      setEvents(newEvents);
      return { success: true, count: newEvents.length };
    } catch (e) {
      console.error("ICS Parse Error", e);
      return { success: false, error: e.message };
    }
  }, []);

  const openTaskModal = () => {}; // Helper placeholder

  // --- NEW: Collaboration State ---
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const { isHost, peers, syncAction } = usePlannerSync(roomId, user, setEvents);

  const dispatchCalEvent = (type, payload) => {
    setEvents(prev => {
      if (type === 'ADD') return [...prev, payload];
      if (type === 'UPDATE') return prev.map(e => e.id === payload.id ? payload : e);
      if (type === 'DELETE') return prev.filter(e => e.id !== payload);
      return prev;
    });
    syncAction(type, payload);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        setEvents,
        dispatchCalEvent, // Use this for actions you want synced
        classColors,
        setClassColors,
        hiddenClasses,
        setHiddenClasses,
        processICSContent,
        openTaskModal,
        // Sync State
        user,
        roomId,
        setRoomId,
        isHost,
        peers
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const UIProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => loadState(STORAGE_KEYS.THEME, false));
  const [calendarView, setCalendarView] = useState(() => loadState(STORAGE_KEYS.CAL_MODE, "month"));
  const [view, setView] = useState("setup");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
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
  const closeModal = (name) => setModals((prev) => ({ ...prev, [name]: false }));

  const openTaskModal = (task = null) => {
    setEditingTask(task);
    openModal("task");
  };

  return (
    <UIContext.Provider
      value={{
        darkMode, setDarkMode,
        calendarView, setCalendarView,
        view, setView,
        currentDate, setCurrentDate,
        searchQuery, setSearchQuery,
        activeTypeFilter, setActiveTypeFilter,
        showCompleted, setShowCompleted,
        hideOverdue, setHideOverdue,
        modals, openModal, closeModal,
        editingTask, setEditingTask, openTaskModal
      }}
    >
      {children}
    </UIContext.Provider>
  );
};