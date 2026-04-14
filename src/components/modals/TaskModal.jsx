import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Trash2, Save, RefreshCw, Layers, Plus } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import { useNotification } from "../../context/NotificationContext";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { sanitizeInput } from "../../utils/helpers";
import { MAX_TASK_TITLE_LENGTH, MAX_TASK_DESCRIPTION_LENGTH, PALETTE } from "../../utils/constants";

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
  const { addEvent, updateEvent, deleteEvent, classColors, setClassColors } = useData();
  const notify = useNotification();

  const classes = useMemo(() => Object.keys(classColors), [classColors]);
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

  // State for inline new-class creation
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const newClassInputRef = useRef(null);

  // --- Initialization ---
  // Use a ref to track initialization instead of state to avoid triggering re-renders
  const initRef = useRef({ isOpen: false, taskId: null });

  useEffect(() => {
    // Only initialize when modal opens or when editing a different task
    const taskId = editingTask?.id || null;
    const shouldInitialize = isOpen && (
      !initRef.current.isOpen || 
      initRef.current.taskId !== taskId
    );

    if (!isOpen) {
      initRef.current.isOpen = false;
      initRef.current.taskId = null;
      return;
    }

    if (!shouldInitialize) return;

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

    initRef.current.isOpen = true;
    initRef.current.taskId = taskId;
  }, [editingTask, isOpen]);
  
  // Separate effect to update class if it becomes invalid (classes array changed)
  useEffect(() => {
    if (formData.class && classes.length > 0 && !classes.includes(formData.class)) {
      setFormData(prev => ({ ...prev, class: classes[0] }));
    }
  }, [classes, formData.class]);

  // --- Memoized Change Handlers ---
  const handleTitleChange = useCallback((e) => {
    if (e.target.value.length <= MAX_TASK_TITLE_LENGTH) {
      setFormData(prev => ({ ...prev, title: e.target.value }));
    }
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    if (e.target.value.length <= MAX_TASK_DESCRIPTION_LENGTH) {
      setFormData(prev => ({ ...prev, description: e.target.value }));
    }
  }, []);

  const handleClassChange = useCallback((e) => {
    if (e.target.value === "__new_class__") {
      setIsAddingClass(true);
      setNewClassName("");
      // Focus the input after React renders it
      setTimeout(() => newClassInputRef.current?.focus(), 50);
      return;
    }
    setFormData(prev => ({ ...prev, class: e.target.value }));
  }, []);

  const handleAddNewClass = useCallback(() => {
    const name = newClassName.trim();
    if (!name || name.length < 2) {
      notify.error("Class name must be at least 2 characters");
      return;
    }
    if (classColors[name]) {
      // Class already exists, just select it
      setFormData(prev => ({ ...prev, class: name }));
      setIsAddingClass(false);
      setNewClassName("");
      return;
    }
    if (!/^[\w\s\-]{2,64}$/.test(name)) {
      notify.error("Use letters, numbers, spaces, or dashes (2-64 chars)");
      return;
    }
    // Add new class with next palette color and sync via DataContext
    const colorIndex = Object.keys(classColors).length;
    const newColor = PALETTE[colorIndex % PALETTE.length];
    setClassColors({ ...classColors, [name]: newColor });
    setFormData(prev => ({ ...prev, class: name }));
    setIsAddingClass(false);
    setNewClassName("");
  }, [newClassName, classColors, notify, setClassColors]);

  const handleTypeChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, type: e.target.value }));
  }, []);

  const handleDateChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
  }, []);

  const handleTimeChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, time: e.target.value }));
  }, []);

  const handlePriorityChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, priority: e.target.value }));
  }, []);

  const handleRecurrenceChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, recurrence: e.target.value }));
  }, []);

  const handleRecurrenceEndChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, recurrenceEnd: e.target.value }));
  }, []);

  const handleAllDayChange = useCallback((e) => {
    setIsAllDay(e.target.checked);
  }, []);

  const handleEditScopeChange = useCallback((value) => {
    setEditScope(value);
  }, []);

  // --- Submission Handler ---
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title?.trim()) {
      notify.error("Task title is required");
      return;
    }
    
    // Validate title length
    if (formData.title.length > MAX_TASK_TITLE_LENGTH) {
      notify.error(`Title cannot exceed ${MAX_TASK_TITLE_LENGTH} characters (currently ${formData.title.length})`);
      return;
    }
    
    // Validate description length
    if (formData.description && formData.description.length > MAX_TASK_DESCRIPTION_LENGTH) {
      notify.error(`Description cannot exceed ${MAX_TASK_DESCRIPTION_LENGTH} characters (currently ${formData.description.length})`);
      return;
    }
    
    if (!formData.date) {
      notify.error("Task date is required");
      return;
    }
    
    if (formData.recurrence !== "none") {
      if (!formData.recurrenceEnd) {
        notify.error("Recurrence end date is required for recurring events");
        return;
      }
      // Validate that recurrence end is after start date
      if (formData.recurrenceEnd <= formData.date) {
        notify.error("Recurrence end date must be after start date");
        return;
      }
    }
    
    // Prepare final payload with sanitized inputs
    const finalData = { 
        ...formData,
        title: sanitizeInput(formData.title),
        description: sanitizeInput(formData.description),
        time: isAllDay ? "" : formData.time 
    };

    if (editingTask?.id) {
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
  }, [formData, isAllDay, editingTask, editScope, notify, updateEvent, addEvent, closeModal]);

  const handleDeleteClick = useCallback(() => {
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
  }, [editingTask, editScope, requestDelete, deleteEvent, closeModal]);

  const handleCloseModal = useCallback(() => {
    closeModal("task");
  }, [closeModal]);

  const footer = useMemo(() => (
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
      <Button variant="ghost" onClick={handleCloseModal}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} icon={Save}>
        {editingTask ? "Save Changes" : "Create Task"}
      </Button>
    </>
  ), [editingTask, handleDeleteClick, handleCloseModal, handleSubmit]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={editingTask ? "Edit Task" : "New Task"}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Input
            id="task-title-input"
            label="Task Title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="e.g. Calculus Chapter 4"
            required
            autoFocus
            aria-label="Task title"
            aria-required="true"
          />
          <div className="flex justify-between items-center">
            <span className={`text-xs ${
              formData.title.length > MAX_TASK_TITLE_LENGTH * 0.9 
                ? 'text-red-600 dark:text-red-400 font-semibold' 
                : 'text-secondary'
            }`}>
              {formData.title.length}/{MAX_TASK_TITLE_LENGTH} characters
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Class</label>
            {isAddingClass ? (
              <div className="flex items-center gap-2">
                <input
                  ref={newClassInputRef}
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddNewClass(); }
                    if (e.key === "Escape") { setIsAddingClass(false); setNewClassName(""); }
                  }}
                  placeholder="Class name..."
                  maxLength={64}
                  className="flex-1 p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-label="New class name"
                />
                <button
                  type="button"
                  onClick={handleAddNewClass}
                  className="p-2.5 rounded-lg btn-primary transition-colors"
                  aria-label="Confirm new class"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingClass(false); setNewClassName(""); }}
                  className="p-2.5 rounded-lg text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Cancel new class"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={formData.class}
                onChange={handleClassChange}
                className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Select class"
                aria-required="true"
              >
                {classes.length > 0 ? (
                  classes.map((c) => <option key={c} value={c}>{c}</option>)
                ) : (
                  <option value="">No Classes Defined</option>
                )}
                <option value="__new_class__">+ Create new class...</option>
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Type</label>
            <select
              value={formData.type}
              onChange={handleTypeChange}
              className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Select task type"
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
            onChange={handleDateChange}
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
                        onChange={handleAllDayChange}
                    className="w-3 h-3 accent-[#007AFF] rounded cursor-pointer"
                    />
                  <label htmlFor="allDay" className="text-[10px] font-bold brand-accent-text cursor-pointer">All Day</label>
                 </div>
            </div>
            <div className="relative">
                <input
                    type="time"
                    value={formData.time}
                    disabled={isAllDay}
                    pattern="[0-9]{2}:[0-9]{2}"
                    onChange={handleTimeChange}
                    className={`
                        w-full p-2.5 rounded-lg border-input surface-input text-input text-sm outline-none 
                      ${isAllDay ? "opacity-50 cursor-not-allowed bg-black/5 dark:bg-white/5" : "focus:ring-2 focus:ring-blue-500/20"}
                    `}
                />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Priority</label>
            <select
              value={formData.priority}
              onChange={handlePriorityChange}
              className={`w-full p-2.5 rounded-lg border-input surface-input text-sm outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    formData.priority === "High" ? "text-red-600 dark:text-red-400 font-bold" : "text-input"
              }`}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-description-textarea" className="text-[10px] font-bold uppercase tracking-wider text-secondary">Description</label>
          <textarea
            id="task-description-textarea"
            rows={3}
            value={formData.description}
            onChange={handleDescriptionChange}
            className="w-full p-2.5 rounded-lg border-input surface-input text-input text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
            placeholder="Add details, links, or notes..."
            aria-label="Task description"
          />
          <div className="flex justify-between items-center">
            <span className={`text-xs ${
              formData.description.length > MAX_TASK_DESCRIPTION_LENGTH * 0.9 
                ? 'text-red-600 dark:text-red-400 font-semibold' 
                : 'text-secondary'
            }`}>
              {formData.description.length}/{MAX_TASK_DESCRIPTION_LENGTH} characters
            </span>
          </div>
        </div>

        {/* Recurrence Settings (Create Mode) */}
        {!editingTask ? (
           <div className="status-info p-3 rounded-xl space-y-3">
               <div className="flex items-center gap-2">
               <RefreshCw className="w-3.5 h-3.5 text-secondary" />
               <label className="text-xs font-bold text-secondary uppercase tracking-wider">Recurrence</label>
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <select
                        value={formData.recurrence}
                        onChange={handleRecurrenceChange}
                 className="w-full p-2 rounded-lg surface-input text-input text-xs outline-none"
                   >
                       <option value="none">No Repeat</option>
                       <option value="weekly">Weekly</option>
                       <option value="biweekly">Every 2 Weeks</option>
                   </select>
                   <input 
                        type="date"
                        value={formData.recurrenceEnd}
                        onChange={handleRecurrenceEndChange}
                        disabled={formData.recurrence === 'none'}
                 className={`w-full p-2 rounded-lg surface-input text-input text-xs outline-none ${formData.recurrence === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                   />
               </div>
           </div>
        ) : (
            // Edit Scope (Edit Mode for Series)
            editingTask.groupId && (
            <div className="status-warning p-3 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <label className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Repeating Task</label>
                    </div>
                    <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
                            <input 
                                type="radio" 
                                name="editScope" 
                                value="single" 
                                checked={editScope === "single"}
                                onChange={() => handleEditScopeChange("single")}
                    className="accent-amber-500"
                            />
                            This Event Only
                        </label>
                <label className="flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer">
                            <input 
                                type="radio" 
                                name="editScope" 
                                value="series" 
                                checked={editScope === "series"}
                                onChange={() => handleEditScopeChange("series")}
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

TaskModal.propTypes = {
  requestDelete: PropTypes.func,
};

export default React.memo(TaskModal);