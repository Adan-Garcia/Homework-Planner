import React, { useState, useEffect } from "react";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";

import SettingsModal from "../modals/SettingsModal";
import TaskModal from "../modals/TaskModal";
import ConfirmationModal from "../modals/ConfirmationModal";
import ReLoginModal from "../features/auth/ReLoginModal";

const ModalManager = () => {
  const { modals, closeModal, openModal, editingTask } = useUI();
  
  const {
    classColors,
    setClassColors,
    deleteClass,
    mergeClasses,
    resetAllData,
    exportICS,
    importJsonData,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useData();

  const { roomId, roomPassword } = useAuth();

  // --- Local State for Modal Operations ---
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [jsonEditText, setJsonEditText] = useState("");
  
  // Auth State
  const [offlineMode, setOfflineMode] = useState(false);
  const [isReloginOpen, setIsReloginOpen] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDanger: false,
  });

  // --- Effects ---
  
  // Handle ReLogin Visibility
  useEffect(() => {
    if (roomId && !roomPassword && !offlineMode) {
      setIsReloginOpen(true);
    } else {
      setIsReloginOpen(false);
    }
  }, [roomId, roomPassword, offlineMode]);

  // --- Handlers ---

  const handleJsonSave = () => {
    if (importJsonData(jsonEditText).success) {
      closeModal("jsonEdit");
    }
  };

  const handleTaskSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const isAllDay = formData.get("isAllDay") === "on";
    
    const baseTask = {
      title: formData.get("title"),
      time: isAllDay ? "" : formData.get("time"),
      class: formData.get("class"),
      type: formData.get("type"),
      priority: formData.get("priority") || "Medium",
      description: formData.get("description") || "",
      completed: editingTask ? editingTask.completed : false,
    };
    
    const startDate = formData.get("date");
    
    if (editingTask) {
      updateEvent({
        ...baseTask,
        date: startDate,
        id: editingTask.id,
        groupId: editingTask.groupId,
      });
    } else {
      addEvent({
        ...baseTask,
        date: startDate,
        id: `manual-${Date.now()}`,
        groupId: null,
      });
    }
    closeModal("task");
  };

  const requestDeleteTask = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Task?",
      message: "Are you sure you want to delete this task? This cannot be undone.",
      isDanger: true,
      onConfirm: () => {
        deleteEvent(id);
        closeModal("task");
      },
    });
  };

  return (
    <>
      <SettingsModal
        isOpen={modals.settings || modals.jsonEdit}
        onClose={() => {
          closeModal("settings");
          closeModal("jsonEdit");
        }}
        classColors={classColors}
        setClassColors={setClassColors}
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={() => {
          mergeClasses(mergeSource, mergeTarget);
          setMergeSource("");
          setMergeTarget("");
        }}
        deleteClass={deleteClass}
        resetAllData={resetAllData}
        showJsonEdit={modals.jsonEdit}
        setShowJsonEdit={(val) =>
          val ? openModal("jsonEdit") : closeModal("jsonEdit")
        }
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
        handleICSExport={exportICS}
      />

      <TaskModal
        isOpen={modals.task}
        onClose={() => closeModal("task")}
        editingTask={editingTask}
        saveTask={handleTaskSave}
        requestDelete={requestDeleteTask}
        classColors={classColors}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      <ReLoginModal
        isOpen={isReloginOpen}
        onClose={() => setIsReloginOpen(false)}
        onOffline={() => {
          setOfflineMode(true);
          setIsReloginOpen(false);
        }}
      />
    </>
  );
};

export default ModalManager;