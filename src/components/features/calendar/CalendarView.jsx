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
  differenceInCalendarWeeks,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Check, Flag } from "lucide-react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

const CalendarView = ({
  calendarView,
  filteredEvents,
  classColors,
  onEventClick,
  onDateClick,
  draggedEventId,
  handleDragStart,
  handleDragOver,
  handleDrop,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Date Logic ---
  const { days, weeksCount } = useMemo(() => {
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
      // Day view or Agenda
      start = currentDate;
      end = currentDate;
    }

    const days = eachDayOfInterval({ start, end });
    const weeksCount = differenceInCalendarWeeks(end, start) + 1;
    
    return { days, weeksCount };
  }, [currentDate, calendarView]);

  const navigate = (direction) => {
    const isNext = direction === "next";
    if (calendarView === "month") {
      setCurrentDate((c) => (isNext ? addMonths(c, 1) : subMonths(c, 1)));
    } else if (calendarView === "week") {
      setCurrentDate((c) => (isNext ? addWeeks(c, 1) : subWeeks(c, 1)));
    } else {
      setCurrentDate((c) => (isNext ? addDays(c, 1) : subDays(c, 1)));
    }
  };

  // --- Components ---

  const CalendarTaskCard = ({ task, isCompact = false }) => (
    <Card
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(task);
      }}
      className={`
        text-xs cursor-pointer overflow-hidden border-l-4 transition-all hover:scale-[1.01] active:scale-95 shrink-0
        ${isCompact ? "p-1 mb-1" : "p-3 mb-2"}
        ${task.completed ? "opacity-50 grayscale" : "shadow-sm"}
        ${draggedEventId === task.id ? "opacity-30" : ""}
      `}
      style={{ borderLeftColor: classColors[task.class] || "#cbd5e1" }}
    >
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 truncate">
          {task.completed && <Check className="w-3 h-3 text-green-600 shrink-0" />}
          <span className={`font-medium truncate ${task.completed ? "line-through text-slate-400" : ""}`}>
            {task.title}
          </span>
        </div>
        {task.priority === "High" && !task.completed && (
          <Flag className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
        )}
      </div>
      {!isCompact && (
        <div className="flex justify-between items-center mt-1">
          <div className="flex gap-2">
             <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded text-secondary">{task.class}</span>
             <span className="text-[10px] text-secondary">{task.type}</span>
          </div>
          {task.time && (
            <div className="text-[10px] text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" /> {task.time}
            </div>
          )}
        </div>
      )}
    </Card>
  );

  // --- MOBILE VIEW RENDERER ---
  const MobileView = () => {
    const isMonthView = calendarView === 'month';
    const activeDays = isMonthView 
        ? eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) })
        : eachDayOfInterval({ start: subDays(currentDate, 3), end: addDays(currentDate, 3) });

    const selectedEvents = filteredEvents.filter(e => e.date === format(currentDate, "yyyy-MM-dd"));

    return (
      <div className="flex flex-col h-full w-full">
         {/* Top Control Bar */}
         <div className="bg-white dark:bg-slate-900 border-b border-divider shrink-0 p-2">
            <div className="flex justify-between items-center mb-2 px-2">
               <span className="font-bold text-lg">{format(currentDate, "MMMM yyyy")}</span>
               <div className="flex gap-1">
                   <Button variant="ghost" size="sm" onClick={() => navigate('prev')}><ChevronLeft className="w-4 h-4"/></Button>
                   <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                   <Button variant="ghost" size="sm" onClick={() => navigate('next')}><ChevronRight className="w-4 h-4"/></Button>
               </div>
            </div>
            {/* Scrollable Date Strip/Grid */}
            <div className={`
                ${isMonthView ? "grid grid-cols-7 gap-1" : "flex overflow-x-auto gap-2 snap-x scrollbar-hide"}
            `}>
                {/* FIX: Using index 'i' as key instead of 'd' to prevent duplicate key error for "S" and "T" */}
                {isMonthView && ["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-secondary font-bold">{d}</div>
                ))}
                
                {activeDays.map(day => {
                   const isSel = isSameDay(day, currentDate);
                   const hasEvent = filteredEvents.some(e => e.date === format(day, "yyyy-MM-dd"));
                   
                   if(isMonthView) {
                       return (
                           <button key={day.toString()} onClick={() => setCurrentDate(day)} className={`h-8 w-full rounded-full flex items-center justify-center text-xs relative ${isSel ? "bg-blue-600 text-white" : "text-primary"}`}>
                               {format(day, "d")}
                               {hasEvent && !isSel && <div className="absolute bottom-0.5 w-1 h-1 bg-blue-500 rounded-full" />}
                           </button>
                       )
                   }
                   
                   return (
                       <button key={day.toString()} onClick={() => setCurrentDate(day)} className={`snap-center min-w-[50px] flex flex-col items-center p-2 rounded-xl border ${isSel ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-800 border-divider"}`}>
                           <span className="text-[10px] font-bold uppercase">{format(day, "EEE")}</span>
                           <span className="text-lg font-bold">{format(day, "d")}</span>
                           {hasEvent && <div className={`w-1 h-1 rounded-full mt-1 ${isSel ? "bg-white" : "bg-blue-500"}`} />}
                       </button>
                   )
                })}
            </div>
         </div>
         {/* Task List */}
         <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black p-4 space-y-2">
             <h3 className="text-xs font-bold uppercase text-secondary mb-2">{format(currentDate, "EEEE, MMMM do")}</h3>
             {selectedEvents.length > 0 ? (
                 selectedEvents.map(t => <CalendarTaskCard key={t.id} task={t} />)
             ) : (
                 <div className="text-center py-10 text-secondary opacity-50 italic">No tasks</div>
             )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 overflow-hidden">
      
      {/* MOBILE RENDERER */}
      <div className="md:hidden h-full">
         <MobileView />
      </div>

      {/* DESKTOP RENDERER */}
      <div className="hidden md:flex flex-col h-full w-full">
         {/* Desktop Header */}
         <header className="flex items-center justify-between p-4 border-b border-divider shrink-0 bg-white dark:bg-slate-900 z-20">
            <h2 className="text-xl font-bold text-primary">
               {calendarView === "agenda" ? "Upcoming Agenda" : format(currentDate, "MMMM yyyy")}
            </h2>
            {calendarView !== "agenda" && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
               <Button variant="ghost" onClick={() => navigate("prev")}><ChevronLeft className="w-5 h-5" /></Button>
               <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="px-3 font-bold">Today</Button>
               <Button variant="ghost" onClick={() => navigate("next")}><ChevronRight className="w-5 h-5" /></Button>
            </div>
            )}
         </header>

         {/* Desktop Content Area */}
         <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-black relative">
            
            {/* --- Month View --- */}
            {calendarView === "month" && (
               <div className="flex flex-col h-full w-full">
                   {/* Day Names Header */}
                   <div className="grid grid-cols-7 border-b border-divider shrink-0">
                       {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                          <div key={dayName} className="py-2 text-center text-xs font-bold uppercase text-secondary bg-white dark:bg-slate-900">
                             {dayName}
                          </div>
                       ))}
                   </div>
                   
                   {/* The Grid */}
                   <div 
                      className="grid grid-cols-7 w-full h-full bg-divider gap-[1px] border-l border-divider"
                      style={{ 
                          gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` 
                      }}
                   >
                       {days.map((day) => {
                          const dayKey = format(day, "yyyy-MM-dd");
                          const dayEvents = filteredEvents.filter((e) => e.date === dayKey);
                          const isCurrentMonth = isSameMonth(day, currentDate);
                          
                          return (
                             <div
                                key={dayKey}
                                onDrop={(e) => handleDrop && handleDrop(e, dayKey)}
                                onDragOver={handleDragOver}
                                onClick={() => onDateClick && onDateClick(dayKey)}
                                className={`
                                   flex flex-col min-h-0 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                                   ${!isCurrentMonth ? "bg-slate-50/50 dark:bg-slate-900/50" : ""}
                                `}
                             >
                                {/* Date Number */}
                                <div className="p-2 shrink-0 flex justify-between items-start">
                                    <span className={`
                                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                        ${isToday(day) ? "bg-blue-600 text-white" : isCurrentMonth ? "text-primary" : "text-secondary"}
                                    `}>
                                        {format(day, "d")}
                                    </span>
                                </div>
                                
                                {/* Scrollable Event Area */}
                                <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-1 scrollbar-hide">
                                    {dayEvents.map((task) => (
                                       <CalendarTaskCard key={task.id} task={task} isCompact />
                                    ))}
                                </div>
                             </div>
                          );
                       })}
                   </div>
               </div>
            )}

            {/* --- Week View --- */}
            {calendarView === "week" && (
               <div className="flex h-full min-w-full bg-white dark:bg-slate-900 overflow-hidden">
               {days.map((day) => (
                  <div key={day.toString()} className="flex-1 min-w-[100px] border-r border-divider flex flex-col h-full min-h-0">
                     <div className={`p-3 border-b border-divider text-center shrink-0 ${isToday(day) ? "text-blue-600" : ""}`}>
                         <div className="text-xs font-bold uppercase">{format(day, "EEE")}</div>
                         <div className="text-2xl font-bold">{format(day, "d")}</div>
                     </div>
                     <div className="flex-1 p-2 space-y-2 bg-slate-50/30 dark:bg-slate-900/30 overflow-y-auto custom-scrollbar">
                         {filteredEvents.filter(e => e.date === format(day, "yyyy-MM-dd")).map(task => (
                            <CalendarTaskCard key={task.id} task={task} />
                         ))}
                     </div>
                  </div>
               ))}
               </div>
            )}
            
            {/* --- Day/Agenda View --- */}
            {(calendarView === "agenda" || calendarView === "day") && (
               <div className="h-full overflow-y-auto p-8">
                  <div className="max-w-3xl mx-auto">
                      <h2 className="text-2xl font-bold mb-6 border-b pb-2">
                         {calendarView === 'day' ? format(currentDate, "EEEE, MMMM do") : "Agenda"}
                      </h2>
                      <div className="space-y-4 pb-20">
                         {filteredEvents
                            .filter(e => calendarView === 'day' ? e.date === format(currentDate, "yyyy-MM-dd") : true)
                            .map(task => (
                               <div key={task.id} className="flex gap-4 items-start group">
                                  <div className="w-24 text-xs text-secondary text-right pt-2 font-mono">
                                     {format(parseISO(task.date), "MMM d")}
                                     <div className="font-bold">{task.time || "All Day"}</div>
                                  </div>
                                  <div className="flex-1">
                                     <CalendarTaskCard task={task} />
                                  </div>
                               </div>
                            ))
                         }
                      </div>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default CalendarView;