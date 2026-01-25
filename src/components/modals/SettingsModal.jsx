import React, { useState } from "react";
import { BookOpen, Database, RefreshCw, ChevronRight } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import Modal from "../ui/Modal";

import ClassManager from "../features/settings/ClassManager";
import ImportContent from "../features/settings/ImportContent";
import SyncRoomContent from "../features/settings/SyncRoomContent";

const SettingsModal = ({ 
  classColors,
  setClassColors,
  deleteClass,
  mergeSource,
  setMergeSource,
  mergeTarget,
  setMergeTarget,
  mergeClasses,
  resetAllData,
  handleICSExport,
  onOpenJsonEditor,
  onRefreshColors, 
}) => {
  const { modals, closeModal } = useUI();
  const [activeTab, setActiveTab] = useState("classes");

  const tabs = [
    { id: "classes", label: "Classes", icon: BookOpen },
    { id: "data", label: "Data & Sync", icon: Database },
    { id: "sync", label: "Sync", icon: RefreshCw },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "classes": return (
        <ClassManager 
          classColors={classColors}
          setClassColors={setClassColors}
          onDeleteClass={deleteClass}
          onRefreshColors={onRefreshColors}
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
      <div className="flex flex-col md:flex-row gap-6 min-h-[450px]">
        {/* Sidebar - Mac Preferences Style */}
        <aside className="w-full md:w-56 flex flex-col gap-1.5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  activeTab === tab.id 
                    ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/20" 
                    : "text-secondary hover:bg-black/5 dark:hover:bg-white/10"
                }
              `}
            >
              <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? "bg-white/20" : "bg-transparent"}`}>
                  <tab.icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">{tab.label}</span>
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
          ))}
        </aside>

        {/* Vertical Divider for Desktop */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-black/5 dark:via-white/10 to-transparent mx-2" />

        {/* Content Area */}
        <div className="flex-1 bg-white/40 dark:bg-black/20 rounded-[24px] p-6 border border-white/40 dark:border-white/5 shadow-inner">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;