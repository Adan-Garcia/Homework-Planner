import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button.jsx";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = "md" // sm, md, lg, xl
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content - Mobile Bottom Sheet Style */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-white dark:bg-slate-900 
          rounded-t-2xl sm:rounded-xl shadow-2xl border border-divider
          flex flex-col 
          max-h-[90vh] sm:max-h-[85vh] 
          animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in zoom-in-95 duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <Button variant="ghost" onClick={onClose} className="!p-1 text-secondary">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer (Optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-divider bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl shrink-0 flex justify-end gap-2 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;