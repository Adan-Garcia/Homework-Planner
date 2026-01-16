import React, { useEffect } from "react";
import {
  Merge,
  ArrowRightLeft,
  Trash2,
  LogOut,
  Save,
  Download,
} from "lucide-react";
import Modal from "../ui/Modal";
import { useEvents } from "../../context/PlannerContext";

// Fix for potential import issue with react-simple-code-editor
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";

// Safely extract the component whether it's a default export or named export
const Editor = CodeEditor.default || CodeEditor;

const SettingsModal = ({
  isOpen,
  onClose,
  classColors,
  setClassColors,
  mergeSource,
  setMergeSource,
  mergeTarget,
  setMergeTarget,
  mergeClasses,
  deleteClass,
  resetAllData,
  showJsonEdit,
  setShowJsonEdit,
  jsonEditText,
  setJsonEditText,
  handleJsonSave,
  handleICSExport,
}) => {
  // Get events from context to populate the editor
  const { events } = useEvents();

  // Effect: Populate the JSON editor with current data when opened
  useEffect(() => {
    if (showJsonEdit) {
      setJsonEditText(JSON.stringify(events, null, 2));
    }
  }, [showJsonEdit, events, setJsonEditText]);

  return (
    <>
      {/* Main Settings Modal */}
      <Modal isOpen={isOpen} onClose={onClose} title="Data Management">
        <div className="space-y-8">
          <section className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-100 dark:border-slate-600">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Merge className="w-4 h-4 text-purple-500" /> Merge Classes
            </h4>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
              <select
                value={mergeSource}
                onChange={(e) => setMergeSource(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
              >
                <option value="">Merge from...</option>
                {Object.keys(classColors).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
              <ArrowRightLeft className="w-4 h-4 text-slate-400" />
              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
              >
                <option value="">Merge into...</option>
                {Object.keys(classColors)
                  .filter((c) => c !== mergeSource)
                  .map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={mergeClasses}
              disabled={!mergeSource || !mergeTarget}
              className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              Merge & Clean Up
            </button>
          </section>

          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
              Classes & Colors
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {Object.keys(classColors).map((cls) => (
                <div
                  key={cls}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm ring-2 ring-slate-100 cursor-pointer">
                      <input
                        type="color"
                        value={classColors[cls]}
                        onChange={(e) =>
                          setClassColors((prev) => ({
                            ...prev,
                            [cls]: e.target.value,
                          }))
                        }
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                      />
                    </div>
                    <span className="font-medium text-sm dark:text-slate-200">
                      {cls}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteClass(cls)}
                    className="text-slate-300 hover:text-red-500 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <button
              onClick={handleICSExport}
              className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export as ICS
            </button>
            <button
              onClick={resetAllData}
              className="w-full py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Reset All Data
            </button>
          </div>
        </div>
      </Modal>

      {/* JSON Editor Modal */}
      <Modal
        isOpen={showJsonEdit}
        onClose={() => setShowJsonEdit(false)}
        title="Raw Data Editor"
      >
        {/* ADDED: h-[500px] to force height and prevent collapse */}
        <div className="flex flex-col h-[500px]">
          <div className="flex-1 w-full border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
            <div className="absolute inset-0 overflow-auto custom-scrollbar">
              <Editor
                value={jsonEditText}
                onValueChange={(code) => setJsonEditText(code)}
                highlight={(code) =>
                  Prism.highlight(
                    code,
                    Prism.languages.json || Prism.languages.javascript,
                    "json"
                  )
                }
                padding={16}
                className="font-mono text-xs dark:text-slate-200"
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 12,
                  minHeight: "100%",
                }}
                textareaClassName="focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 shrink-0">
            <button
              onClick={() => setShowJsonEdit(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleJsonSave}
              className="px-6 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 font-bold shadow-md"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;