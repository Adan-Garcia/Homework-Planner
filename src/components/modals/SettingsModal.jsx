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
  Calendar,
  Edit2,
  Check,
  X,
  Users,
} from "lucide-react";
import Modal from "../ui/Modal";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";

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
  const [isOpen, setIsOpen] = useState(false);

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
          <Icon
            className={`w-4 h-4 ${isOpen ? "text-blue-500" : "text-slate-400"}`}
          />
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-600/50">
            <div className="pt-4">{children}</div>
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
  const { processICSContent, importJsonData } = useData();
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
// Sub-Component: Sync Room Content (MODIFIED)
// ==========================================
const SyncRoomContent = () => {
  const { roomId, setRoomId, isHost, peers, setRoomPassword, syncError } =
    useData();
  const { setView, closeModal } = useUI();

  const handleLeaveAndSetup = () => {
    setRoomId(null);
    setRoomPassword("");
    setView("setup");
    closeModal("settings");
  };

  const handleConnect = () => {
    setView("setup");
    closeModal("settings");
  };

  return (
    <div className="space-y-3">
      {syncError && (
        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded-lg">
          {syncError}
        </div>
      )}

      {roomId ? (
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                Active Room: {roomId}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isHost ? "bg-green-500" : "bg-blue-400"
                  }`}
                />
                <span>Role: {isHost ? "Host" : "Peer"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Peers connected: {peers ? peers.length : 0}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeaveAndSetup}
            className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <LogOut className="w-3 h-3" /> Leave & Switch Room
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            You are currently working offline. To create or join a multiplayer
            room, please return to the setup screen.
          </p>
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Go to Connection Setup
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Sub-Component: Date Cleaner Content
// ==========================================
const DateCleanerContent = ({ onCloseModal }) => {
  // FIX: Destructure deleteEvent instead of importJsonData
  const { events, deleteEvent } = useData();
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");

  const handleDelete = (mode) => {
    const targetDate = mode === "before" ? beforeDate : afterDate;
    if (!targetDate) return;

    // 1. Identify which events to delete
    const eventsToDelete = events.filter((ev) => {
      // Keep events without dates
      if (!ev.date) return false;

      // Delete if strictly before target date
      if (mode === "before") return ev.date < targetDate;

      // Delete if strictly after target date
      return ev.date > targetDate;
    });

    if (eventsToDelete.length === 0) {
      alert("No events found in that range.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${eventsToDelete.length} events ${mode} ${targetDate}?`,
      )
    ) {
      return;
    }

    // 2. Explicitly delete each event
    // This triggers the correct 'DELETE' sync action for each item
    eventsToDelete.forEach((ev) => {
      if (ev.id) deleteEvent(ev.id);
    });

    alert(`Deleted ${eventsToDelete.length} events.`);
    onCloseModal();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Delete Before
        </label>
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
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Delete After
        </label>
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
// Sub-Component: Class Row (Optimized for Lag Reduction)
// ==========================================
const ClassRow = ({ cls, color, onColorChange, onDelete, onRename }) => {
  const [localColor, setLocalColor] = useState(color);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(cls);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localColor !== color) {
        onColorChange(cls, localColor);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localColor, color, cls, onColorChange]);

  const handleSaveEdit = () => {
    if (editValue && editValue.trim() !== "" && editValue !== cls) {
      onRename(cls, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(cls);
  };

  return (
    <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg group">
      <div className="flex items-center gap-3 flex-1 ">
        <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden shadow-sm ring-2 ring-slate-100 cursor-pointer">
          <input
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
          />
        </div>

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 min-w-0 p-1 text-xs border border-slate-300 rounded dark:bg-slate-600 dark:border-slate-500 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-600 hover:bg-green-50 rounded dark:hover:bg-green-900/30"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span
            className="font-medium text-sm dark:text-slate-200 truncate flex-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={() => {
              setIsEditing(true);
              setEditValue(cls);
            }}
            title="Click to rename"
          >
            {cls}
          </span>
        )}
      </div>

      <div className="flex items-center shrink-0">
        {!isEditing && (
          <button
            onClick={() => {
              setIsEditing(true);
              setEditValue(cls);
            }}
            className="text-slate-300 hover:text-blue-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => onDelete(cls)}
          className="text-slate-300 hover:text-red-500 p-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Sub-Component: Class Manager
// ==========================================
const ClassManager = ({
  classColors,
  setClassColors,
  onDeleteClass,
  onRenameClass,
}) => {
  return (
    <section>
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 px-1">
        Classes & Colors
      </h4>
      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
        {Object.keys(classColors).map((cls) => (
          <ClassRow
            key={cls}
            cls={cls}
            color={classColors[cls]}
            onColorChange={(c, newColor) =>
              setClassColors((prev) => ({ ...prev, [c]: newColor }))
            }
            onDelete={onDeleteClass}
            onRename={onRenameClass}
          />
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
                  "json",
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
  const { events, renameClass } = useData();

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
            onRenameClass={renameClass}
          />

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Tools Grid using Flex-Wrap */}
          <div className="flex flex-wrap gap-4 align-top">
            <CollapsibleCard title="Import Data" icon={Upload}>
              <ImportContent
                onOpenJsonEditor={() => setShowJsonEdit(true)}
                onCloseModal={onClose}
              />
            </CollapsibleCard>

            <CollapsibleCard title="Sync Room" icon={Users}>
              <SyncRoomContent />
            </CollapsibleCard>

            <CollapsibleCard title="Merge Classes" icon={Merge}>
              <MergeContent
                classOptions={Object.keys(classColors)}
                source={mergeSource}
                setSource={setMergeSource}
                target={mergeTarget}
                setTarget={setMergeTarget}
                onMerge={mergeClasses}
              />
            </CollapsibleCard>

            <CollapsibleCard title="Clean Dates" icon={CalendarX}>
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
