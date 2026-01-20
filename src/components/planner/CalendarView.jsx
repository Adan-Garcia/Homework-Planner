import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, ExternalLink } from "lucide-react";
import { getWeekDates, formatTime } from "../../utils/helpers";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  parseISO,
} from "date-fns";

const LinkifiedText = ({ text }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="break-words">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all inline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}{" "}
            <ExternalLink className="w-3 h-3 opacity-50 inline ml-0.5 align-text-top" />
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
};

const CalendarView = ({ filteredEvents: propFilteredEvents }) => {
  const { events, classColors, updateEvent, hiddenClasses } = useData();
  const {
    currentDate,
    setCurrentDate,
    calendarView,
    setCalendarView,
    activeTypeFilter,
    searchQuery,
    showCompleted,
    openTaskModal,
  } = useUI();

  const [draggedEventId, setDraggedEventId] = useState(null);

  const activeEvents = useMemo(() => {
    if (propFilteredEvents) return propFilteredEvents;

    return events.filter((e) => {
      if (hiddenClasses.includes(e.class)) return false;
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter)
        return false;
      if (!showCompleted && e.completed) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(query) ||
          e.class.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [
    propFilteredEvents,
    events,
    hiddenClasses,
    activeTypeFilter,
    searchQuery,
    showCompleted,
  ]);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = events.find((ev) => ev.id === id);
    if (task && targetDate) {
      updateEvent({ ...task, date: targetDate });
    }
    setDraggedEventId(null);
  };

  const getCalendarData = () => {
    if (calendarView === "month") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });

      const firstDayIndex = getDay(start);
      const days = [];

      
      for (let i = 0; i < firstDayIndex; i++) days.push(null);

      monthDays.forEach((day) => {
        days.push({
          day: format(day, "d"),
          dateStr: format(day, "yyyy-MM-dd"),
        });
      });

      return days;
    } else if (calendarView === "week") {
      const weekDates = getWeekDates(currentDate);
      return weekDates.map((dateStr) => {
        const d = parseISO(dateStr);
        return {
          day: format(d, "d"),
          dateStr,
          dayName: format(d, "EEE"),
        };
      });
    } else if (calendarView === "day") {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      return [{ day: format(currentDate, "d"), dateStr, isSingle: true }];
    }
    return [];
  };

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of activeEvents) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [activeEvents]);

  const calendarCells = useMemo(() => {
    const rawData = getCalendarData();
    return rawData.map((cell) => {
      if (!cell) return null;
      const dayEvents = eventsByDate[cell.dateStr]
        ? [...eventsByDate[cell.dateStr]]
        : [];

      dayEvents.sort((a, b) => {
        if (!a.time && b.time) return -1;
        if (a.time && !b.time) return 1;
        const pMap = { High: 3, Medium: 2, Low: 1, undefined: 2 };
        const pA = pMap[a.priority] || 2;
        const pB = pMap[b.priority] || 2;
        if (pA !== pB) return pB - pA;
        if (!a.time && !b.time) return a.title.localeCompare(b.title);
        return a.time.localeCompare(b.time);
      });

      return { ...cell, events: dayEvents };
    });
  }, [currentDate, calendarView, eventsByDate]);

  const getPriorityStyle = (priority) => {
    if (priority === "High") return { borderRight: "3px solid #ef4444" };
    return {};
  };

  const getColor = (cls) => classColors[cls] || "#cbd5e1";

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
      <div className="p-6 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 pt-4 overflow-hidden">
        {calendarView === "agenda" ? (
          <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-8">
            {activeEvents.length === 0 ? (
              <div className="text-center text-slate-400 py-20">
                No tasks found for this period.
              </div>
            ) : (
              Object.entries(
                activeEvents.reduce((acc, ev) => {
                  const d = ev.date;
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(ev);
                  return acc;
                }, {}),
              )
                .sort()
                .map(([date, tasks]) => (
                  <div key={date} className="flex gap-6">
                    <div className="w-24 text-right shrink-0">
                      <span className="block text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {format(parseISO(date), "d")}
                      </span>
                      <span className="block text-xs font-bold text-slate-400 uppercase">
                        {format(parseISO(date), "EEE MMM")}
                      </span>
                    </div>
                    <div className="flex-1 space-y-3 pt-1 border-l-2 border-slate-100 dark:border-slate-700 pl-6 pb-6">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => openTaskModal(task)}
                          className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: getColor(task.class),
                                  }}
                                >
                                  {task.class}
                                </span>
                                {task.priority === "High" && (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Flag className="w-3 h-3 fill-current" />{" "}
                                    High
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {task.type}
                                </span>
                              </div>
                              <h4
                                className={`font-semibold text-base ${task.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}
                              >
                                {task.title}
                              </h4>
                              {task.description && (
                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                  <LinkifiedText text={task.description} />
                                </div>
                              )}
                            </div>
                            {task.time && (
                              <div className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-600 shrink-0 ml-4">
                                {formatTime(task.time)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        ) : (
          <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            <div
              className={`grid border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 ${calendarView === "day" ? "grid-cols-1" : "grid-cols-7"}`}
            >
              {(calendarView === "day"
                ? [currentDate]
                : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
              ).map((day, i) => (
                <div
                  key={i}
                  className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest"
                >
                  {calendarView === "day" ? format(day, "EEEE") : day}
                </div>
              ))}
            </div>

            <div
              className={`grid flex-1 divide-x divide-y divide-slate-100 dark:divide-slate-700 ${calendarView === "day" ? "grid-cols-1 grid-rows-1" : calendarView === "week" ? "grid-cols-7 grid-rows-1" : "grid-cols-7 grid-rows-5 lg:grid-rows-6"}`}
            >
              {calendarCells.map((cell, idx) => {
                if (!cell)
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-slate-50/20 dark:bg-slate-900/20"
                    />
                  );

                const isToday = isSameDay(new Date(), parseISO(cell.dateStr));
                const MAX_VISIBLE = calendarView === "month" ? 4 : 999;
                const visibleEvents = cell.events.slice(0, MAX_VISIBLE);
                const hiddenCount = cell.events.length - MAX_VISIBLE;

                return (
                  <div
                    key={cell.dateStr}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cell.dateStr)}
                    className={`p-2 flex flex-col relative group transition-colors hover:bg-blue-50/10 dark:hover:bg-slate-700/30 ${isToday ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div
                        onClick={() => {
                          setCurrentDate(parseISO(cell.dateStr));
                          setCalendarView("day");
                        }}
                        className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 ${isToday ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {cell.day}
                      </div>
                      {calendarView === "week" && (
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {cell.dayName}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                      {visibleEvents.map((ev) => {
                        const cColor = getColor(ev.class);
                        return (
                          <div
                            key={ev.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ev.id)}
                            onClick={() => openTaskModal(ev)}
                            className={`px-2 py-1.5 rounded-md text-[10px] font-semibold truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm border border-transparent ${ev.completed ? "opacity-40 grayscale line-through" : ""} ${draggedEventId === ev.id ? "opacity-50" : ""}`}
                            style={{
                              backgroundColor: `${cColor}15`,
                              color: cColor,
                              borderLeft: `3px solid ${cColor}`,
                              ...getPriorityStyle(ev.priority),
                            }}
                            title={`${ev.title}`}
                          >
                            {ev.time && (
                              <span className="opacity-75 mr-1">{ev.time}</span>
                            )}
                            {ev.title}
                          </div>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <button
                          onClick={() => {
                            setCurrentDate(parseISO(cell.dateStr));
                            setCalendarView("day");
                          }}
                          className="text-[10px] text-slate-400 hover:text-blue-600 font-medium text-left px-1 mt-1"
                        >
                          + {hiddenCount} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CalendarView;
