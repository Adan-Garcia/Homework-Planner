import React from "react";
import { RefreshCw } from "lucide-react";
import ClassRow from "./ClassRow";
import MergeContent from "./MergeContent";

/**
 * ClassManager Component
 * * Settings panel for managing course categories (Classes).
 * * Features:
 * 1. View all discovered classes.
 * 2. Change class colors.
 * 3. Rename or Delete classes.
 * 4. "Scan Tasks": Finds classes in existing tasks that might not have a color entry.
 * 5. Merge: Combine two classes (e.g., "MATH 101" + "Math 101" -> "MATH 101").
 */
const ClassManager = ({
  classColors,
  setClassColors,
  onDeleteClass,
  onRenameClass,
  onRefreshColors, 
  mergeSource,
  setMergeSource,
  mergeTarget,
  setMergeTarget,
  onMerge,
}) => {
  const classOptions = Object.keys(classColors);

  // Trigger scanning for missing colors
  const handleScan = () => {
    const updated = onRefreshColors();
    if (updated) alert("Colors updated for new classes.");
    else alert("No new classes found.");
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <h4 className="text-heading">
            Classes & Colors
          </h4>
          <button 
            onClick={handleScan}
            className="text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
            title="Scan existing tasks for classes missing colors"
          >
            <RefreshCw className="w-3 h-3" />
            Scan Tasks
          </button>
        </div>
        
        {/* Scrollable list of class rows */}
        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
          {classOptions.length === 0 && (
            <p className="text-xs text-secondary italic p-2">No classes found.</p>
          )}
          {classOptions.map((cls) => (
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

      {/* Merge Tool Section */}
      <section className="pt-4 border-t border-divider shrink-0">
        <h4 className="mb-4 px-1 text-heading">Merge Classes</h4>
        <MergeContent
          classOptions={classOptions}
          source={mergeSource}
          setSource={setMergeSource}
          target={mergeTarget}
          setTarget={setMergeTarget}
          onMerge={onMerge}
        />
      </section>
    </div>
  );
};

export default ClassManager;