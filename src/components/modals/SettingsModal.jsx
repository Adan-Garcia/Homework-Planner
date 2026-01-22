import React, { useState } from "react";
import { Settings, BookOpen, Database, RefreshCw, X } from "lucide-react";
import { useUI } from "../../context/PlannerContext";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

// Import your sub-components here (Ensure paths match your Step 1 cleanup)
import ClassManager from "../features/settings/ClassManager";
import ImportContent from "../features/settings/ImportContent";
import SyncRoomContent from "../features/settings/SyncRoomContent";
// If you haven't moved these yet, point to the old location or creating placeholders

const SettingsModal = () => {
  const { modals, closeModal } = useUI();
  const [activeTab, setActiveTab] = useState("classes");

  const tabs = [
    { id: "classes", label: "Classes & Colors", icon: BookOpen },
    { id: "data", label: "Data Management", icon: Database },
    { id: "sync", label: "Sync Room", icon: RefreshCw },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "classes": return <ClassManager />;
      case "data": return <ImportContent />; // Or a wrapper containing Import/Export/DateCleaner
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
        {/* Sidebar Navigation */}
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

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-divider">
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;