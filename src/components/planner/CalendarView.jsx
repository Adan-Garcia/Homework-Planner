import React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CalendarView = ({
  currentDate,
  setCurrentDate,
  calendarView, // "month", "week", "day"
  filteredEvents,
  classColors,
  openEditTaskModal,
  handleDragOver,
  handleDrop,
}) => {

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (calendarView === "month") {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (calendarView === "week") {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getDays = () => {
    let start, end;
    if (calendarView === "month") {
      start = startOfWeek(startOfMonth(currentDate));
      end = endOfWeek(endOfMonth(currentDate));
    } else if (calendarView === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = currentDate;
      end = currentDate;
    }
    return eachDayOfInterval({ start, end });
  };

  const days = getDays();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
      if (!event.date) return false;
      return isSameDay(parseISO(event.date), day);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h2 className="text-xl font-bold text-primary">
          {format(currentDate, calendarView === "day" ? "MMMM d, yyyy" : "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-base shadow-sm">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-secondary">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Header (Days of Week) */}
      {calendarView !== "day" && (
        <div className="grid grid-cols-7 border-b border-divider bg-white dark:bg-slate-900 px-4">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-secondary uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className={`
        flex-1 overflow-y-auto custom-scrollbar p-4 
        ${calendarView === "day" ? "block" : "grid grid-cols-7 auto-rows-fr gap-2"}
      `}>
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isSameDay(day, new Date());
          const dateStr = format(day, "yyyy-MM-dd");

          return (
            <div
              key={dateStr}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateStr)}
              className={`
                flex flex-col rounded-xl border transition-all min-h-[100px]
                ${calendarView === "day" ? "h-full" : ""}
                ${isCurrentMonth ? "bg-white dark:bg-slate-800 border-base" : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60"}
                ${isDayToday ? "ring-2 ring-blue-500/20 border-blue-500" : ""}
              `}
            >
              <div className={`p-2 flex justify-between items-start ${isDayToday ? "text-blue-600 font-bold" : "text-secondary"}`}>
                <span className="text-sm">{format(day, "d")}</span>
                {dayEvents.length > 0 && (
                   <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full">
                     {dayEvents.length}
                   </span>
                )}
              </div>

              <div className="flex-1 px-1 pb-1 flex flex-col gap-1 overflow-hidden">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    draggable={!event.completed}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditTaskModal(event);
                    }}
                    className="group px-2 py-1.5 rounded-md text-xs border border-l-4 cursor-pointer truncate shadow-sm hover:opacity-80 transition-opacity flex items-center gap-2"
                    style={{
                      backgroundColor: (classColors[event.class] || "#64748b") + "15", // 15 = low opacity hex
                      borderColor: "transparent",
                      borderLeftColor: classColors[event.class] || "#64748b"
                    }}
                  >
                    <span className={`flex-1 truncate ${event.completed ? "line-through opacity-50" : "font-medium text-primary"}`}>
                      {event.title}
                    </span>
                    {event.time && <span className="text-[9px] opacity-70">{event.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;