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

  const CalendarTaskCard = ({ task, isCompact = false }) => (
    <div
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(task);
      }}
      className={`
        cursor-pointer overflow-hidden transition-all duration-300 group relative backdrop-blur-sm
        ${isCompact ? "px-2 py-1 mb-1 rounded-lg text-[10px] border-l-2" : "p-3 mb-2 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm"}
        ${task.completed ? "opacity-40 grayscale bg-black/5 dark:bg-white/5" : "bg-white/80 dark:bg-white/10 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]"}
        ${draggedEventId === task.id ? "opacity-30" : ""}
      `}
      style={{ 
        borderLeftColor: isCompact ? classColors[task.class] : undefined,
        backgroundColor: isCompact ? `${classColors[task.class]}25` : undefined 
      }}
    >
        {/* Decorative Pill for Non-Compact */}
        {!isCompact && (
            <div className="absolute left-1 top-3 bottom-3 w-1 rounded-full" style={{ backgroundColor: classColors[task.class] || "#cbd5e1" }} />
        )}
        
      <div className={`flex items-center gap-2 justify-between ${!isCompact ? "pl-3" : ""}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {task.completed && <Check className="w-3 h-3 text-green-600 shrink-0" />}
          <span className={`font-semibold truncate ${isCompact ? "text-slate-800 dark:text-slate-100" : "text-sm text-primary"} ${task.completed ? "line-through text-secondary" : ""}`}>
            {task.title}
          </span>
        </div>
        {task.priority === "High" && !task.completed && (
          <Flag className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
        )}
      </div>
      
      {!isCompact && (
        <div className="flex justify-between items-center mt-2 pl-3">
          <div className="flex gap-2">
             <span className="text-[10px] font-bold text-secondary uppercase tracking-wide opacity-80">{task.class}</span>
          </div>
          {task.time && (
            <div className="text-[10px] text-secondary font-medium flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> {task.time}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // --- MOBILE VIEW ---
  const MobileView = () => {
    const isMonthView = calendarView === 'month';
    const activeDays = isMonthView 
        ? eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) })
        : eachDayOfInterval({ start: subDays(currentDate, 3), end: addDays(currentDate, 3) });

    const selectedEvents = filteredEvents.filter(e => e.date === format(currentDate, "yyyy-MM-dd"));

    return (
      <div className="flex flex-col h-full w-full mac-glass rounded-[32px] overflow-hidden">
         {/* Top Control Bar */}
         <div className="bg-white/40 dark:bg-black/20 border-b border-black/5 dark:border-white/5 shrink-0 p-4 pb-2 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
               <span className="font-bold text-xl tracking-tight text-primary">{format(currentDate, "MMMM yyyy")}</span>
               <div className="flex gap-1">
                   <Button variant="ghost" size="sm" onClick={() => navigate('prev')} className="!p-1.5 rounded-full"><ChevronLeft className="w-5 h-5"/></Button>
                   <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs font-bold rounded-full">Today</Button>
                   <Button variant="ghost" size="sm" onClick={() => navigate('next')} className="!p-1.5 rounded-full"><ChevronRight className="w-5 h-5"/></Button>
               </div>
            </div>
            
            {/* Scrollable Date Strip/Grid */}
            <div className={`
                ${isMonthView ? "grid grid-cols-7 gap-y-2" : "flex overflow-x-auto gap-3 snap-x scrollbar-hide pb-2"}
            `}>
                {isMonthView && ["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-secondary font-bold mb-1">{d}</div>
                ))}
                
                {activeDays.map(day => {
                   const isSel = isSameDay(day, currentDate);
                   const isTodayDay = isToday(day);
                   const hasEvent = filteredEvents.some(e => e.date === format(day, "yyyy-MM-dd"));
                   
                   if(isMonthView) {
                       return (
                           <button 
                                key={day.toString()} 
                                onClick={() => setCurrentDate(day)} 
                                className={`
                                    h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-sm relative transition-all duration-300
                                    ${isSel ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 font-bold scale-110" : isTodayDay ? "text-[#007AFF] font-bold bg-blue-50 dark:bg-blue-900/20" : "text-primary hover:bg-black/5 dark:hover:bg-white/10"}
                                `}
                           >
                               {format(day, "d")}
                               {hasEvent && !isSel && <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full" />}
                           </button>
                       )
                   }
                   
                   return (
                       <button key={day.toString()} onClick={() => setCurrentDate(day)} className={`snap-center min-w-[56px] flex flex-col items-center p-2 rounded-2xl border transition-all duration-300 ${isSel ? "bg-[#007AFF] text-white border-[#007AFF] shadow-lg shadow-blue-500/30 scale-105" : "bg-white/50 dark:bg-white/5 border-transparent text-secondary"}`}>
                           <span className="text-[10px] font-bold uppercase opacity-80">{format(day, "EEE")}</span>
                           <span className="text-xl font-bold mt-1">{format(day, "d")}</span>
                           {hasEvent && <div className={`w-1 h-1 rounded-full mt-2 ${isSel ? "bg-white" : "bg-blue-500"}`} />}
                       </button>
                   )
                })}
            </div>
         </div>
         {/* Task List */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
             <h3 className="text-xs font-bold uppercase text-secondary tracking-wider mb-3 pl-1">{format(currentDate, "EEEE, MMMM do")}</h3>
             {selectedEvents.length > 0 ? (
                 selectedEvents.map(t => <CalendarTaskCard key={t.id} task={t} />)
             ) : (
                 <div className="flex flex-col items-center justify-center py-12 text-secondary opacity-50">
                    <Clock className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium text-sm">No tasks for this day</p>
                 </div>
             )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      
      {/* MOBILE RENDERER */}
      <div className="md:hidden h-full">
         <MobileView />
      </div>

      {/* DESKTOP RENDERER */}
      <div className="hidden md:flex flex-col h-full w-full relative mac-glass rounded-[32px] overflow-hidden">
         {/* Desktop Header */}
         <header className="flex items-center justify-between px-6 py-4 shrink-0 z-20 bg-white/40 dark:bg-black/20 backdrop-blur-md">
            <h2 className="text-2xl font-bold text-primary tracking-tight">
               {calendarView === "agenda" ? "Upcoming Agenda" : format(currentDate, "MMMM yyyy")}
            </h2>
            {calendarView !== "agenda" && (
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-full p-1 border border-black/5 dark:border-white/5 shadow-inner">
               <Button variant="ghost" onClick={() => navigate("prev")} className="!rounded-full w-8 h-8 !p-0"><ChevronLeft className="w-5 h-5" /></Button>
               <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="px-4 font-semibold text-xs rounded-full">Today</Button>
               <Button variant="ghost" onClick={() => navigate("next")} className="!rounded-full w-8 h-8 !p-0"><ChevronRight className="w-5 h-5" /></Button>
            </div>
            )}
         </header>

         {/* Desktop Content Area */}
         <div className="flex-1 overflow-hidden p-6 pt-2">
             <div className="w-full h-full bg-white/40 dark:bg-black/20 rounded-[24px] overflow-hidden flex flex-col border border-white/40 dark:border-white/5">
            
                {/* --- Month View --- */}
                {calendarView === "month" && (
                <div className="flex flex-col h-full w-full">
                    {/* Day Names Header */}
                    <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/30 dark:bg-white/5">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                            <div key={dayName} className="py-3 text-center text-xs font-bold uppercase text-secondary tracking-wider opacity-80">
                                {dayName}
                            </div>
                        ))}
                    </div>
                    
                    {/* The Grid */}
                    <div 
                        className="grid grid-cols-7 w-full h-full"
                        style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
                    >
                        {days.map((day, idx) => {
                            const dayKey = format(day, "yyyy-MM-dd");
                            const dayEvents = filteredEvents.filter((e) => e.date === dayKey);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isTodayDay = isToday(day);
                            
                            // Calculate border classes
                            const borderRight = (idx + 1) % 7 !== 0 ? 'border-r border-black/5 dark:border-white/5' : '';
                            const borderBottom = idx < days.length - 7 ? 'border-b border-black/5 dark:border-white/5' : '';
                            
                            return (
                                <div
                                    key={dayKey}
                                    onDrop={(e) => handleDrop && handleDrop(e, dayKey)}
                                    onDragOver={handleDragOver}
                                    onClick={() => onDateClick && onDateClick(dayKey)}
                                    className={`
                                    flex flex-col min-h-0 transition-all duration-200
                                    ${!isCurrentMonth ? "bg-black/5 dark:bg-white/5 backdrop-blur-[1px]" : "bg-transparent hover:bg-white/40 dark:hover:bg-white/10"}
                                    ${borderRight} ${borderBottom}
                                    `}
                                >
                                    {/* Date Number */}
                                    <div className="p-2 shrink-0 flex justify-center pt-3">
                                        <span className={`
                                            text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all
                                            ${isTodayDay 
                                                ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 scale-110" 
                                                : isCurrentMonth ? "text-primary" : "text-secondary opacity-50"}
                                        `}>
                                            {format(day, "d")}
                                        </span>
                                    </div>
                                    
                                    {/* Scrollable Event Area */}
                                    <div className="flex-1 overflow-y-auto px-1.5 pb-1 space-y-1 custom-scrollbar">
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
                <div className="flex h-full w-full">
                    {days.map((day, i) => (
                        <div key={day.toString()} className={`flex-1 min-w-[140px] flex flex-col h-full min-h-0 ${i !== 6 ? 'border-r border-black/5 dark:border-white/5' : ''}`}>
                            <div className={`p-4 border-b border-black/5 dark:border-white/5 text-center shrink-0 ${isToday(day) ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white/20 dark:bg-white/5"}`}>
                                <div className={`text-xs font-bold uppercase mb-1 ${isToday(day) ? "text-[#007AFF]" : "text-secondary"}`}>{format(day, "EEE")}</div>
                                <div className={`text-2xl font-bold ${isToday(day) ? "text-[#007AFF]" : "text-primary"}`}>{format(day, "d")}</div>
                            </div>
                            <div className={`flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar ${isToday(day) ? "bg-blue-50/20" : ""}`}>
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
                <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-end gap-4 mb-8 border-b border-black/5 dark:border-white/5 pb-4">
                            <h2 className="text-3xl font-bold text-primary">
                                {calendarView === 'day' ? format(currentDate, "EEEE, MMMM do") : "Agenda"}
                            </h2>
                            {calendarView === 'day' && <span className="text-secondary text-lg mb-1">{format(currentDate, "yyyy")}</span>}
                        </div>

                        <div className="space-y-8 pb-20 relative">
                            {/* Vertical line through entire timeline */}
                            <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-black/5 dark:bg-white/5 hidden md:block" />

                            {filteredEvents
                                .filter(e => calendarView === 'day' ? e.date === format(currentDate, "yyyy-MM-dd") : true)
                                .map(task => (
                                <div key={task.id} className="flex gap-8 items-start group">
                                    <div className="w-24 text-right pt-4 shrink-0 hidden md:block">
                                        <div className="text-sm font-bold text-primary">
                                            {format(parseISO(task.date), "MMM d")}
                                        </div>
                                        <div className="text-xs text-secondary font-medium mt-0.5">
                                            {task.time || "All Day"}
                                        </div>
                                    </div>
                                    
                                    {/* Timeline Dot */}
                                    <div className="relative flex flex-col items-center self-stretch hidden md:flex">
                                        <div className="w-4 h-4 rounded-full border-[3px] border-[#F2F2F7] dark:border-[#1c1c1e] bg-[#007AFF] shadow-lg shadow-blue-500/30 z-10 mt-5 transition-transform group-hover:scale-125 duration-300" />
                                    </div>

                                    <div className="flex-1 pb-2">
                                        <CalendarTaskCard task={task} />
                                    </div>
                                </div>
                                ))
                            }
                            {filteredEvents.length === 0 && (
                                <div className="text-center py-20 text-secondary italic">
                                    No events found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default CalendarView;