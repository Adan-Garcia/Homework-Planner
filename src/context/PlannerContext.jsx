import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"; 
import { STORAGE_KEYS } from "../utils/constants.js";

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

// Helper to safely read JSON from localStorage
const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

/**
 * UIProvider (PlannerContext)
 * * Manages purely presentational state that persists across reloads.
 * * Responsibilities:
 * 1. Theme: Dark Mode / Light Mode.
 * 2. View Mode: Calendar vs Agenda vs Week vs Day.
 * 3. Modals: Open/Close state for settings, task editors, etc.
 * 4. Navigation: Current selected date.
 * 5. Filters: Search queries and filter toggles.
 */
export const UIProvider = ({ children }) => {
  // --- Persistent UI State ---
  const [darkMode, setDarkMode] = useState(() =>
    loadState(STORAGE_KEYS.THEME, false),
  );
  const [calendarView, setCalendarView] = useState(() =>
    loadState(STORAGE_KEYS.CAL_MODE, "month"),
  );
  
  // --- Session UI State ---
  const [view, setView] = useState("setup"); // 'setup' | 'planner'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(true);
  const [hideOverdue, setHideOverdue] = useState(false);
  
  // Modal States
  const [modals, setModals] = useState({
    settings: false,
    task: false,
    jsonEdit: false,
  });
  const [editingTask, setEditingTask] = useState(null);
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-redirect to planner if data exists on load
  useEffect(() => {
    const savedEvents = loadState(STORAGE_KEYS.EVENTS, []);
    const savedRoom = loadState("planner_curr_room_id", null); 
    
    if ((savedEvents && savedEvents.length > 0) || savedRoom) {
      setView("planner");
    }
  }, []);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAL_MODE, JSON.stringify(calendarView));
  }, [calendarView]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  // --- Modal Helpers ---
  const openModal = useCallback((name) => {
    setModals((prev) => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name) => {
    setModals((prev) => ({ ...prev, [name]: false }));
  }, []);

  const openTaskModal = useCallback((task = null) => {
    setEditingTask(task);
    openModal("task");
  }, [openModal]);

  const value = useMemo(() => ({
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
    mobileMenuOpen,
    setMobileMenuOpen,
  }), [
    darkMode,
    calendarView,
    view,
    currentDate,
    searchQuery,
    activeTypeFilter,
    showCompleted,
    hideOverdue,
    modals,
    editingTask,
    mobileMenuOpen,
    openModal,
    closeModal,
    openTaskModal
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};