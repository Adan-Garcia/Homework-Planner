import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { UI_THEME } from "../../../utils/constants"; 

const CollapsibleCard = ({ title, icon: Icon, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = isOpen
    ? `${UI_THEME.LAYOUT.CARD_WIDTH_OPEN} ${UI_THEME.BORDERS.RING_ACTIVE}`
    : UI_THEME.LAYOUT.CARD_WIDTH_CLOSED;

  return (
    <div
      className={`
        ${UI_THEME.SURFACE.CARD} ${UI_THEME.BORDERS.BASE} rounded-xl overflow-hidden 
        transition-all duration-300 ease-in-out flex-1
        ${sizeClasses} ${className}
      `}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${UI_THEME.SURFACE.CARD_HOVER}`}
      >
        <span className={`text-sm font-bold flex items-center gap-2 whitespace-nowrap ${UI_THEME.TEXT.PRIMARY}`}>
          <Icon
            className={`${UI_THEME.ICON.SIZE_SM} ${isOpen ? UI_THEME.ICON.COLOR_ACTIVE : UI_THEME.ICON.COLOR_INACTIVE}`}
          />
          {title}
        </span>
        <ChevronDown
          className={`${UI_THEME.ICON.SIZE_SM} ${UI_THEME.ICON.COLOR_INACTIVE} shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`p-4 pt-0 ${UI_THEME.BORDERS.DIVIDER}`}>
            <div className="pt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;