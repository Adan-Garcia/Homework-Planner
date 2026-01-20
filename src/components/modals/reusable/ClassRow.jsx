import React, { useState, useEffect } from "react";
import { Check, X, Edit2, Trash2 } from "lucide-react";
import { UI_THEME } from "../../../utils/constants";

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
    <div className={`flex items-center justify-between p-2 rounded-lg group ${UI_THEME.SURFACE.CARD_HOVER}`}>
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
              className={`flex-1 min-w-0 p-1 text-xs rounded ${UI_THEME.BORDERS.INPUT} ${UI_THEME.SURFACE.INPUT} ${UI_THEME.TEXT.INPUT_TEXT}`}
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
              <Check className={UI_THEME.ICON.SIZE_XS} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
            >
              <X className={UI_THEME.ICON.SIZE_XS} />
            </button>
          </div>
        ) : (
          <span
            className={`font-medium text-sm truncate flex-1 cursor-pointer transition-colors ${UI_THEME.TEXT.PRIMARY} ${UI_THEME.TEXT.LINK_HOVER}`}
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
            className={`p-2 opacity-0 group-hover:opacity-100 transition-opacity ${UI_THEME.BUTTON.GHOST_EDIT}`}
          >
            <Edit2 className={UI_THEME.ICON.SIZE_XS} />
          </button>
        )}
        <button
          onClick={() => onDelete(cls)}
          className={`p-2 ${UI_THEME.BUTTON.GHOST_DANGER}`}
        >
          <Trash2 className={UI_THEME.ICON.SIZE_SM} />
        </button>
      </div>
    </div>
  );
};

export default ClassRow;