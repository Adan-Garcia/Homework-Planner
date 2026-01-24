import React, { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isPast,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Check, Flag } from "lucide-react";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { urlRegex } from "../../../utils/helpers";

// --- Linkify Component ---
const LinkifiedText = ({ text }) => {
  if (!text) return null;
  const parts = text.split(urlRegex);
  return (
    <span className="break-all">
      {parts.map((part, i) =>
        part.match(urlRegex) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline relative z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
};

const CalendarView = ({
  // Data
  calendarView,
  filteredEvents,
  classColors,
  
  // Actions
  onEventClick,
  onDateClick,
  
  // Drag & Drop
  draggedEventId,
  handleDragStart,
  handleDragOver,
  handleCalendarDrop, // Maps to handleDrop in App.jsx
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Navigation Logic ---
  const navigate = (direction) => {
    if (calendarView === "month") {
      setCurrentDate(curr => direction === "next" ? addMonths(curr, 1) : subMonths(curr, 1));
    } else if (calendarView === "week") {
      setCurrentDate(curr => direction === "next" ? addWeeks(curr, 1) : subWeeks(curr, 1));
    } else {
      setCurrentDate(curr => direction === "next" ? addDays(curr, 1) : subDays(curr, 1));
    }
  };

  const jumpToToday = () => setCurrentDate(new Date());

  // --- Date Generation ---
  const calendarDays = useMemo(() => {
    let start, end;
    
    if (calendarView === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart);
      end = endOfWeek(monthEnd);
    } else if (calendarView === "week") {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      // Day
      start = currentDate;
      end = currentDate;
    }
    // Note: Agenda doesn't use calendarDays like the grid views do.

    return eachDayOfInterval({ start, end });
  }, [currentDate, calendarView]);

  // --- Render Helpers ---

  // 1. The Atomic Task Card
  const CalendarTaskCard = ({ task, isCompact = false }) => (
    <Card
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(task);
      }}
      className={`
        text-xs cursor-pointer overflow-hidden border-l-4 transition-all hover:scale-[1.02]
        ${isCompact ? "p-1 mb-1" : "p-2 mb-2"}
        ${task.completed ? "opacity-50 grayscale" : "shadow-sm"}
        ${draggedEventId === task.id ? "opacity-30" : ""}
      `}
      style={{ borderLeftColor: classColors[task.class] || "#cbd5e1" }}
    >
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5 truncate">
            {task.completed && <Check className="w-3 h-3 text-green-600 shrink-0" />}
            <span className={`font-medium truncate ${task.completed ? "line-through text-slate-400" : ""}`}>
            {task.title}
            </span>
        </div>
        
        {/* Priority Flag */}
        {task.priority === "High" && !task.completed && (
            <Flag className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
        )}
      </div>
      {!isCompact && task.time && (
        <div className="text-[10px] text-secondary mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {task.time}
        </div>
      )}
    </Card>
  );

  // 2. Month Cell Component (With Overflow)
  const MonthCell = ({ day }) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = filteredEvents.filter((e) => e.date === dayKey);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isDayToday = isToday(day);

    // Overflow Logic
    const MAX_VISIBLE = 3;
    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
    const hiddenCount = dayEvents.length - MAX_VISIBLE;

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleCalendarDrop(e, dayKey)}
        onClick={() => onDateClick && onDateClick(dayKey)}
        className={`
          min-h-[100px] border-b border-r border-divider p-1 transition-colors relative group
          ${!isCurrentMonth ? "bg-slate-50/50 dark:bg-slate-900/30 text-secondary" : "bg-white dark:bg-slate-900"}
          ${isDayToday ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}
          hover:bg-slate-50 dark:hover:bg-slate-800/50
        `}
      >
        <div className="flex justify-between items-start p-1 mb-1">
          <span
            className={`
              text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
              ${isDayToday ? "bg-blue-600 text-white" : "text-secondary"}
            `}
          >
            {format(day, "d")}
          </span>
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity">
             <div className="w-2 h-2 bg-slate-300 rounded-full" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {visibleEvents.map((task) => (
            <CalendarTaskCard key={task.id} task={task} isCompact={true} />
          ))}
          {hiddenCount > 0 && (
             <div className="text-[10px] font-medium text-secondary text-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                + {hiddenCount} more
             </div>
          )}
        </div>
      </div>
    );
  };

  // 3. Week Column Component
  const WeekColumn = ({ day }) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayEvents = filteredEvents.filter((e) => e.date === dayKey);
    const isDayToday = isToday(day);

    return (
      <div 
        className="flex-1 min-w-[150px] border-r border-divider flex flex-col"
        onDragOver={handleDragOver}
        onDrop={(e) => handleCalendarDrop(e, dayKey)}
      >
        <div className={`p-2 border-b border-divider text-center sticky top-0 bg-inherit z-10 ${isDayToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
          <div className="text-xs uppercase text-secondary font-bold">{format(day, "EEE")}</div>
          <div className={`text-xl font-bold ${isDayToday ? "text-blue-600" : ""}`}>{format(day, "d")}</div>
        </div>
        
        <div className="flex-1 p-2 space-y-2 bg-slate-50/30 dark:bg-slate-900/30">
          {dayEvents.map((task) => (
             <CalendarTaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  };

  // 4. Agenda Group Component
  const AgendaGroup = ({ dateStr, tasks }) => {
     const dateObj = parseISO(dateStr);
     const isDayToday = isToday(dateObj);
     
     return (
        <div className="mb-6">
           <div className={`sticky top-0 z-10 py-2 px-4 bg-slate-50 dark:bg-slate-800 border-y border-divider mb-3 flex items-baseline gap-2`}>
              <span className={`text-lg font-bold ${isDayToday ? "text-blue-600" : "text-primary"}`}>
                 {format(dateObj, "EEEE")}
              </span>
              <span className="text-sm text-secondary">
                 {format(dateObj, "MMMM do")}
              </span>
              {isDayToday && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Today</span>}
           </div>
           
           <div className="px-4 space-y-3">
              {tasks.map(task => (
                 <Card 
                    key={task.id}
                    onClick={() => onEventClick(task)}
                    className="p-3 border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                    style={{ borderLeftColor: classColors[task.class] || "#cbd5e1" }}
                 >
                    <div className="flex items-start gap-3">
                       <div className="w-16 shrink-0 text-xs text-secondary font-mono pt-0.5">
                          {task.time || "All Day"}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-sm text-primary">{task.title}</span>
                             {task.priority === "High" && <Flag className="w-3 h-3 text-red-500 fill-red-500" />}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-secondary mb-2">
                             <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{task.class}</span>
                             <span>{task.type}</span>
                          </div>
                          {task.description && (
                             <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                <LinkifiedText text={task.description} />
                             </p>
                          )}
                       </div>
                    </div>
                 </Card>
              ))}
           </div>
        </div>
     );
  };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900">
      {/* 1. Header Navigation */}
      <header className="flex items-center justify-between p-4 border-b border-divider shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">
            {calendarView === "agenda" ? "Upcoming Agenda" : format(currentDate, "MMMM yyyy")}
          </h2>
          {calendarView !== "agenda" && (
            <div className="flex items-center gap-1 ml-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <Button variant="ghost" onClick={() => navigate("prev")} className="!p-1">
                <ChevronLeft className="w-5 h-5 text-secondary" />
                </Button>
                <Button variant="ghost" onClick={jumpToToday} className="text-xs font-bold px-2">
                Today
                </Button>
                <Button variant="ghost" onClick={() => navigate("next")} className="!p-1">
                <ChevronRight className="w-5 h-5 text-secondary" />
                </Button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Calendar Grid Body */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-100 dark:bg-black">
        
        {/* Month View */}
        {calendarView === "month" && (
          <div className="grid grid-cols-7 min-h-full auto-rows-fr bg-divider gap-[1px] border-l border-divider">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div key={dayName} className="p-2 text-center text-xs font-bold uppercase text-secondary bg-white dark:bg-slate-900">
                {dayName}
              </div>
            ))}
            {calendarDays.map((day) => (
              <MonthCell key={day.toString()} day={day} />
            ))}
          </div>
        )}

        {/* Week View */}
        {calendarView === "week" && (
          <div className="flex h-full min-w-max bg-white dark:bg-slate-900">
            {calendarDays.map((day) => (
              <WeekColumn key={day.toString()} day={day} />
            ))}
          </div>
        )}

        {/* Day View */}
        {calendarView === "day" && (
           <div className="max-w-3xl mx-auto p-6 space-y-4">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary">{format(currentDate, "EEEE")}</div>
                <div className="text-xl text-secondary">{format(currentDate, "MMMM do, yyyy")}</div>
              </div>
              <div className="space-y-3">
                {filteredEvents
                  .filter(e => e.date === format(currentDate, "yyyy-MM-dd"))
                  .map(task => (
                    <CalendarTaskCard key={task.id} task={task} />
                  ))}
                 {filteredEvents.filter(e => e.date === format(currentDate, "yyyy-MM-dd")).length === 0 && (
                   <div className="text-center p-10 text-secondary border-2 border-dashed border-divider rounded-xl">
                     No tasks for this day
                   </div>
                 )}
              </div>
           </div>
        )}

        {/* Agenda View (Updated) */}
        {calendarView === "agenda" && (
            <div className="max-w-4xl mx-auto pb-10">
                {(() => {
                    // Group upcoming tasks by date
                    const todayStr = new Date().toISOString().split('T')[0];
                    const groups = {};
                    
                    filteredEvents.forEach(task => {
                        if (task.date >= todayStr && !task.completed) {
                            if (!groups[task.date]) groups[task.date] = [];
                            groups[task.date].push(task);
                        }
                    });

                    const sortedDates = Object.keys(groups).sort();

                    if (sortedDates.length === 0) {
                        return (
                            <div className="p-10 text-center text-secondary">
                                <div className="text-lg font-bold">No upcoming tasks</div>
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        );
                    }

                    return sortedDates.map(date => (
                        <AgendaGroup key={date} dateStr={date} tasks={groups[date]} />
                    ));
                })()}
            </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;