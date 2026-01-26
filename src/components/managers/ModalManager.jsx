import React, { useState, useEffect } from "react";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";

import SettingsModal from "../modals/SettingsModal";
import TaskModal from "../modals/TaskModal";
import ConfirmationModal from "../modals/ConfirmationModal";
import ReLoginModal from "../features/auth/ReLoginModal";
import JsonEditorModal from "../features/settings/JsonEditorModal";

const ModalManager = () => {
  const { modals, closeModal, openModal, editingTask, view, setView } = useUI();
  
  const {
    events,
    classColors,
    setClassColors,
    deleteClass,
    mergeClasses,
    resetAllData,
    exportICS,
    importJsonData,
    deleteEvent, 
    refreshClassColors, 
  } = useData();

  const { roomId, roomPassword } = useAuth();
  
  
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [jsonEditText, setJsonEditText] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [isReloginOpen, setIsReloginOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDanger: false,
  });

  
  useEffect(() => {
    if (roomId && !roomPassword && !offlineMode) {
      setIsReloginOpen(true);
    } else {
      setIsReloginOpen(false);
    }
  }, [roomId, roomPassword, offlineMode]);

  const handleOpenJsonEditor = () => {
    setJsonEditText(JSON.stringify(events, null, 2));
    openModal("jsonEdit");
  };

  const handleJsonSave = () => {
    const result = importJsonData(jsonEditText, false); 
    if (result.success) {
      closeModal("jsonEdit");
      
      if (view === "setup") {
        setView("planner");
      }
    } else {
      alert(`Invalid JSON: ${result.error}`);
    }
  };

  const handleDeleteTaskConfirm = (deleteAction) => {
     setConfirmModal({
      isOpen: true,
      title: "Delete Task?",
      message: "Are you sure you want to delete this task? This cannot be undone.",
      isDanger: true,
      onConfirm: () => {
        deleteAction();
        closeModal("task");
      },
    });
  };

  const requestResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: "Reset All Data?",
      message: "This will permanently delete all tasks, classes, and settings from your device. If you are synced to a room, you might clear data for others too.",
      isDanger: true,
      onConfirm: () => {
        resetAllData();
        closeModal("settings");
      },
    });
  };

  return (
    <>
      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal("settings")}
        
        classColors={classColors}
        setClassColors={setClassColors}
        deleteClass={deleteClass}
        
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={() => {
          mergeClasses(mergeSource, mergeTarget);
          setMergeSource("");
          setMergeTarget("");
        }}

        resetAllData={requestResetData}
        handleICSExport={exportICS}
        onOpenJsonEditor={handleOpenJsonEditor}
        onRefreshColors={refreshClassColors} 
      />

      <JsonEditorModal 
        isOpen={modals.jsonEdit}
        onClose={() => closeModal("jsonEdit")}
        text={jsonEditText}
        setText={setJsonEditText}
        onSave={handleJsonSave}
      />

      <TaskModal
        requestDelete={handleDeleteTaskConfirm} 
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