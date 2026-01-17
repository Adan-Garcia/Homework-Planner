import React, { useRef } from "react";
import {
  Upload,
  Download,
  Moon,
  Sun,
  Trash2,
  RefreshCw,
  X,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { useUI } from "../../context/PlannerContext"; // UI State (Theme, Modals)
import { useData } from "../../context/DataContext"; // Data Actions (Import/Export/Reset)

const SettingsModal = () => {
  const { darkMode, setDarkMode, closeModal, modals } = useUI();

  const { importJsonData, exportICS, resetAllData, processICSContent } =
    useData();

  const fileInputRef = useRef(null);
  const icsInputRef = useRef(null);

  if (!modals.settings) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = importJsonData(text);
    if (!result.success) alert(result.error);
    else {
      alert("Data imported successfully!");
      closeModal("settings");
    }
  };

  const handleICSUEpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = processICSContent(text);
    if (!result.success) alert(result.error);
    else {
      alert(`Successfully imported ${result.count} events!`);
      closeModal("settings");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"} w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw size={20} /> Settings
          </h2>
          <button
            onClick={() => closeModal("settings")}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Appearance */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Appearance
            </h3>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                darkMode
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon className="text-indigo-400" />
                ) : (
                  <Sun className="text-amber-500" />
                )}
                <span className="font-medium">Dark Mode</span>
              </div>
              <div
                className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? "bg-indigo-500" : "bg-gray-300"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"}`}
                />
              </div>
            </button>
          </section>

          {/* Data Management */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Data Management
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all gap-2"
              >
                <FileJson className="text-blue-500" />
                <span className="text-sm font-medium">Import JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />

              <button
                onClick={exportICS}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all gap-2"
              >
                <Download className="text-green-500" />
                <span className="text-sm font-medium">Export ICS</span>
              </button>
            </div>

            <button
              onClick={() => icsInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <Upload size={18} /> Import from Calendar (.ics)
            </button>
            <input
              type="file"
              ref={icsInputRef}
              onChange={handleICSUEpload}
              accept=".ics"
              className="hidden"
            />
          </section>

          {/* Danger Zone */}
          <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">
              Danger Zone
            </h3>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure? This will delete all local data.",
                  )
                ) {
                  resetAllData();
                  closeModal("settings");
                }
              }}
              className="w-full flex items-center justify-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={20} />
              <div className="text-left">
                <div className="font-bold">Reset Application</div>
                <div className="text-xs opacity-75">
                  Clear all events and settings
                </div>
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
