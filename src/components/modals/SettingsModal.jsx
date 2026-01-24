import React, { useState } from "react";
import { BookOpen, Database, RefreshCw } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

import ClassManager from "../features/settings/ClassManager";
import ImportContent from "../features/settings/ImportContent";
import SyncRoomContent from "../features/settings/SyncRoomContent";

const SettingsModal = ({ 
  // Class Props
  classColors,
  setClassColors,
  deleteClass,
  mergeSource,
  setMergeSource,
  mergeTarget,
  setMergeTarget,
  mergeClasses,
  
  // Data Props
  resetAllData,
  handleICSExport,
  onOpenJsonEditor,

  // New Prop from DataContext via ModalManager wrapper (or we can useData directly inside if we refactored, but sticking to prop drill for now)
  // Actually, SettingsModal is a child of ModalManager. 
  // We need to make sure ModalManager passes this prop or we assume ClassManager uses useData directly. 
  // Given previous architecture, we should update ModalManager or update SettingsModal to consume hook.
  // For consistency with previous file dumps, let's assume we pass it down.
  onRefreshColors, 
}) => {
  const { modals, closeModal } = useUI();
  const [activeTab, setActiveTab] = useState("classes");

  const tabs = [
    { id: "classes", label: "Classes & Colors", icon: BookOpen },
    { id: "data", label: "Data Management", icon: Database },
    { id: "sync", label: "Sync Room", icon: RefreshCw },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "classes": return (
        <ClassManager 
          classColors={classColors}
          setClassColors={setClassColors}
          onDeleteClass={deleteClass}
          onRefreshColors={onRefreshColors} // Pass it here
          mergeSource={mergeSource}
          setMergeSource={setMergeSource}
          mergeTarget={mergeTarget}
          setMergeTarget={setMergeTarget}
          onMerge={mergeClasses}
        />
      );
      case "data": return (
        <ImportContent 
           resetData={resetAllData}
           onExport={handleICSExport}
           onOpenJsonEditor={onOpenJsonEditor}
           onCloseModal={() => closeModal("settings")}
        />
      );
      case "sync": return <SyncRoomContent />;
      default: return null;
    }
  };

  return (
    <Modal
      isOpen={modals.settings}
      onClose={() => closeModal("settings")}
      title="Settings"
      size="xl"
    >
      <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
        <aside className="w-full md:w-48 flex flex-col gap-1 shrink-0">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`justify-start gap-3 ${
                activeTab === tab.id 
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold" 
                  : "text-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </aside>

        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-divider">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;