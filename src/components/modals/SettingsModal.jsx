import React, { useState } from "react";
import PropTypes from "prop-types";
import { BookOpen, Database, RefreshCw, ChevronRight, Wrench, Server } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import Modal from "../ui/Modal";

import ClassManager from "../features/settings/ClassManager";
import ImportContent from "../features/settings/ImportContent";
import SyncRoomContent from "../features/settings/SyncRoomContent";
import DateCleanerContent from "../features/settings/DateCleanerContent";
import ApiConfigContent from "../features/settings/ApiConfigContent";

const SettingsModal = ({ 
  classColors,
  setClassColors,
  deleteClass,
  renameClass,
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
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "data", label: "Data", icon: Database },
    { id: "sync", label: "Sync", icon: RefreshCw },
    { id: "api", label: "API", icon: Server },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "classes": return (
        <ClassManager 
          classColors={classColors}
          setClassColors={setClassColors}
          onDeleteClass={deleteClass}
          onRenameClass={renameClass}
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
      case "api": return <ApiConfigContent />;
      case "tools": return (
        <div className="space-y-6">
            <div className="status-warning p-4 rounded-xl">
              <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                 <Wrench className="w-4 h-4"/> Maintenance
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-4 opacity-80">
                 Use these tools to clean up old data or optimize your storage.
              </p>
              <DateCleanerContent onCloseModal={() => closeModal("settings")} />
           </div>
        </div>
      );
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
       
        <aside className="w-full md:w-56 flex flex-col gap-1.5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  activeTab === tab.id 
                    ? "brand-accent-button text-white shadow-lg shadow-blue-500/20" 
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

        
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-black/5 dark:via-white/10 to-transparent mx-2" />

        
        <div className="flex-1 bg-white/40 dark:bg-black/20 rounded-[24px] p-6 border border-divider shadow-inner">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

SettingsModal.propTypes = {
  classColors: PropTypes.object.isRequired,
  setClassColors: PropTypes.func.isRequired,
  deleteClass: PropTypes.func.isRequired,
  renameClass: PropTypes.func.isRequired,
  mergeSource: PropTypes.string,
  setMergeSource: PropTypes.func.isRequired,
  mergeTarget: PropTypes.string,
  setMergeTarget: PropTypes.func.isRequired,
  mergeClasses: PropTypes.func.isRequired,
  resetAllData: PropTypes.func.isRequired,
  handleICSExport: PropTypes.func.isRequired,
  onOpenJsonEditor: PropTypes.func.isRequired,
  onRefreshColors: PropTypes.func.isRequired,
};

export default SettingsModal;