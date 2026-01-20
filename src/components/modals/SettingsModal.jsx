import React, { useEffect } from "react";
import {
  Merge,
  Upload,
  CalendarX,
  Users,
  Download,
  LogOut,
} from "lucide-react";

import Modal from "../ui/Modal";
import { useData } from "../../context/DataContext";

import CollapsibleCard from "../ui/CollapsibleCard";
import ClassManager from "../features/settings/ClassManager";
import ImportContent from "../features/settings/ImportContent";
import MergeContent from "../features/settings/MergeContent";
import SyncRoomContent from "../features/settings/SyncRoomContent";
import DateCleanerContent from "../features/settings/DateCleanerContent";
import JsonEditorModal from "../features/settings/JsonEditorModal";

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

          <div className="border-divider" />

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

          <div className="border-divider" />

          <div className="space-y-2">
            <button
              onClick={handleICSExport}
              className="w-full py-2 btn-base btn-link"
            >
              <Download className="icon-sm" /> Export as ICS
            </button>
            <button
              onClick={resetAllData}
              className="w-full py-2 btn-base btn-link-danger"
            >
              <LogOut className="icon-sm" /> Reset All Data
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