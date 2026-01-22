import React, { useState, useEffect } from "react";
import { Trash2, Save } from "lucide-react";
import { useUI } from "../../context/PlannerContext"; // Fixed Import
import { useData } from "../../context/DataContext";    // Fixed Import
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

const TaskModal = () => {
  // 1. UI Context: Handles the Modal visibility and the "Editing" state
  const { 
    modals, 
    closeModal, 
    editingTask 
  } = useUI();

  // 2. Data Context: Handles the database operations
  const { 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    classColors 
  } = useData();

  // Helper: Get classes from the keys of the colors object
  const classes = Object.keys(classColors);
  const isOpen = modals.task;

  const [formData, setFormData] = useState({
    title: "",
    class: "",
    type: "Homework",
    date: "",
    time: "",
    priority: "Normal",
    description: "",
  });

  // Load data when editing
  useEffect(() => {
    if (editingTask) {
      setFormData(editingTask);
    } else {
      // Default to "Tomorrow" if creating new
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
      });
    }
  }, [editingTask, isOpen]); // removed 'classes' dependency to prevent loop reset

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTask) {
      // Ensure we keep the original ID when updating
      updateEvent({ ...editingTask, ...formData });
    } else {
      addEvent(formData);
    }
    closeModal("task");
  };

  const handleDelete = () => {
    if (editingTask && confirm("Are you sure you want to delete this task?")) {
      deleteEvent(editingTask.id);
      closeModal("task");
    }
  };

  // Footer Actions
  const footer = (
    <>
      {editingTask && (
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          className="mr-auto" // Pushes delete button to the left
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
        {/* Title */}
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Calculus Chapter 4"
          required
          autoFocus
        />

        {/* Grid for Class & Type */}
        <div className="grid grid-cols-2 gap-4">
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
              <option value="Homework">Homework</option>
              <option value="Exam">Exam</option>
              <option value="Project">Project</option>
              <option value="Quiz">Quiz</option>
            </select>
          </div>
        </div>

        {/* Grid for Date, Time, Priority */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Time (Optional)"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />
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

        {/* Description */}
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
      </form>
    </Modal>
  );
};

export default TaskModal;