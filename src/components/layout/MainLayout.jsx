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

  // Added 'hiddenOnMobile' property to the Day view
  const viewOptions = [
    { id: "month", icon: LayoutGrid, label: "Month" },
    { id: "week", icon: Columns, label: "Week" },
    { id: "day", icon: Rows, label: "Day", hiddenOnMobile: true }, 
    { id: "agenda", icon: AlignLeft, label: "Agenda" },
  ];

  return (
    <div className="h-[100dvh] flex flex-col surface-main text-primary font-sans overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="h-14 sm:h-16 border-b border-divider px-3 sm:px-6 flex items-center justify-between surface-main shrink-0 z-30 relative gap-2">
        
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-secondary hover:text-primary rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="bg-blue-600 p-1.5 rounded-lg hidden xs:block">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg hidden md:block text-primary">
            Homework Planner
          </h1>
        </div>

        {/* Center: Mobile-Friendly Segmented View Switcher */}
        <div className="flex-1 max-w-sm mx-auto">
           <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full">
            {viewOptions.map((v) => (
              <button
                key={v.id}
                onClick={() => setCalendarView(v.id)}
                className={`
                  flex-1 items-center justify-center py-1.5 rounded-md text-xs font-bold transition-all duration-200
                  ${calendarView === v.id ? "segmented-item-active" : "segmented-item-inactive"}
                  ${v.hiddenOnMobile ? "hidden md:flex" : "flex"} 
                `}
              >
                <v.icon className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="primary"
            onClick={() => openTaskModal(null)}
            icon={Plus}
            className="!px-3 !py-1.5 sm:!py-2"
          >
            <span className="hidden sm:inline">New</span>
          </Button>
          
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-secondary"
            >
               {darkMode ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => openModal("settings")}
              className="p-2 text-secondary"
            >
              <Settings className="icon-sm" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;