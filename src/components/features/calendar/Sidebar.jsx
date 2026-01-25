import React, { useMemo } from "react";
import { Check, Clock, Calendar, AlertCircle, GripVertical, X, Filter, Circle } from "lucide-react";
import { isToday, isTomorrow, isPast, parseISO } from "date-fns";
import Input from "../../ui/Input";
import Button from "../../ui/Button"; 
import { useUI } from "../../../context/PlannerContext"; 

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
  draggedEventId,
  handleDragStart,
  handleDragOver,
  handleSidebarDrop,
}) => {
  
  const { mobileMenuOpen, setMobileMenuOpen } = useUI(); 

  const groupedTasks = useMemo(() => {
    const groups = { overdue: [], today: [], tomorrow: [], upcoming: [] };
    
    // Guard clause in case filteredEvents is null/undefined during initial load
    if (!filteredEvents || !Array.isArray(filteredEvents)) return groups;

    filteredEvents.forEach((task) => {
      if (!task.date) return;
      // Safety check for date string validity
      let taskDate;
      try {
        taskDate = parseISO(task.date);
      } catch (e) {
        return;
      }
      
      // If hiding completed tasks globally, skip
      if (task.completed && !showCompleted) return;

      const isTaskOverdue = isPast(taskDate) && !isToday(taskDate);
      
      // Logic Fix:
      // 1. Overdue: Only show if NOT completed (and strictly past)
      // 2. Today: Show regardless of completion (if showCompleted is true)
      // 3. Tomorrow: Show regardless of completion
      // 4. Upcoming: Show regardless of completion, BUT exclude past completed tasks that might slip through

      if (isTaskOverdue) {
        if (!task.completed) {
           groups.overdue.push(task);
        }
        // If it is overdue AND completed, we implicitly hide it from 'overdue' group.
        // And we must ensure it doesn't fall through to 'upcoming'.
        return; 
      }
      
      if (isToday(taskDate)) {
        groups.today.push(task);
      } else if (isTomorrow(taskDate)) {
        groups.tomorrow.push(task);
      } else {
        // This is the upcoming bucket (future dates beyond tomorrow)
        // Since we already handled 'isTaskOverdue' (past dates), this block implies future dates.
        // So we can safely push here.
        groups.upcoming.push(task);
      }
    });
    return groups;
  }, [filteredEvents, showCompleted]);

  // --- Task Item Component ---
  const TaskItem = ({ task }) => (
    <div
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={() => openEditTaskModal(task)}
      className={`
        group relative flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer border
        ${task.completed 
            ? "opacity-50 bg-black/5 dark:bg-white/5 border-transparent blur-[0.5px]" 
            : "bg-white/60 dark:bg-white/5 border-white/40 dark:border-white/5 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-white/10 hover:-translate-y-0.5"
        }
        ${draggedEventId === task.id ? "opacity-30 ring-2 ring-blue-400 rotate-2 scale-95" : ""}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
             e.stopPropagation();
             toggleTask(e, task.id);
        }}
        className={`
          mt-0.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 shrink-0
          ${task.completed
              ? "bg-[#34C759] border-[#34C759] text-white scale-100 rotate-0"
              : "border-slate-300 dark:border-slate-500 hover:border-[#34C759] text-transparent scale-95 group-hover:scale-100"
          }
        `}
      >
        <Check className="w-3 h-3 stroke-[4]" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
           <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: classColors?.[task.class] || "#cbd5e1" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary truncate opacity-80">
                    {task.class}
                </span>
           </div>
           {task.time && (
            <span className="text-[10px] font-medium text-secondary flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
              {task.time}
            </span>
           )}
        </div>
        
        <p className={`text-sm font-medium leading-snug transition-colors ${task.completed ? "text-secondary line-through" : "text-primary"}`}>
          {task.title}
        </p>
        
        <div className="flex items-center gap-2 mt-2">
           <span className="text-[10px] text-secondary font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
             {task.type}
           </span>
           {task.priority === "High" && !task.completed && (
             <span className="text-[10px] text-red-600 bg-red-100/50 dark:bg-red-500/20 px-2 py-0.5 rounded-full font-bold">
                High
             </span>
           )}
           {/* Show repeating icon if needed, though data might not have it explicitly here unless grouped */}
        </div>
      </div>
      
      {!task.completed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-300 cursor-grab active:cursor-grabbing md:block hidden p-2">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  // Default items to empty array to prevent crash reading .length of undefined
  const DropZone = ({ title, groupKey, icon: Icon, items = [], isDanger, accentColor = "text-slate-500" }) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleSidebarDrop(e, groupKey)}
      className="flex flex-col gap-3"
    >
      <div className={`flex items-center justify-between px-2 ${isDanger ? "text-red-500" : "text-secondary"}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Icon className={`w-4 h-4 ${isDanger ? "text-red-500" : accentColor}`} />
          {title}
        </div>
        <span className="bg-black/5 dark:bg-white/10 text-secondary px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            {items ? items.length : 0}
        </span>
      </div>
      
      <div className={`flex flex-col gap-3 min-h-[20px] transition-all rounded-3xl ${draggedEventId ? "p-3 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800" : ""}`}>
        {items && items.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {(!items || items.length === 0) && (
          <div className="text-center py-6 text-xs text-slate-300 dark:text-slate-600 italic">
            No tasks
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
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
        {/* Header */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              className={`!px-4 !py-1.5 border border-transparent !rounded-xl ${showCompleted ? "bg-[#34C759]/10 text-[#34C759]" : "text-secondary bg-black/5 dark:bg-white/5"}`}
            >
              Done
            </Button>
          </div>

          {/* RESTORED: Class Filters */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => setHiddenClasses([])}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                  hiddenClasses.length === 0 
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" 
                    : "bg-white/50 dark:bg-white/5 text-secondary border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10"
                }`}
              >
                All
              </button>
              {classColors && Object.keys(classColors).map((cls) => (
                <button
                  key={cls}
                  onClick={() =>
                    setHiddenClasses((prev) =>
                      prev.includes(cls)
                        ? prev.filter((c) => c !== cls)
                        : [...prev, cls]
                    )
                  }
                  className={`
                    text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all
                    ${hiddenClasses.includes(cls) 
                        ? "opacity-50 grayscale bg-transparent border border-transparent text-secondary" 
                        : "bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-sm hover:bg-white dark:hover:bg-white/10"
                    }
                  `}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: classColors[cls] }}
                  />
                  {cls}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Task List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8 pb-32 mask-gradient-b">
          
          {(!hideOverdue && groupedTasks.overdue && groupedTasks.overdue.length > 0) && (
            <DropZone 
              title="Overdue" 
              groupKey="overdue"
              icon={AlertCircle} 
              items={groupedTasks.overdue} 
              isDanger 
            />
          )}

          <DropZone 
            title="Today" 
            groupKey="today" 
            icon={Clock} 
            items={groupedTasks.today} 
            accentColor="text-blue-500"
          />

          <DropZone 
            title="Tomorrow" 
            groupKey="tomorrow" 
            icon={Calendar} 
            items={groupedTasks.tomorrow}
            accentColor="text-purple-500" 
          />

          <DropZone 
            title="Upcoming"
            groupKey="upcoming"
            icon={Calendar}
            items={groupedTasks.upcoming}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;