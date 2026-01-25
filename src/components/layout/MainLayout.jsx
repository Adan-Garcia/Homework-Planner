import React from "react";
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
  Menu,
  X,
} from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import Button from "../ui/Button";

const MainLayout = ({ children }) => {
  const {
    darkMode,
    setDarkMode,
    calendarView,
    setCalendarView,
    openModal,
    openTaskModal,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUI();

  const viewOptions = [
    { id: "month", icon: LayoutGrid, label: "Month" },
    { id: "week", icon: Columns, label: "Week" },
    { id: "day", icon: Rows, label: "Day", hiddenOnMobile: true }, 
    { id: "agenda", icon: AlignLeft, label: "Agenda" },
  ];

  return (
    <div className="h-[100dvh] flex flex-col surface-main text-primary font-sans overflow-hidden transition-colors duration-500 relative selection:bg-blue-500/30">
      
      {/* --- Ambient Background --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* --- Header (Floating Island) --- */}
      <header className="shrink-0 z-30 pt-2 px-2 sm:pt-4 sm:px-6 relative">
        <div className="mac-glass rounded-full h-14 sm:h-16 px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Logo & Menu */}
          {/* Changed w-1/4 to w-auto to prevent dead space issues */}
          <div className="flex items-center gap-3 w-auto min-w-fit pl-1">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-secondary hover:text-primary rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] p-1.5 rounded-lg shadow-lg shadow-blue-500/20 hidden xs:flex">
                <CalendarIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-bold text-lg hidden md:block tracking-tight text-slate-800 dark:text-white">
                Planner
              </h1>
            </div>
          </div>

          {/* Center: Segmented Control (Pill) */}
          {/* Uses flex-1 to take available space, but min-w-0 prevents blowout */}
          <div className="flex-1 max-w-sm mx-auto min-w-0 px-2">
            <div className="flex p-1 bg-black/5 dark:bg-white/10 rounded-full w-full backdrop-blur-sm">
              {viewOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setCalendarView(v.id)}
                  className={`
                    flex-1 flex items-center justify-center py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out
                    ${calendarView === v.id ? "segmented-item-active shadow-md" : "segmented-item-inactive"}
                    ${v.hiddenOnMobile ? "hidden md:flex" : "flex"} 
                  `}
                >
                  <v.icon className={`w-4 h-4 sm:mr-1.5 ${calendarView === v.id ? "text-[#007AFF] dark:text-white" : "opacity-60"}`} />
                  <span className="hidden sm:inline truncate">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          {/* Changed w-1/4 to w-auto to allow buttons to sit naturally without overlap */}
          <div className="flex items-center justify-end gap-1.5 w-auto min-w-fit pr-1">
            <div className="flex items-center gap-1 border-r border-black/10 dark:border-white/10 pr-1.5 mr-0.5">
              <Button
                variant="ghost"
                onClick={() => setDarkMode(prev => !prev)}
                className="w-8 h-8 sm:w-9 sm:h-9 !p-0 rounded-full"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => openModal("settings")}
                className="w-8 h-8 sm:w-9 sm:h-9 !p-0 rounded-full"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={() => openTaskModal(null)}
              className="!rounded-full !px-3 sm:!px-4 !h-8 sm:!h-9 shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </div>
        </div>
      </header>

      {/* --- Main Content Area (Floating Grid) --- */}
      {/* z-10 ensures content is below header (z-30) and drawer (z-50) */}
      <div className="flex flex-1 overflow-hidden relative p-2 sm:p-4 sm:pt-4 gap-4 z-10">
          {children}
      </div>
    </div>
  );
};

export default MainLayout;