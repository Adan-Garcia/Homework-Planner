import React from "react";
import { OverlayProvider } from "@react-aria/overlays";
import { useUI, UIProvider } from "./context/PlannerContext";
import { useData, DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import { DragDropProvider } from "./context/DragDropContext";
import { NotificationProvider } from "./context/NotificationContext";
import { usePWA } from "./hooks/usePWA";

import SetupScreen from "./components/features/onboarding/SetupScreen";
import Sidebar from "./components/features/calendar/Sidebar";
import CalendarView from "./components/features/calendar/CalendarView";

import MainLayout from "./components/layout/MainLayout";
import ModalManager from "./components/managers/ModalManager";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import FeatureErrorBoundary from "./components/ui/FeatureErrorBoundary";


import { useFilteredEvents } from "./hooks/useFilteredEvents";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { initWebVitals } from "./utils/webVitals";
import { useEffect } from "react";

function PlannerApp() {
  const { view, openTaskModal } = useUI();
  const { toggleTaskCompletion, classColors, hiddenClasses, setHiddenClasses } = useData(); 
  
  // Initialize PWA and service worker auto-updates
  usePWA();
  
  // Initialize keyboard shortcuts for accessibility
  useKeyboardShortcuts();
  
  // Initialize web vitals monitoring in production
  useEffect(() => {
    if (import.meta.env.PROD) {
      initWebVitals();
    }
  }, []);
  
  const filteredEvents = useFilteredEvents();
  

  const {
    searchQuery, setSearchQuery,
    activeTypeFilter, setActiveTypeFilter,
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
      <FeatureErrorBoundary featureName="Sidebar">
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
      </FeatureErrorBoundary>
      
      <FeatureErrorBoundary featureName="Calendar">
        <CalendarView
          
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          
          
          filteredEvents={filteredEvents}
          classColors={classColors}
          
          onEventClick={(task) => openTaskModal(task)}
          onDateClick={(dateStr) => openTaskModal({ date: dateStr })} 
          toggleTask={(e, id) => {
            e.stopPropagation();
            toggleTaskCompletion(id);
          }}
          
          
        />
      </FeatureErrorBoundary>
      
      <ModalManager />
    </MainLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <OverlayProvider>
        <NotificationProvider>
          <AuthProvider>
            <DataProvider>
              <UIProvider>
                <DragDropProvider>
                  <PlannerApp />
                </DragDropProvider>
              </UIProvider>
            </DataProvider>
          </AuthProvider>
        </NotificationProvider>
      </OverlayProvider>
    </ErrorBoundary>
  );
}