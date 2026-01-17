import React, { useState, useEffect } from "react";
import { RefreshCw, Clock, Flag, Layers, AlignLeft } from "lucide-react";
import Modal from "../ui/Modal";
import { EVENT_TYPES } from "../../utils/constants";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import { addDaysToDate } from "../../utils/helpers";

const TaskModal = ({ requestDelete, saveTask }) => {
  // Accept props from App.jsx
  const { modals, closeModal, editingTask } = useUI();
  const { addEvent, updateEvent, classColors } = useData(); // Remove deleteEvent here, use prop

  const isOpen = modals.task;
  const onClose = () => closeModal("task");

  const [isAllDay, setIsAllDay] = useState(false);
  const [editScope, setEditScope] = useState("single");

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setIsAllDay(!editingTask.time);
        setEditScope("single");
      } else {
        setIsAllDay(false);
      }
    }
  }, [isOpen, editingTask]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTask ? "Edit Task" : "New Task"}
    >
      <form onSubmit={saveTask} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Title
          </label>
          <input
            required
            name="title"
            defaultValue={editingTask?.title}
            placeholder="e.g. Calculus Midterm"
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Date
            </label>
            <input
              required
              type="date"
              name="date"
              defaultValue={
                editingTask?.date || new Date().toISOString().split("T")[0]
              }
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
              <span>Time</span>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAllDay"
                  id="isAllDay"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-3 h-3 accent-blue-600 rounded"
                />
                <span
                  htmlFor="isAllDay"
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-bold"
                  onClick={() => setIsAllDay(!isAllDay)}
                >
                  All Day
                </span>
              </div>
            </label>
            <div className="relative">
              <input
                type="time"
                name="time"
                disabled={isAllDay}
                defaultValue={editingTask?.time}
                className={`w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm transition-opacity ${isAllDay ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}`}
              />
              {isAllDay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-500 font-medium italic">
                  All Day Event
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Class
            </label>
            <input
              list="classes-list"
              name="class"
              required
              defaultValue={editingTask?.class}
              placeholder="Select..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            />
            <datalist id="classes-list">
              {Object.keys(classColors).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Type
            </label>
            <select
              name="type"
              defaultValue={editingTask?.type || "Homework"}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Priority
            </label>
            <select
              name="priority"
              defaultValue={editingTask?.priority || "Medium"}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <AlignLeft className="w-3 h-3" /> Description
          </label>
          <textarea
            name="description"
            defaultValue={editingTask?.description}
            placeholder="Add notes, Zoom links, or details..."
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm min-h-[80px]"
          />
        </div>

        {!editingTask ? (
          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recurrence
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                name="recurrence"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-white"
              >
                <option value="none">No Repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
              </select>
              <input
                type="date"
                name="recurrenceEnd"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-white"
              />
            </div>
          </div>
        ) : (
          editingTask.groupId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Repeating Task
                </label>
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

        <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-700 mt-2">
          {editingTask && (
            <button
              type="button"
              onClick={() => requestDelete(editingTask.id)}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold"
            >
              Delete
            </button>
          )}
          <div className="flex-1"></div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md"
          >
            {editingTask ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
