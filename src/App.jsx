import React from "react";
import { useUI, UIProvider } from "./context/PlannerContext";
import { useData, DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";

import SetupScreen from "./components/features/onboarding/SetupScreen";
import Sidebar from "./components/features/calendar/Sidebar";
import CalendarView from "./components/features/calendar/CalendarView";

import MainLayout from "./components/layout/MainLayout";
import ModalManager from "./components/managers/ModalManager";

import { useTaskDragAndDrop } from "./hooks/useTaskDragAndDrop";
import { useFilteredEvents } from "./hooks/useFilteredEvents";

function PlannerApp() {
  const { view, openTaskModal } = useUI();
  const { toggleTaskCompletion, classColors } = useData(); // Needed for Sidebar props
  
  // Custom Hooks to separate logic
  const filteredEvents = useFilteredEvents();
  const dragLogic = useTaskDragAndDrop();

  // Props needed for Sidebar
  const {
    searchQuery, setSearchQuery,
    activeTypeFilter, setActiveTypeFilter,
    hiddenClasses, setHiddenClasses,
    hideOverdue, setHideOverdue,
    showCompleted, setShowCompleted,
  } = useUI();

  const {
    currentDate, setCurrentDate,
    calendarView, setCalendarView,
  } = useUI();

  if (view === "setup") {
    return (
      <div className="surface-main min-h-screen">
        <SetupScreen />
        <ModalManager />
      </div>
    );
  }

  return (
    <MainLayout>
      <Sidebar
        // Filter Props
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTypeFilter={activeTypeFilter}
        setActiveTypeFilter={setActiveTypeFilter}
        hiddenClasses={hiddenClasses}
        setHiddenClasses={setHiddenClasses}
        hideOverdue={hideOverdue}
        setHideOverdue={setHideOverdue}
        showCompleted={showCompleted}
        setShowCompleted={setShowCompleted}
        
        // Data Props
        classColors={classColors}
        filteredEvents={filteredEvents}
        toggleTask={(e, id) => {
          e.stopPropagation();
          toggleTaskCompletion(id);
        }}
        
        // Modal Props
        openEditTaskModal={(task) => openTaskModal(task)}
        
        // Drag Props
        draggedEventId={dragLogic.draggedEventId}
        handleDragStart={dragLogic.handleDragStart}
        handleDragOver={dragLogic.handleDragOver}
        handleSidebarDrop={dragLogic.handleSidebarDrop}
      />
      
      <CalendarView
        // View Props
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        
        // Data Props
        filteredEvents={filteredEvents}
        classColors={classColors}
        
        // Modal Props
        openEditTaskModal={(task) => openTaskModal(task)}
        
        // Drag Props
        draggedEventId={dragLogic.draggedEventId}
        handleDragOver={dragLogic.handleDragOver}
        handleDragStart={dragLogic.handleDragStart}
        handleDrop={dragLogic.handleDrop}
      />
      
      <ModalManager />
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <PlannerApp />
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  );
}