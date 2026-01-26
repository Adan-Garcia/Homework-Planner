import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button.jsx";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = "md" 
}) => {
  
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      
      <div 
        className={`
          relative w-full ${sizeClasses[size]} 
          mac-glass-heavy
          rounded-t-[32px] sm:rounded-[32px] overflow-hidden
          flex flex-col 
          max-h-[90vh] sm:max-h-[85vh] 
          shadow-2xl shadow-black/20
          animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 zoom-in-95 duration-300 cubic-bezier(0.16, 1, 0.3, 1)
        `}
      >
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl">
          <h3 className="text-xl font-bold text-primary tracking-tight">{title}</h3>
          <Button variant="ghost" onClick={onClose} className="!p-1.5 rounded-full text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>

        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        
        {footer && (
          <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 shrink-0 flex justify-end gap-3 flex-wrap backdrop-blur-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;