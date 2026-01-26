import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"; 
import { STORAGE_KEYS } from "../utils/constants.js";

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
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
  
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedEvents = loadState(STORAGE_KEYS.EVENTS, []);
    const savedRoom = loadState("planner_curr_room_id", null); 
    
    if ((savedEvents && savedEvents.length > 0) || savedRoom) {
      setView("planner");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAL_MODE, JSON.stringify(calendarView));
  }, [calendarView]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  
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