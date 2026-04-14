import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCollapsible } from "@react-aria/collapsible";

/**
 * CollapsibleCard Component
 * Enhanced with React Aria for accessibility
 */
const CollapsibleCard = ({ title, icon: Icon, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { collapsibleProps } = useCollapsible({ isOpen });

  return (
    <div
      className={`surface-card border-base rounded-xl overflow-hidden transition-all duration-300 ease-in-out flex-1 ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors surface-card-hover"
        {...collapsibleProps.triggerProps}
      >
        <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap text-primary">
          <Icon className={`icon-sm ${isOpen ? "icon-active" : "icon-inactive"}`} />
          {title}
        </span>
        <ChevronDown
          className={`icon-sm icon-inactive shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        {...collapsibleProps.contentProps}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-divider">
            <div className="pt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;