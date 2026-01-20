import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Type,
  AlertCircle,
  Repeat,
  AlignLeft,
  BookOpen,
} from "lucide-react";
import { EVENT_TYPES } from "../../utils/constants";

const TaskForm = ({ editingTask, classColors, onSubmit, id }) => {
  const [isRecurring, setIsRecurring] = useState(
    !!editingTask?.recurrence
  );

  // Helper for input classes
  const inputGroupClass = "space-y-1.5";
  const labelClass = "text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5";
  const inputClass = "w-full p-2.5 rounded-lg border-input surface-input text-input text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none";
  const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat pr-8`;

  return (
    <form id={id} onSubmit={onSubmit} className="space-y-5">
      {/* Title Input */}
      <div className={inputGroupClass}>
        <label className={labelClass}>Task Title</label>
        <input
          name="title"
          defaultValue={editingTask?.title || ""}
          placeholder="e.g., Calculus Midterm"
          className={inputClass}
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Class Selection */}
        <div className={inputGroupClass}>
          <label className={labelClass}>
            <BookOpen className="w-3 h-3" /> Class
          </label>
          <select
            name="class"
            defaultValue={editingTask?.class || ""}
            className={selectClass}
            required
          >
            <option value="" disabled>Select Class</option>
            {Object.keys(classColors).map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {/* Type Selection */}
        <div className={inputGroupClass}>
          <label className={labelClass}>
            <Type className="w-3 h-3" /> Type
          </label>
          <select
            name="type"
            defaultValue={editingTask?.type || "Homework"}
            className={selectClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date Input */}
        <div className={inputGroupClass}>
          <label className={labelClass}>
            <Calendar className="w-3 h-3" /> Due Date
          </label>
          <input
            type="date"
            name="date"
            defaultValue={editingTask?.date || new Date().toISOString().split("T")[0]}
            className={inputClass}
            required
          />
        </div>

        {/* Time Input */}
        <div className={inputGroupClass}>
          <label className={labelClass}>
            <Clock className="w-3 h-3" /> Time
          </label>
          <div className="flex gap-2">
            <input
              type="time"
              name="time"
              defaultValue={editingTask?.time || ""}
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>
        </div>
      </div>

      {/* Priority & Recurrence Toggles */}
      <div className="p-3 rounded-lg border-base surface-card flex items-center justify-between">
        <div className="flex items-center gap-4">
           {/* Priority Toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              name="priority"
              value="High"
              defaultChecked={editingTask?.priority === "High"}
              className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500/20"
            />
            <span className="text-xs font-medium text-primary group-hover:text-blue-600 transition-colors flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> High Priority
            </span>
          </label>

          {/* Recurrence Toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500/20"
            />
            <span className="text-xs font-medium text-primary group-hover:text-blue-600 transition-colors flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" /> Repeat
            </span>
          </label>
        </div>
      </div>

      {/* Recurrence Options (Conditional) */}
      {isRecurring && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Repeat className="w-3 h-3" /> Recurrence Settings
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] text-secondary">Frequency</label>
               <select name="recurrenceRule" className={selectClass}>
                 <option value="weekly">Weekly</option>
                 <option value="biweekly">Bi-Weekly</option>
                 <option value="monthly">Monthly</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[10px] text-secondary">Duration (Weeks)</label>
               <input 
                 type="number" 
                 name="recurrenceWeeks" 
                 defaultValue="1" 
                 min="1" 
                 max="52" 
                 className={inputClass} 
               />
             </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className={inputGroupClass}>
        <label className={labelClass}>
          <AlignLeft className="w-3 h-3" /> Description
        </label>
        <textarea
          name="description"
          defaultValue={editingTask?.description || ""}
          rows="3"
          className={`${inputClass} resize-none`}
          placeholder="Add details, links, or notes..."
        />
      </div>
    </form>
  );
};

export default TaskForm;