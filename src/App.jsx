import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Settings,
  Moon,
  Sun,
  Plus,
  LayoutGrid,
  Columns,
  Rows,
  AlignLeft,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
} from "firebase/firestore";
import { usePlannerSync } from "./hooks/usePlannerSync";
import {
  useEvents,
  useUI,
  EventProvider,
  UIProvider,
} from "./context/PlannerContext";
import SetupScreen from "./components/setup/SetupScreen";
import Sidebar from "./components/planner/Sidebar";
import CalendarView from "./components/planner/CalendarView";
import SettingsModal from "./components/modals/SettingsModal";
import TaskModal from "./components/modals/TaskModal";
import ConfirmationModal from "./components/modals/ConfirmationModal";

function PlannerApp() {
  const eventsContext = useEvents();
  const {
    events,
    updateEvent,
    addEvent,
    deleteEvent,
    classColors,
    setClassColors,
    hiddenClasses,
    setHiddenClasses,
    deleteClass,
    mergeClasses,
    resetAllData,
    exportICS,
    importJsonData,
  } = eventsContext;

  const {
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
  } = useUI();

  // --- Firebase & Sync ---
  const [firebaseState, setFirebaseState] = useState({
    db: null,
    user: null,
    appId: null,
  });
  const [roomCode, setRoomCode] = useState(
    () => localStorage.getItem("hw_sync_room") || "",
  );
  const [jsonEditText, setJsonEditText] = useState("");
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  // UI State for confirm modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDanger: false,
  });

  const {
    syncStatus,
    createSyncSession,
    joinSyncSession,
    leaveSyncSession,
    errorMsg,
  } = usePlannerSync(firebaseState, eventsContext);

  useEffect(() => {
    if (!import.meta.env.VITE_FIREBASE_API_KEY) return;
    try {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      // 1. Initialize or Get App
      const app =
        getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const auth = getAuth(app);

      // 2. Initialize or Get Firestore
      // We wrap this in try/catch because initializeFirestore throws if called again
      let db;
      try {
        db = initializeFirestore(app, { localCache: memoryLocalCache() });
      } catch (e) {
        // Fallback: If already initialized, just get the instance
        db = getFirestore(app);
      }

      const appId = import.meta.env.VITE_FIREBASE_APP_ID || "default-app-id";

      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
          setFirebaseState({ db, user: u, appId });
        } else {
          signInAnonymously(auth).catch(console.error);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase init failed", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("hw_sync_room", roomCode);
  }, [roomCode]);

  // --- Logic: Connect / Create ---
  const handleSyncConnect = async (code, password) => {
    if (!firebaseState.user) {
      // Fallback UI notification instead of alert
      return;
    }
    try {
      await joinSyncSession(code, password);
    } catch (err) {
      if (
        err.message === "Room not found" ||
        err.message === "Room is inactive"
      ) {
        const confirmMsg =
          err.message === "Room not found"
            ? `Room "${code}" doesn't exist. Create it?`
            : `Room "${code}" exists but seems inactive (no Host). Take over as Host?`;

        setConfirmModal({
          isOpen: true,
          title: "Create Room?",
          message: confirmMsg,
          onConfirm: () => createSyncSession(code, password),
          isDanger: false,
        });
      } else {
        // Let UI display errorMsg from hook
      }
    }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedEventId(id);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !targetDate) return;
    const ev = events.find((e) => e.id === id);
    if (ev) updateEvent({ ...ev, date: targetDate });
    setDraggedEventId(null);
  };
  const handleSidebarDrop = (e, targetGroup) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    let targetDate = new Date();
    if (targetGroup === "tomorrow")
      targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = targetDate.toISOString().split("T")[0];
    const ev = events.find((e) => e.id === id);
    if (ev) updateEvent({ ...ev, date: dateStr });
  };

  const handleJsonSave = () => {
    if (importJsonData(jsonEditText).success) {
      closeModal("jsonEdit");
      if (view === "setup") setView("planner");
    }
  };

  const filteredEvents = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(0, 0, 0, 0);
    return events.filter((e) => {
      if (hiddenClasses.includes(e.class)) return false;
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter)
        return false;
      if (!showCompleted && e.completed) return false;
      const eventDate = new Date(e.date + "T00:00:00");
      if (eventDate < cutoffDate) return false;
      if (searchQuery)
        return (
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.class.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return true;
    });
  }, [events, hiddenClasses, activeTypeFilter, searchQuery, showCompleted]);

  const renderModals = () => (
    <>
      <SettingsModal
        isOpen={modals.settings || modals.jsonEdit}
        onClose={() => {
          closeModal("settings");
          closeModal("jsonEdit");
        }}
        classColors={classColors}
        setClassColors={setClassColors}
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={() => {
          mergeClasses(mergeSource, mergeTarget);
          setMergeSource("");
          setMergeTarget("");
        }}
        deleteClass={deleteClass}
        resetAllData={resetAllData}
        showJsonEdit={modals.jsonEdit}
        setShowJsonEdit={(val) =>
          val ? openModal("jsonEdit") : closeModal("jsonEdit")
        }
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
        handleICSExport={exportICS}
        // Sync
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        syncStatus={syncStatus}
        handleSyncConnect={handleSyncConnect}
        disconnectFromRoom={leaveSyncSession}
        errorMsg={errorMsg}
      />
      <TaskModal
        isOpen={modals.task}
        onClose={() => closeModal("task")}
        editingTask={editingTask}
        saveTask={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const isAllDay = formData.get("isAllDay") === "on";
          const baseTask = {
            title: formData.get("title"),
            time: isAllDay ? "" : formData.get("time"),
            class: formData.get("class"),
            type: formData.get("type"),
            priority: formData.get("priority") || "Medium",
            description: formData.get("description") || "",
            completed: editingTask ? editingTask.completed : false,
          };
          const startDate = formData.get("date");
          if (editingTask)
            updateEvent({
              ...baseTask,
              date: startDate,
              id: editingTask.id,
              groupId: editingTask.groupId,
            });
          else
            addEvent({
              ...baseTask,
              date: startDate,
              id: `manual-${Date.now()}`,
              groupId: null,
            });
          closeModal("task");
        }}
        requestDelete={(id) => {
          setConfirmModal({
            isOpen: true,
            title: "Delete Task?",
            message:
              "Are you sure you want to delete this task? This cannot be undone.",
            isDanger: true,
            onConfirm: () => {
              deleteEvent(id);
              closeModal("task");
            },
          });
        }}
        classColors={classColors}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />
    </>
  );

  if (view === "setup")
    return (
      <div className="bg-white dark:bg-slate-900 min-h-screen">
        <SetupScreen />
        {renderModals()}
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      <header className="h-16 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg hidden md:block">
            Homework Planner
          </h1>
          {syncStatus !== "disconnected" && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border animate-in fade-in ${syncStatus === "connected" || syncStatus === "active" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" : syncStatus === "error" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"}`}
            >
              {syncStatus === "connected" || syncStatus === "active" ? (
                <Wifi className="w-3 h-3" />
              ) : syncStatus === "error" ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="uppercase">
                {syncStatus === "connected" || syncStatus === "active"
                  ? "Synced"
                  : syncStatus === "error"
                    ? "Error"
                    : "Connecting..."}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {[
            { id: "month", icon: LayoutGrid, label: "Month" },
            { id: "week", icon: Columns, label: "Week" },
            { id: "day", icon: Rows, label: "Day" },
            { id: "agenda", icon: AlignLeft, label: "Agenda" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setCalendarView(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${calendarView === v.id ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <v.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openTaskModal(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <div className="w-px h-5 bg-slate-200 mx-2"></div>
          <button
            onClick={() => openModal("settings")}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative"
          >
            <Settings className="w-4 h-4" />
            {syncStatus !== "disconnected" && (
              <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-white ${syncStatus === "connected" || syncStatus === "active" ? "bg-green-500" : syncStatus === "error" ? "bg-red-500" : "bg-amber-500"}`}
              ></span>
            )}
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTypeFilter={activeTypeFilter}
          setActiveTypeFilter={setActiveTypeFilter}
          hiddenClasses={hiddenClasses}
          setHiddenClasses={setHiddenClasses}
          classColors={classColors}
          filteredEvents={filteredEvents}
          hideOverdue={hideOverdue}
          setHideOverdue={setHideOverdue}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleSidebarDrop={handleSidebarDrop}
          toggleTask={(e, id) => {
            e.stopPropagation();
            useEvents().toggleTaskCompletion(id);
          }}
          openEditTaskModal={(task) => openTaskModal(task)}
          draggedEventId={draggedEventId}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
        />
        <CalendarView
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          filteredEvents={filteredEvents}
          classColors={classColors}
          openEditTaskModal={(task) => openTaskModal(task)}
          handleDragOver={handleDragOver}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedEventId={draggedEventId}
        />
      </div>
      {renderModals()}
    </div>
  );
}

export default function App() {
  return (
    <EventProvider>
      <UIProvider>
        <PlannerApp />
      </UIProvider>
    </EventProvider>
  );
}
