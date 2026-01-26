import React from "react";
import { useUI, UIProvider } from "./context/PlannerContext";
import { useData, DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import { DragDropProvider } from "./context/DragDropContext"; 

import SetupScreen from "./components/features/onboarding/SetupScreen";
import Sidebar from "./components/features/calendar/Sidebar";
import CalendarView from "./components/features/calendar/CalendarView";

import MainLayout from "./components/layout/MainLayout";
import ModalManager from "./components/managers/ModalManager";


import { useFilteredEvents } from "./hooks/useFilteredEvents";

function PlannerApp() {
  const { view, openTaskModal } = useUI();
  const { toggleTaskCompletion, classColors } = useData(); 
  
  
  const filteredEvents = useFilteredEvents();
  

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
        
        
        classColors={classColors}
        filteredEvents={filteredEvents}
        toggleTask={(e, id) => {
          e.stopPropagation();
          toggleTaskCompletion(id);
        }}
        
        
        openEditTaskModal={(task) => openTaskModal(task)}
        
        
      />
      
      <CalendarView
        
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        
        
        filteredEvents={filteredEvents}
        classColors={classColors}
        
        onEventClick={(task) => openTaskModal(task)}
        onDateClick={(dateStr) => openTaskModal({ date: dateStr })} 
        
        
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
          <DragDropProvider>
            <PlannerApp />
          </DragDropProvider>
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  );
}