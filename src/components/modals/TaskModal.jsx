import React, { useState, useEffect } from "react";
import { Trash2, Save, RefreshCw, Layers } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

/**
 * TaskModal Component
 * * The primary interface for creating and editing tasks.
 * * Handles both single-instance tasks and recurring series.
 * * Features:
 * 1. Mode Detection: Switches between "Create" and "Edit" modes based on `editingTask` prop.
 * 2. Recurrence: Logic for creating a repeating series of events (Weekly/Biweekly).
 * 3. Edit Scope: When editing a recurring task, allows user to update just "This Event" or "Entire Series".
 */
const TaskModal = ({ requestDelete }) => {
  const { modals, closeModal, editingTask } = useUI();
  const { addEvent, updateEvent, deleteEvent, classColors } = useData();

  const classes = Object.keys(classColors);
  const isOpen = modals.task;

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: "",
    class: "",
    type: "Homework",
    date: "",
    time: "",
    priority: "Normal",
    description: "",
    recurrence: "none",
    recurrenceEnd: "",
    groupId: null
  });

  // UI state for time input vs all-day toggle
  const [isAllDay, setIsAllDay] = useState(false);
  
  // Scope selection for editing recurring events ("single" vs "series")
  const [editScope, setEditScope] = useState("single");

  // --- Initialization ---
  useEffect(() => {
    if (editingTask) {
      // Edit Mode: Populate form with existing data
      
      setFormData({
        ...editingTask,
        title: editingTask.title || "",
        class: editingTask.class || (classes.length > 0 ? classes[0] : ""),
        type: editingTask.type || "Homework",
        date: editingTask.date || "",
        time: editingTask.time || "",
        priority: editingTask.priority || "Normal",
        description: editingTask.description || "",
        recurrence: editingTask.recurrence || "none",
        recurrenceEnd: editingTask.recurrenceEnd || "",
        groupId: editingTask.groupId || null
      });

      // Derive All-Day status from presence of time
      setIsAllDay(!editingTask.time);
      setEditScope("single");
    } else {
      // Create Mode: Default values
      // Default date is set to tomorrow for better UX
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        title: "",
        class: classes[0] || "",
        type: "Homework",
        date: tomorrow.toISOString().split("T")[0],
        time: "",
        priority: "Normal",
        description: "",
        recurrence: "none",
        recurrenceEnd: "",
        groupId: null
      });
      setIsAllDay(false);
    }
  }, [editingTask, isOpen]);

  // --- Submission Handler ---
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare final payload
    const finalData = { 
        ...formData,
        time: isAllDay ? "" : formData.time 
    };

    if (editingTask) {
      // Update existing
      // We pass `editScope` so DataContext knows whether to update siblings
      updateEvent({ 
          ...editingTask, 
          ...finalData,
          editScope 
      });
    } else {
      // Create new
      addEvent(finalData);
    }
    closeModal("task");
  };

  const handleDeleteClick = () => {
    if (!editingTask) return;
    
    // Determine deletion scope based on UI selection
    const shouldDeleteSeries = editScope === "series" && editingTask.groupId;

    if (requestDelete) {
      // Use the confirmation modal mechanism if provided
      requestDelete(() => deleteEvent(editingTask.id, shouldDeleteSeries, editingTask.groupId));
    } else {
      // Fallback to browser confirm
      if (confirm(`Are you sure you want to delete this ${shouldDeleteSeries ? 'series' : 'task'}?`)) {
        deleteEvent(editingTask.id, shouldDeleteSeries, editingTask.groupId);
        closeModal("task");
      }
    }
  };

  const footer = (
    <>
      {editingTask && (
        <Button 
          variant="danger" 
          onClick={handleDeleteClick} 
          className="mr-auto"
          icon={Trash2}
        >
          Delete
        </Button>
      )}
      <Button variant="ghost" onClick={() => closeModal("task")}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} icon={Save}>
        {editingTask ? "Save Changes" : "Create Task"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => closeModal("task")}
      title={editingTask ? "Edit Task" : "New Task"}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Calculus Chapter 4"
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Class</label>
            <select
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {classes.length > 0 ? (
                classes.map((c) => <option key={c} value={c}>{c}</option>)
              ) : (
                <option value="">No Classes Defined</option>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {["Homework", "Exam", "Project", "Quiz", "Lab", "Reading"].map(t => (
                 <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          
          {/* Time Input with All Day Toggle */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center">
                 <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Time</label>
                 <div className="flex items-center gap-1.5">
                    <input 
                        type="checkbox" 
                        id="allDay" 
                        checked={isAllDay} 
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="w-3 h-3 accent-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="allDay" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 cursor-pointer">All Day</label>
                 </div>
            </div>
            <div className="relative">
                <input
                    type="time"
                    value={formData.time}
                    disabled={isAllDay}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className={`
                        w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none 
                        ${isAllDay ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : "focus:ring-2 focus:ring-blue-500/20"}
                    `}
                />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className={`w-full p-2.5 rounded-lg border-input surface-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20 ${
                formData.priority === "High" ? "text-red-500 font-bold" : "text-input"
              }`}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
            placeholder="Add details, links, or notes..."
          />
        </div>

        {/* Recurrence Settings (Create Mode) */}
        {!editingTask ? (
           <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600/50 space-y-3">
               <div className="flex items-center gap-2">
                   <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recurrence</label>
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <select
                        value={formData.recurrence}
                        onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-white outline-none"
                   >
                       <option value="none">No Repeat</option>
                       <option value="weekly">Weekly</option>
                       <option value="biweekly">Every 2 Weeks</option>
                   </select>
                   <input 
                        type="date"
                        value={formData.recurrenceEnd}
                        onChange={(e) => setFormData({ ...formData, recurrenceEnd: e.target.value })}
                        disabled={formData.recurrence === 'none'}
                        className={`w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-white outline-none ${formData.recurrence === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                   />
               </div>
           </div>
        ) : (
            // Edit Scope (Edit Mode for Series)
            editingTask.groupId && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Repeating Task</label>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-medium dark:text-slate-300 cursor-pointer">
                            <input 
                                type="radio" 
                                name="editScope" 
                                value="single" 
                                checked={editScope === "single"}
                                onChange={() => setEditScope("single")}
                                className="accent-amber-500"
                            />
                            This Event Only
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium dark:text-slate-300 cursor-pointer">
                            <input 
                                type="radio" 
                                name="editScope" 
                                value="series" 
                                checked={editScope === "series"}
                                onChange={() => setEditScope("series")}
                                className="accent-amber-500"
                            />
                            Entire Series
                        </label>
                    </div>
                </div>
            )
        )}
      </form>
    </Modal>
  );
};

export default TaskModal;