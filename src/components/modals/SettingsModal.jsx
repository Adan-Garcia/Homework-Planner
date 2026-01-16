import React, { useEffect, useRef, useState } from "react";
import {
  Merge,
  ArrowRightLeft,
  Trash2,
  LogOut,
  Save,
  Download,
  Upload,
  FileJson,
  FileCode,
  ChevronDown,
  CalendarX,
  Calendar
} from "lucide-react";
import Modal from "../ui/Modal";
import { useEvents } from "../../context/PlannerContext";

// --- Third Party Imports ---
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";

// Safely extract the component
const Editor = CodeEditor.default || CodeEditor;

// ==========================================
// Helper: Collapsible Card (Stateful & Adaptive)
// ==========================================
const CollapsibleCard = ({ title, icon: Icon, children, className = "" }) => {
  // RESTORED: Internal state for independence
  const [isOpen, setIsOpen] = useState(false);

  // LOGIC: Adjust min-width based on state
  // If Open: Wider (300px) to fit content.
  // If Closed: Narrower (200px) to fit more tiles in a row.
  const sizeClasses = isOpen 
    ? "min-w-[300px] ring-2 ring-blue-500/10 dark:ring-blue-400/10" 
    : "min-w-[200px]";

  return (
    <div 
      className={`
        bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-600 overflow-hidden 
        transition-all duration-300 ease-in-out flex-1
        ${sizeClasses}
        ${className}
      `}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 whitespace-nowrap">
          <Icon className={`w-4 h-4 ${isOpen ? 'text-blue-500' : 'text-slate-400'}`} /> 
          {title}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Using a grid transition trick for smooth height animation 
        (optional, but feels nicer with width changes)
      */}
      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-600/50">
            <div className="pt-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Sub-Component: Import Content
// ==========================================
const ImportContent = ({ onOpenJsonEditor, onCloseModal }) => {
  const { processICSContent, importJsonData } = useEvents();
  const icsInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const handleFileImport = async (e, processor, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = processor(text, true); // true = append
      if (result.success) {
        alert(`Successfully added ${result.count} events.`);
        onCloseModal();
      } else {
        alert(result.error || `Failed to parse ${fileType} file.`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to read file.");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        <input
          type="file"
          accept=".ics"
          ref={icsInputRef}
          className="hidden"
          onChange={(e) => handleFileImport(e, processICSContent, "ICS")}
        />
        <button
          onClick={() => icsInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors bg-slate-100 dark:bg-slate-700"
        >
          <Upload className="w-3 h-3" /> Add ICS
        </button>

        <input
          type="file"
          accept=".json"
          ref={jsonInputRef}
          className="hidden"
          onChange={(e) => handleFileImport(e, importJsonData, "JSON")}
        />
        <button
          onClick={() => jsonInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors bg-slate-100 dark:bg-slate-700"
        >
          <FileJson className="w-3 h-3" /> Add JSON
        </button>
      </div>

      <button
        onClick={onOpenJsonEditor}
        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 text-xs transition-colors"
      >
        <FileCode className="w-3 h-3" /> Edit Raw JSON
      </button>
      <p className="text-[10px] text-slate-400 text-center leading-tight">
        Files are added to existing schedule.
      </p>
    </div>
  );
};

// ==========================================
// Sub-Component: Merge Content
// ==========================================
const MergeContent = ({
  classOptions,
  source,
  setSource,
  target,
  setTarget,
  onMerge,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
        >
          <option value="">Merge from...</option>
          {classOptions.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
        
        <div className="flex justify-center">
            <ArrowRightLeft className="w-3 h-3 text-slate-400 rotate-90" />
        </div>

        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
        >
          <option value="">Merge into...</option>
          {classOptions
            .filter((c) => c !== source)
            .map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
        </select>
      </div>
      <button
        onClick={onMerge}
        disabled={!source || !target}
        className="w-full bg-purple-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
      >
        Merge Classes
      </button>
    </div>
  );
};

// ==========================================
// Sub-Component: Date Cleaner Content
// ==========================================
const DateCleanerContent = ({ onCloseModal }) => {
  const { events, importJsonData } = useEvents();
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");

  const handleDelete = (mode) => {
    const targetDate = mode === "before" ? beforeDate : afterDate;
    if (!targetDate) return;

    if (!window.confirm(`Are you sure you want to delete all events ${mode} ${targetDate}?`)) {
      return;
    }

    const targetTime = new Date(targetDate).getTime();
    const newEvents = {};
    let deletedCount = 0;

    Object.keys(events).forEach(dateKey => {
      const eventTime = new Date(dateKey).getTime();
      
      let shouldKeep = true;
      if (mode === "before" && eventTime < targetTime) shouldKeep = false;
      if (mode === "after" && eventTime > targetTime) shouldKeep = false;

      if (shouldKeep) {
        newEvents[dateKey] = events[dateKey];
      } else {
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      importJsonData(JSON.stringify(newEvents), false);
      alert(`Deleted events from ${deletedCount} days.`);
      onCloseModal();
    } else {
      alert("No events found in that range.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delete Before</label>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={beforeDate}
            onChange={(e) => setBeforeDate(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
          />
          <button
            onClick={() => handleDelete("before")}
            disabled={!beforeDate}
            className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg disabled:opacity-50 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delete After</label>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={afterDate}
            onChange={(e) => setAfterDate(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
          />
          <button
            onClick={() => handleDelete("after")}
            disabled={!afterDate}
            className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg disabled:opacity-50 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-400 text-center leading-tight pt-1">
        This action is permanent.
      </p>
    </div>
  );
};

// ==========================================
// Sub-Component: Class Manager
// ==========================================
const ClassManager = ({ classColors, setClassColors, onDeleteClass }) => {

  return (
    <section>
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 px-1">
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
              onClick={() => onDeleteClass(cls)}
              className="text-slate-300 hover:text-red-500 p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ==========================================
// Sub-Component: JSON Editor Modal
// ==========================================
const JsonEditorModal = ({ isOpen, onClose, text, setText, onSave }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raw Data Editor">
      <div className="flex flex-col h-[500px]">
        <div className="flex-1 w-full border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
          <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <Editor
              value={text}
              onValueChange={(code) => setText(code)}
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
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 font-bold shadow-md"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ==========================================
// Main Component: Settings Modal
// ==========================================
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
  const { events } = useEvents();

  
  useEffect(() => {
    if (showJsonEdit) {
      setJsonEditText(JSON.stringify(events, null, 2));
    }
  }, [showJsonEdit, events, setJsonEditText]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Data Management">
        <div className="space-y-6">

          <ClassManager
            classColors={classColors}
            setClassColors={setClassColors}
            onDeleteClass={deleteClass}
          />
          
          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Tools Grid using Flex-Wrap */}
          <div className="flex flex-wrap gap-4 align-top">
            
            <CollapsibleCard 
              title="Import Data" 
              icon={Upload}
            >
              <ImportContent 
                onOpenJsonEditor={() => setShowJsonEdit(true)} 
                onCloseModal={onClose}
              />
            </CollapsibleCard>

            <CollapsibleCard 
              title="Merge Classes" 
              icon={Merge}
            >
              <MergeContent
                classOptions={Object.keys(classColors)}
                source={mergeSource}
                setSource={setMergeSource}
                target={mergeTarget}
                setTarget={setMergeTarget}
                onMerge={mergeClasses}
              />
            </CollapsibleCard>

            <CollapsibleCard 
              title="Clean Dates" 
              icon={CalendarX}
            >
              <DateCleanerContent onCloseModal={onClose} />
            </CollapsibleCard>

          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          <div className="space-y-2">
            <button
              onClick={handleICSExport}
              className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Export as ICS
            </button>
            <button
              onClick={resetAllData}
              className="w-full py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Reset All Data
            </button>
          </div>
        </div>
      </Modal>

      <JsonEditorModal
        isOpen={showJsonEdit}
        onClose={() => setShowJsonEdit(false)}
        text={jsonEditText}
        setText={setJsonEditText}
        onSave={handleJsonSave}
      />
    </>
  );
};

export default SettingsModal;