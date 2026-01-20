import React from "react";
import { ArrowRightLeft } from "lucide-react";
import { UI_THEME } from "../../../utils/constants";

const MergeContent = ({
  classOptions,
  source,
  setSource,
  target,
  setTarget,
  onMerge,
}) => {
  const selectClass = `w-full p-2 text-xs rounded-lg ${UI_THEME.BORDERS.INPUT} ${UI_THEME.SURFACE.INPUT} ${UI_THEME.TEXT.INPUT_TEXT}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={selectClass}
        >
          <option value="">Merge from...</option>
          {classOptions.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        <div className="flex justify-center">
          <ArrowRightLeft className={`${UI_THEME.ICON.SIZE_XS} ${UI_THEME.ICON.COLOR_INACTIVE} rotate-90`} />
        </div>

        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={selectClass}
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
        className={`w-full py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${UI_THEME.BUTTON.PRIMARY_ACCENT}`}
      >
        Merge Classes
      </button>
    </div>
  );
};

export default MergeContent;