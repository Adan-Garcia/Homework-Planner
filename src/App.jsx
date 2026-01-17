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
} from "lucide-react";
import { useUI, EventProvider, UIProvider } from "./context/PlannerContext";
import useData from "./context/DataContext";
import SetupScreen from "./components/setup/SetupScreen";
import Sidebar from "./components/planner/Sidebar";
import CalendarView from "./components/planner/CalendarView";
import SettingsModal from "./components/modals/SettingsModal";
import TaskModal from "./components/modals/TaskModal";
import ConfirmationModal from "./components/modals/ConfirmationModal";

function PlannerApp() {
  const eventsContext = useData();
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
            useData().toggleTaskCompletion(id);
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
