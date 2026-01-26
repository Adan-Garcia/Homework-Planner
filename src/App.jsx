import React from "react";
import { useUI, UIProvider } from "./context/PlannerContext";
import { useData, DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import { DragDropProvider } from "./context/DragDropContext"; // Import the new provider

import SetupScreen from "./components/features/onboarding/SetupScreen";
import Sidebar from "./components/features/calendar/Sidebar";
import CalendarView from "./components/features/calendar/CalendarView";

import MainLayout from "./components/layout/MainLayout";
import ModalManager from "./components/managers/ModalManager";

// import { useTaskDragAndDrop } from "./hooks/useTaskDragAndDrop"; // Remove this import
import { useFilteredEvents } from "./hooks/useFilteredEvents";

function PlannerApp() {
  const { view, openTaskModal } = useUI();
  const { toggleTaskCompletion, classColors } = useData(); 
  
  // Custom Hooks to separate logic
  const filteredEvents = useFilteredEvents();
  // const dragLogic = useTaskDragAndDrop(); // REMOVED: State is now in Context

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
        
        // REMOVED: Drag Props (Sidebar will fetch them from context)
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
        
        onEventClick={(task) => openTaskModal(task)}
        onDateClick={(dateStr) => openTaskModal({ date: dateStr })} 
        
        // REMOVED: Drag Props (CalendarView will fetch them from context)
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
          {/* Wrapped in DragDropProvider. Must be inside DataProvider (for event access). */}
          <DragDropProvider>
            <PlannerApp />
          </DragDropProvider>
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  );
}