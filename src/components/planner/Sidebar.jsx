import React, { useMemo } from "react";
import {
  Search,
  Filter,
  AlertCircle,
  EyeOff,
  Eye,
  Check,
  CalendarDays,
  Edit,
  CheckCircle,
  Flag,
} from "lucide-react";
import { EVENT_TYPES } from "../../utils/constants";

const Sidebar = ({
  searchQuery,
  setSearchQuery,
  activeTypeFilter,
  setActiveTypeFilter,
  hiddenClasses,
  setHiddenClasses,
  classColors,
  filteredEvents,
  hideOverdue,
  setHideOverdue,
  handleDragStart,
  handleDragOver,
  handleSidebarDrop,
  toggleTask,
  openEditTaskModal,
  draggedEventId,
  showCompleted,
  setShowCompleted,
}) => {
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      completed: [],
    };

    // FIX 4: Updated Sort Logic (Priority > Time)
    const getPriorityWeight = (p) => {
      if (p === "High") return 3;
      if (p === "Medium") return 2;
      return 1;
    };

    const sortFn = (a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;

      // Sort by Priority (High to Low)
      const pA = getPriorityWeight(a.priority || "Medium");
      const pB = getPriorityWeight(b.priority || "Medium");
      if (pA !== pB) return pB - pA;

      // Handle All Day vs Timed
      if (!a.time && b.time) return -1;
      if (a.time && !b.time) return 1;
      if (!a.time && !b.time) return a.title.localeCompare(b.title);

      return a.time.localeCompare(b.time);
    };

    const active = filteredEvents.filter((t) => !t.completed).sort(sortFn);
    const done = filteredEvents
      .filter((t) => t.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    active.forEach((task) => {
      if (!task.date) return;
      const [y, m, d] = task.date.split("-").map(Number);
      const taskDate = new Date(y, m - 1, d);
      if (taskDate < today) groups.overdue.push(task);
      else if (taskDate.getTime() === today.getTime()) groups.today.push(task);
      else if (taskDate.getTime() === tomorrow.getTime())
        groups.tomorrow.push(task);
      else groups.upcoming.push(task);
    });

    if (showCompleted) {
      groups.completed = done;
    }

    return groups;
  }, [filteredEvents, showCompleted]);

  const getPriorityColor = (p) => {
    if (p === "High") return "text-red-500";
    if (p === "Medium") return "text-amber-500";
    return "text-slate-300";
  };

  return (
    <aside className="w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-300">
      <div className="p-4 pb-2 border-b border-slate-200 dark:border-slate-700 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none dark:text-white placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1 ${showCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-white dark:bg-slate-700 border dark:border-slate-600 dark:text-slate-400"}`}
          >
            <CheckCircle className="w-3 h-3" />{" "}
            {showCompleted ? "Hide Done" : "Show Done"}
          </button>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button
            onClick={() => setActiveTypeFilter("All")}
            className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap transition-colors ${activeTypeFilter === "All" ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-700 border dark:border-slate-600 dark:text-slate-200"}`}
          >
            All
          </button>
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTypeFilter(type)}
              className={`text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap transition-colors ${activeTypeFilter === type ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-700 border dark:border-slate-600 dark:text-slate-200"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pt-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
          Class Filter
        </h3>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
          <button
            onClick={() => setHiddenClasses([])}
            className={`text-xs px-2.5 py-1 rounded-md border dark:border-slate-600 transition-colors ${hiddenClasses.length === 0 ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-700 dark:text-slate-200"}`}
          >
            All
          </button>
          {Object.keys(classColors).map((cls) => (
            <button
              key={cls}
              onClick={() =>
                setHiddenClasses((prev) =>
                  prev.includes(cls)
                    ? prev.filter((c) => c !== cls)
                    : [...prev, cls],
                )
              }
              className={`text-xs px-2.5 py-1 rounded-md border dark:border-slate-600 flex items-center gap-1.5 transition-colors ${hiddenClasses.includes(cls) ? "opacity-50 dark:text-slate-400" : "bg-white dark:bg-slate-700 shadow-sm dark:text-slate-200"}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: classColors[cls] }}
              />
              {cls}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {Object.entries(groupedTasks).map(([groupName, tasks]) => {
          if (groupName === "overdue" && hideOverdue && tasks.length > 0)
            return (
              <div
                key={groupName}
                className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30"
              >
                <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> {tasks.length} Overdue
                </span>
                <button onClick={() => setHideOverdue(false)}>
                  <EyeOff className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            );
          if (tasks.length === 0) return null;

          const isDroppableHeader =
            groupName === "today" || groupName === "tomorrow";

          return (
            <div
              key={groupName}
              onDragOver={isDroppableHeader ? handleDragOver : undefined}
              onDrop={
                isDroppableHeader
                  ? (e) => handleSidebarDrop(e, groupName)
                  : undefined
              }
              className={
                isDroppableHeader
                  ? "rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 -m-1"
                  : ""
              }
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>
                  {groupName} ({tasks.length})
                </span>
                {groupName === "overdue" && (
                  <button onClick={() => setHideOverdue(true)}>
                    <Eye className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => openEditTaskModal(task)}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border dark:border-slate-700 cursor-pointer transition-all ${task.completed ? "bg-slate-50 dark:bg-slate-800/50 opacity-60" : "bg-white dark:bg-slate-800 shadow-sm hover:shadow-md dark:shadow-none dark:hover:bg-slate-750"} ${draggedEventId === task.id ? "opacity-50 ring-2 ring-blue-400" : ""}`}
                  >
                    <button
                      onClick={(e) => toggleTask(e, task.id)}
                      className={`mt-1 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400"}`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                          style={{ backgroundColor: classColors[task.class] }}
                        >
                          {task.class}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {task.type}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium dark:text-slate-200 leading-snug ${task.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
                        >
                          {task.title}
                        </p>
                        <Flag
                          className={`w-3 h-3 shrink-0 mt-0.5 ${getPriorityColor(task.priority)}`}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {task.date}
                        </p>
                        {task.time && (
                          <p className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">
                            {task.time}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                      <Edit className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
