import React, { useMemo } from "react";
import { Check, Clock, Calendar, AlertCircle, GripVertical } from "lucide-react";
import { format, isToday, isTomorrow, isPast, isSameDay, parseISO } from "date-fns";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

const Sidebar = ({
  // Data
  filteredEvents,
  classColors,
  toggleTask,
  openEditTaskModal,

  // Filters
  searchQuery,
  setSearchQuery,
  activeTypeFilter,
  setActiveTypeFilter,
  showCompleted,
  setShowCompleted,
  hideOverdue,
  setHideOverdue,

  // Drag & Drop
  draggedEventId,
  handleDragStart,
  handleDragOver,
  handleSidebarDrop,
}) => {
  
  // --- Grouping Logic (Preserved) ---
  const groupedTasks = useMemo(() => {
    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
    };
    const today = new Date();
    filteredEvents.forEach((task) => {
      if (!task.date) return;
      const taskDate = parseISO(task.date);
      if (task.completed && !showCompleted) return;
      if (!task.completed && isPast(taskDate) && !isToday(taskDate)) {
        groups.overdue.push(task);
      } else if (isToday(taskDate)) {
        groups.today.push(task);
      } else if (isTomorrow(taskDate)) {
        groups.tomorrow.push(task);
      } else {
        groups.upcoming.push(task);
      }
    });
    return groups;
  }, [filteredEvents, showCompleted]);

  // --- Render Helpers ---
  const TaskItem = ({ task }) => (
    <Card
      hoverable={!task.completed}
      draggable={!task.completed}
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={() => openEditTaskModal(task)}
      className={`
        relative flex items-start gap-3 p-3 transition-all cursor-pointer group
        ${
          task.completed
            ? "bg-slate-50 border-transparent opacity-60"
            : "hover:border-blue-300 dark:hover:border-blue-700"
        }
        ${draggedEventId === task.id ? "opacity-40 ring-2 ring-blue-400" : ""}
      `}
    >
      {/* Checkbox: Kept as standard button for specific micro-interaction sizing */}
      <button
        onClick={(e) => toggleTask(e, task.id)}
        className={`
          mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0
          ${
            task.completed
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-slate-300 dark:border-slate-500 hover:border-blue-400"
          }
        `}
      >
        {task.completed && <Check className="w-3.5 h-3.5" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: classColors[task.class] || "#cbd5e1" }}
          />
          <span
            className={`text-xs font-bold truncate ${
              task.completed ? "text-slate-400 line-through" : "text-primary"
            }`}
          >
            {task.class}
          </span>
          {task.time && (
            <span className="text-[10px] text-secondary ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.time}
            </span>
          )}
        </div>
        
        <p className={`text-sm leading-tight mb-1 ${task.completed ? "text-secondary line-through" : "text-primary"}`}>
          {task.title}
        </p>
        
        <div className="flex items-center gap-2 text-[10px] text-secondary">
           <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50">
             {task.type}
           </span>
           {task.priority === "High" && (
             <span className="text-red-500 font-medium">High Priority</span>
           )}
        </div>
      </div>

      {/* Drag Handle */}
      {!task.completed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-400 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
    </Card>
  );

  const DropZone = ({ title, groupKey, icon: Icon, items, isDanger }) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleSidebarDrop(e, groupKey)}
      className="flex flex-col gap-2"
    >
      <div className={`flex items-center justify-between px-1 ${isDanger ? "text-red-500" : "text-secondary"}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Icon className="w-4 h-4" />
          {title}
          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded-full text-[10px]">
            {items.length}
          </span>
        </div>
      </div>
      
      <div className={`flex flex-col gap-2 min-h-[50px] rounded-xl transition-colors ${draggedEventId ? "bg-slate-50/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700" : ""}`}>
        {items.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full py-4 text-xs text-muted italic">
            No tasks
          </div>
        )}
      </div>
    </div>
  );

  return (
    <aside className="w-80 border-r border-divider bg-white dark:bg-slate-900 flex flex-col h-full shrink-0">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-divider space-y-3">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border-none"
        />
        
        <div className="flex gap-2">
          {/* Native Select (Simple enough to keep native for now) */}
          <select
            value={activeTypeFilter}
            onChange={(e) => setActiveTypeFilter(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border-none text-secondary outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <option value="All">All Types</option>
            <option value="Homework">Homework</option>
            <option value="Exam">Exam</option>
            <option value="Project">Project</option>
          </select>

          <Button
            onClick={() => setShowCompleted(!showCompleted)}
            variant={showCompleted ? "ghost" : "secondary"}
            className={`
              !px-3 !py-1.5 
              ${showCompleted 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "text-slate-500"
              }
            `}
          >
            Done
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {(!hideOverdue && groupedTasks.overdue.length > 0) && (
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
        />

        <DropZone 
          title="Tomorrow" 
          groupKey="tomorrow" 
          icon={Calendar} 
          items={groupedTasks.tomorrow} 
        />

        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary px-1">
              <Calendar className="w-4 h-4" />
              Upcoming
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded-full text-[10px]">
                {groupedTasks.upcoming.length}
              </span>
           </div>
           <div className="flex flex-col gap-2">
              {groupedTasks.upcoming.map(task => <TaskItem key={task.id} task={task} />)}
           </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;