import React from "react";
import ClassRow from "./ClassRow";
import { UI_THEME } from "../../../utils/constants";

const ClassManager = ({
  classColors,
  setClassColors,
  onDeleteClass,
  onRenameClass,
}) => {
  return (
    <section>
      <h4 className={`mb-4 px-1 ${UI_THEME.TEXT.HEADING}`}>
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

export default ClassManager;