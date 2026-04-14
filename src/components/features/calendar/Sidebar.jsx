import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { format, parse } from "date-fns";
import { Check, Clock, Calendar, AlertCircle, GripVertical, X, Filter, Circle, ChevronDown, Plus } from "lucide-react";
import { isToday, isTomorrow, isPast, parseISO } from "date-fns";
import Input from "../../ui/Input";
import Button from "../../ui/Button"; 
import { useUI } from "../../../context/PlannerContext"; 
import { useDragDrop } from "../../../context/DragDropContext";
import { useData } from "../../../context/DataContext";
import { PALETTE } from "../../../utils/constants";


const TaskItem = ({ task, toggleTask, openEditTaskModal, classColors }) => {
  const { draggedEventId, handleDragStart } = useDragDrop();

  // Helper to format time in 12-hour format
  const get12HourTime = (timeStr) => {
    if (!timeStr) return '';
    // Try parsing as HH:mm or H:mm
    let parsed;
    try {
      parsed = parse(timeStr, 'HH:mm', new Date());
      if (isNaN(parsed)) parsed = parse(timeStr, 'H:mm', new Date());
      if (isNaN(parsed)) return timeStr; // fallback
      return format(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  // Concatenated event name: Class: Title
  const eventName = `${task.class ? task.class + ': ' : ''}${task.title}`;

  return (
    <div
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={() => openEditTaskModal(task)}
      role="button"
      tabIndex={0}
      aria-label={`${eventName}, ${task.type}, ${task.completed ? 'completed' : 'incomplete'}${task.time ? `, due at ${get12HourTime(task.time)}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEditTaskModal(task);
        }
      }}
      className={`
        group relative flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer border
        ${task.completed 
            ? "opacity-50 bg-black/5 dark:bg-white/5 border-transparent blur-[0.5px]" 
            : "bg-white/60 dark:bg-white/5 border-white/40 dark:border-white/5 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-white/10 hover:-translate-y-0.5"
        }
        ${draggedEventId === task.id ? "opacity-30 ring-2 ring-blue-400 rotate-2 scale-95" : ""}
      `}
    >
      
      <button
        onClick={(e) => {
             e.stopPropagation();
             toggleTask(e, task.id);
        }}
        aria-label={task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
        className={`
          mt-0.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 shrink-0
          ${task.completed
              ? "success-check-on scale-100 rotate-0"
              : "success-check-off scale-95 group-hover:scale-100"
          }
        `}
      >
        <Check className="w-3 h-3 stroke-[4]" />
      </button>

      
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
           <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: classColors?.[task.class] || "#cbd5e1" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary truncate opacity-80">
                    {task.class}
                </span>
           </div>
           {task.time && (
            <span className="text-[10px] font-medium text-secondary flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full flex-shrink-0 max-w-full">
              {get12HourTime(task.time)}
            </span>
           )}
        </div>
        
        <p className={`text-sm font-medium leading-snug transition-colors ${task.completed ? "text-secondary line-through" : "text-primary"}`}>
          {eventName}
        </p>
        
        <div className="flex items-center gap-2 mt-2">
           <span className="text-[10px] text-secondary font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-divider">
             {task.type}
           </span>
           {task.priority === "High" && !task.completed && (
             <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-500/20 px-2 py-0.5 rounded-full font-bold">
                High
             </span>
           )}
        </div>
      </div>
      
      {!task.completed && (
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-secondary cursor-grab active:cursor-grabbing md:block hidden p-2"
          aria-label="Drag to reschedule"
          role="img"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};


const DropZone = ({ 
  title, 
  groupKey, 
  icon,
  items = [], 
  isDanger, 
  accentColor = "text-secondary",
  toggleTask,
  openEditTaskModal,
  classColors
}) => {
  // Icon is used in JSX below
  const SectionIcon = icon;
  const { draggedEventId, handleDragOver, handleSidebarDrop } = useDragDrop();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleSidebarDrop(e, groupKey)}
      className="flex flex-col gap-2"
      role="region"
      aria-label={`${title} tasks section`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title} section with ${items ? items.length : 0} tasks`}
        aria-expanded={isOpen}
        className={`
            flex items-center justify-between px-2 py-1.5 -mx-2 rounded-xl transition-colors group select-none
            hover:bg-white/40 dark:hover:bg-white/5 
            ${isDanger ? "text-red-500" : "text-secondary"}
        `}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <SectionIcon className={`w-4 h-4 ${isDanger ? "text-red-500" : accentColor}`} />
          {title}
        </div>
        <div className="flex items-center gap-2">
            <span className={`
                px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors
                ${isDanger 
                  ? "status-error !py-0.5 !px-2.5 !rounded-full !shadow-none text-[10px]" 
                  : "bg-black/5 dark:bg-white/10 text-secondary"
                }
            `}>
                {items ? items.length : 0}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
        </div>
      </button>

      {/* Task List (Expandable, Scrollable) */}
      <div className={`
        flex flex-col gap-3 transition-all duration-300 origin-top
        ${isOpen ? "opacity-100 max-h-[350px] overflow-y-auto overflow-x-hidden" : "opacity-0 max-h-0 overflow-hidden"}
        ${draggedEventId ? "min-h-[20px] rounded-3xl" : ""}
        ${draggedEventId && isOpen ? "p-3 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800" : ""}
        custom-scrollbar
      `}>
        {items && items.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            toggleTask={toggleTask}
            openEditTaskModal={openEditTaskModal}
            classColors={classColors}
          />
        ))}
        {(!items || items.length === 0) && isOpen && (
          <div className="text-center py-4 text-xs text-secondary/50 italic">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
};


/**
 * Sidebar Component
 * * Displays the "Inbox" / List view of tasks, grouped by urgency.
 * * Functionality:
 * 1. Filtering: Search, Type, Completed status, Class (via pills).
 * 2. Grouping: Automatically sorts tasks into Overdue, Today, Tomorrow, Upcoming.
 * 3. Drag & Drop Target: Tasks can be dropped here to reschedule them.
 */
const Sidebar = ({
  filteredEvents = [],
  classColors = {},
  toggleTask,
  openEditTaskModal,
  searchQuery,
  setSearchQuery,
  activeTypeFilter,
  setActiveTypeFilter,
  hiddenClasses = [],
  setHiddenClasses = () => {},
  showCompleted,
  setShowCompleted,
  hideOverdue,
}) => {
  // Local state for search debounce
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);
  
  const { mobileMenuOpen, setMobileMenuOpen } = useUI(); 
  const { setClassColors: setClassColorsCtx } = useData();

  // Quick-add class state
  const [isAddingClassInline, setIsAddingClassInline] = useState(false);
  const [inlineClassName, setInlineClassName] = useState("");
  const inlineClassInputRef = useRef(null);

  const handleInlineAddClass = useCallback(() => {
    const name = inlineClassName.trim();
    if (!name || name.length < 2) return;
    if (classColors[name]) {
      // Already exists, just unhide it if hidden
      setHiddenClasses(prev => prev.filter(c => c !== name));
      setIsAddingClassInline(false);
      setInlineClassName("");
      return;
    }
    if (!/^[\w\s-]{2,64}$/.test(name)) return;
    const colorIndex = Object.keys(classColors).length;
    const newColor = PALETTE[colorIndex % PALETTE.length];
    setClassColorsCtx({ ...classColors, [name]: newColor });
    setIsAddingClassInline(false);
    setInlineClassName("");
  }, [inlineClassName, classColors, setClassColorsCtx, setHiddenClasses]);

  // --- Task Grouping Logic ---
  const groupedTasks = useMemo(() => {
    const groups = { overdue: [], today: [], tomorrow: [], upcoming: [] };
    
    // Safety check for empty data
    if (!filteredEvents || !Array.isArray(filteredEvents)) return groups;

    filteredEvents.forEach((task) => {
      if (!task.date) return;
      
      let taskDate;
      try {
        taskDate = parseISO(task.date);
      } catch {
        return;
      }
      
      // Filter out completed tasks if not showing them
      if (task.completed && !showCompleted) return;

      const isTaskOverdue = isPast(taskDate) && !isToday(taskDate);
      
      // Sort Logic:
      // 1. Overdue: Past date & Not completed.
      // 2. Today: Matches current system date.
      // 3. Tomorrow: Current system date + 1 day.
      // 4. Upcoming: Everything else.
      
      if (isTaskOverdue) {
        if (!task.completed) {
           groups.overdue.push(task);
        }
        return; // Don't show completed overdue tasks in 'overdue' (they disappear or go to archive logic)
      }
      
      if (isToday(taskDate)) {
        groups.today.push(task);
      } else if (isTomorrow(taskDate)) {
        groups.tomorrow.push(task);
      } else {
        groups.upcoming.push(task);
      }
    });
    return groups;
  }, [filteredEvents, showCompleted]);

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div 
        className={`fixed inset-0 z-[40] bg-black/30 backdrop-blur-md transition-opacity duration-500 md:hidden ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside 
        className={`
          /* Card Style for both Desktop and Mobile */
          mac-glass flex flex-col shrink-0 overflow-hidden
          transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          
          /* Mobile: Drawer - Starts BELOW Header (top-20) */
          fixed top-20 bottom-4 left-4 z-[50] w-[calc(100%-2rem)] max-w-xs rounded-[32px] shadow-2xl md:shadow-none
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-[150%]"}
          
          /* Desktop: Floating Panel */
          md:relative md:inset-auto md:translate-x-0 md:w-80 md:h-full md:rounded-[32px]
        `}
      >
        {/* Sidebar Header: Controls & Filters */}
        <div className="p-5 pb-2 space-y-4 bg-white/40 dark:bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center justify-between md:hidden">
            <h3 className="font-bold text-lg text-primary">Tasks</h3>
            <Button variant="ghost" onClick={() => setMobileMenuOpen(false)} className="!p-1 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
             <Input
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="mac-input-glass !rounded-xl !pl-9"
             />
             <Filter className="absolute left-3 top-3 w-4 h-4 text-secondary opacity-50" />
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 group">
                <select
                value={activeTypeFilter}
                onChange={(e) => setActiveTypeFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl text-xs font-medium mac-input-glass text-secondary outline-none cursor-pointer appearance-none transition-all group-hover:bg-white/60 dark:group-hover:bg-white/20"
                >
                <option value="All">All Types</option>
                <option value="Homework">Homework</option>
                <option value="Exam">Exam</option>
                <option value="Project">Project</option>
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none">
                    <Circle className="w-3 h-3 fill-current text-secondary opacity-50" />
                </div>
            </div>

            <Button
              onClick={() => setShowCompleted(!showCompleted)}
              variant="ghost"
              className={`!px-4 !py-1.5 border border-transparent !rounded-xl ${showCompleted ? "success-pill-active" : "text-secondary bg-black/5 dark:bg-white/5"}`}
            >
              Done
            </Button>
          </div>

          {/* Class Filter Pills */}
          <div className="pt-2 border-t border-divider pointer-events-auto">
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHiddenClasses([]);
                }}
                title="Show all classes"
                className={`pointer-events-auto cursor-pointer text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  hiddenClasses.length === 0 
                    ? "brand-gradient-bg text-white shadow-sm" 
                    : "bg-white/50 dark:bg-white/5 text-secondary border border-divider hover:bg-white hover:text-slate-900 dark:hover:bg-white/20 dark:hover:text-slate-900"
                }`}
              >
                All
              </button>
              {classColors && Object.keys(classColors).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHiddenClasses((prev) =>
                      prev.includes(cls)
                        ? prev.filter((c) => c !== cls)
                        : [...prev, cls]
                    );
                  }}
                  title={hiddenClasses.includes(cls) ? `Show ${cls}` : `Hide ${cls}`}
                  className={`
                    pointer-events-auto text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer
                    ${hiddenClasses.includes(cls) 
                        ? "opacity-50 grayscale bg-transparent border border-transparent text-secondary hover:opacity-70" 
                        : "bg-white/50 dark:bg-white/5 border border-divider shadow-sm hover:bg-white hover:text-slate-900 dark:hover:bg-white/20 dark:hover:text-slate-900"
                    }
                  `}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: classColors[cls] }}
                  />
                  {cls}
                </button>
              ))}
              {/* Quick-add class button */}
              {isAddingClassInline ? (
                <div className="flex items-center gap-1 pointer-events-auto">
                  <input
                    ref={inlineClassInputRef}
                    type="text"
                    value={inlineClassName}
                    onChange={(e) => setInlineClassName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInlineAddClass();
                      if (e.key === "Escape") { setIsAddingClassInline(false); setInlineClassName(""); }
                    }}
                    onBlur={() => {
                      // Small delay to allow click on confirm button
                      setTimeout(() => {
                        if (!inlineClassName.trim()) {
                          setIsAddingClassInline(false);
                          setInlineClassName("");
                        }
                      }, 150);
                    }}
                    placeholder="Class name..."
                    maxLength={64}
                    className="w-24 px-2 py-0.5 text-[10px] rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/10 text-primary placeholder:text-secondary/50 outline-none focus:ring-2 focus:ring-blue-500/30"
                    aria-label="New class name"
                  />
                  <button
                    type="button"
                    onClick={handleInlineAddClass}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg brand-accent-button transition-colors"
                    aria-label="Confirm new class"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingClassInline(false); setInlineClassName(""); }}
                    className="text-[10px] text-secondary hover:text-primary px-1 py-0.5 transition-colors"
                    aria-label="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAddingClassInline(true);
                    setTimeout(() => inlineClassInputRef.current?.focus(), 50);
                  }}
                  title="Add a new class"
                  className="pointer-events-auto cursor-pointer text-[10px] font-bold px-2 py-1 rounded-lg transition-all whitespace-nowrap bg-white/50 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 text-secondary hover:bg-white dark:hover:bg-white/10 brand-accent-hover flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-32 mask-gradient-b">
          
          {(!hideOverdue && groupedTasks.overdue && groupedTasks.overdue.length > 0) && (
            <DropZone 
              title="Overdue" 
              groupKey="overdue"
              icon={AlertCircle} 
              items={groupedTasks.overdue} 
              isDanger 
              toggleTask={toggleTask}
              openEditTaskModal={openEditTaskModal}
              classColors={classColors}
            />
          )}

          <DropZone 
            title="Today" 
            groupKey="today" 
            icon={Clock} 
            items={groupedTasks.today} 
            accentColor="text-blue-500"
            toggleTask={toggleTask}
            openEditTaskModal={openEditTaskModal}
            classColors={classColors}
          />

          <DropZone 
            title="Tomorrow" 
            groupKey="tomorrow" 
            icon={Calendar} 
            items={groupedTasks.tomorrow}
            accentColor="text-purple-500"
            toggleTask={toggleTask}
            openEditTaskModal={openEditTaskModal}
            classColors={classColors}
          />

          <DropZone 
            title="Upcoming"
            groupKey="upcoming"
            icon={Calendar}
            items={groupedTasks.upcoming}
            toggleTask={toggleTask}
            openEditTaskModal={openEditTaskModal}
            classColors={classColors}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;