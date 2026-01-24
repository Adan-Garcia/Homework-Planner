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
  Menu, // New Icon
  X,    // New Icon
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
    mobileMenuOpen,    // New
    setMobileMenuOpen, // New
  } = useUI();

  const viewOptions = [
    { id: "month", icon: LayoutGrid, label: "Month" },
    { id: "week", icon: Columns, label: "Week" },
    { id: "day", icon: Rows, label: "Day" },
    { id: "agenda", icon: AlignLeft, label: "Agenda" },
  ];

  return (
    <div className="h-screen flex flex-col surface-main text-primary font-sans overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="h-16 border-b border-divider px-4 md:px-6 flex items-center justify-between surface-main shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
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

        {/* View Switcher - Hidden on very small screens if needed, or scrollable */}
        <div className="flex items-center surface-card rounded-lg p-1 overflow-x-auto max-w-[200px] md:max-w-none custom-scrollbar hide-scrollbar">
          {viewOptions.map((v) => (
            <Button
              key={v.id}
              onClick={() => setCalendarView(v.id)}
              variant="ghost"
              className={`
                !px-2 md:!px-3 !py-1.5 gap-2 transition-all shrink-0
                ${
                  calendarView === v.id
                    ? "surface-main shadow-sm text-link"
                    : "text-secondary hover:text-primary"
                }
              `}
            >
              <v.icon className="icon-sm" />
              <span className="hidden sm:inline">{v.label}</span>
            </Button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="primary"
            onClick={() => openTaskModal(null)}
            icon={Plus}
            className="!px-3 md:!px-4" // Smaller padding on mobile
          >
            <span className="hidden md:inline">New</span>
          </Button>
          
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
            >
               {darkMode ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
            </Button>
            
            <div className="w-px h-5 border-l border-divider mx-2"></div>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => openModal("settings")}
            className="p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Settings className="icon-sm" />
          </Button>
        </div>
      </header>

      {/* Main Content Grid - Added 'relative' for absolute positioning of mobile sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;