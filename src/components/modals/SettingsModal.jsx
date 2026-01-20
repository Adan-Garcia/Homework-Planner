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
import { UI_THEME } from "../../utils/constants";


import CollapsibleCard from "./reusable/CollapsibleCard";
import ClassManager from "./reusable/ClassManager";
import ImportContent from "./reusable/ImportContent";
import MergeContent from "./reusable/MergeContent";
import SyncRoomContent from "./reusable/SyncRoomContent";
import DateCleanerContent from "./reusable/DateCleanerContent";
import JsonEditorModal from "./reusable/JsonEditorModal";




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

          <div className={UI_THEME.BORDERS.DIVIDER} />

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

          <div className={UI_THEME.BORDERS.DIVIDER} />

          <div className="space-y-2">
            <button
              onClick={handleICSExport}
              className={`w-full py-2 ${UI_THEME.BUTTON.BASE_STYLE} ${UI_THEME.BUTTON.LINK_STYLE}`}
            >
              <Download className={UI_THEME.ICON.SIZE_SM} /> Export as ICS
            </button>
            <button
              onClick={resetAllData}
              className={`w-full py-2 ${UI_THEME.BUTTON.BASE_STYLE} ${UI_THEME.BUTTON.LINK_DANGER}`}
            >
              <LogOut className={UI_THEME.ICON.SIZE_SM} /> Reset All Data
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