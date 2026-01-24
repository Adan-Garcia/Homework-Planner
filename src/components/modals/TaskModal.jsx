import React, { useState, useEffect } from "react";
import { Trash2, Save } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

const TaskModal = ({ requestDelete }) => {
  const { modals, closeModal, editingTask } = useUI();
  const { addEvent, updateEvent, deleteEvent, classColors } = useData();

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

  useEffect(() => {
    if (editingTask) {
      setFormData(editingTask);
    } else {
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
  }, [editingTask, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTask) {
      updateEvent({ ...editingTask, ...formData });
    } else {
      addEvent(formData);
    }
    closeModal("task");
  };

  // Logic: Use the prop if provided (ModalManager flow), otherwise direct (fallback)
  const handleDeleteClick = () => {
    if (!editingTask) return;
    
    if (requestDelete) {
      // Pass the actual delete ACTION as a callback to the manager
      requestDelete(() => deleteEvent(editingTask.id));
    } else {
      // Fallback if used outside ModalManager
      if (confirm("Are you sure?")) {
        deleteEvent(editingTask.id);
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
              {["Homework", "Exam", "Project", "Quiz", "Lab", "Reading"].map(t => (
                 <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

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