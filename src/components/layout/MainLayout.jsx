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
} from "lucide-react";
import { useUI } from "../../context/PlannerContext";

const MainLayout = ({ children }) => {
  const {
    darkMode,
    setDarkMode,
    calendarView,
    setCalendarView,
    openModal,
    openTaskModal,
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
      <header className="h-16 border-b border-divider px-6 flex items-center justify-between surface-main shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg hidden md:block text-primary">
            Homework Planner
          </h1>
        </div>

        {/* View Switcher */}
        <div className="flex items-center surface-card rounded-lg p-1">
          {viewOptions.map((v) => (
            <button
              key={v.id}
              onClick={() => setCalendarView(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                calendarView === v.id
                  ? "surface-main shadow-sm text-link"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <v.icon className="icon-sm" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openTaskModal(null)}
            className="btn-base btn-primary"
          >
            <Plus className="icon-sm" /> New
          </button>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-secondary surface-card-hover"
          >
            {darkMode ? (
              <Sun className="icon-sm" />
            ) : (
              <Moon className="icon-sm" />
            )}
          </button>
          
          <div className="w-px h-5 border-l border-divider mx-2"></div>
          
          <button
            onClick={() => openModal("settings")}
            className="p-2 rounded-lg text-secondary surface-card-hover"
          >
            <Settings className="icon-sm" />
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;