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
import Button from "../ui/Button"; // Importing your new Atom

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
            <Button
              key={v.id}
              onClick={() => setCalendarView(v.id)}
              variant="ghost" // Using ghost to strip default colors
              className={`
                !px-3 !py-1.5 gap-2 transition-all
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
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => openTaskModal(null)}
            icon={Plus}
          >
            New
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
          >
             {darkMode ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
          </Button>
          
          <div className="w-px h-5 border-l border-divider mx-2"></div>
          
          <Button
            variant="ghost"
            onClick={() => openModal("settings")}
            className="p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Settings className="icon-sm" />
          </Button>
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