import React from "react";
import { Trash2, Save, X } from "lucide-react";
import Modal from "../ui/Modal";
import TaskForm from "../features/tasks/TaskForm";

const TaskModal = ({
  isOpen,
  onClose,
  editingTask,
  saveTask,
  requestDelete,
  classColors,
}) => {
  
  const FORM_ID = "task-form-main";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? "Edit Task" : "New Task"}
    >
      
      <div className="overflow-y-auto custom-scrollbar p-1">
        <TaskForm
          id={FORM_ID}
          editingTask={editingTask}
          classColors={classColors}
          onSubmit={saveTask}
        />
      </div>

      
      <div className="flex items-center justify-between pt-6 mt-2 border-t border-divider">
        {editingTask ? (
          <button
            type="button"
            onClick={() => requestDelete(editingTask.id)}
            className="btn-base btn-danger-soft"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        ) : (
          <div /> /* Spacer */
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            form={FORM_ID}
            type="submit"
            className="px-6 py-2 rounded-lg text-sm font-bold btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Task
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskModal;