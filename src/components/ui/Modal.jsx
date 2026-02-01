import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import Button from "./Button.jsx";

/**
 * Modal Component
 * * A reusable UI primitive for displaying content overlays.
 * * Features:
 * 1. Z-Index Management: Ensures modal floats above all other content (z-100).
 * 2. Focus/Key Management: Closes on 'Escape' key press, traps focus within modal.
 * 3. Backdrop: Closes when clicking the dimmed background.
 * 4. Animation: Uses Tailwind `animate-in` for smooth entry.
 * 5. Accessibility: ARIA attributes and focus restoration.
 *
 * @param {boolean} isOpen - Controls visibility.
 * @param {Function} onClose - Callback when close is requested.
 * @param {string} title - Header text.
 * @param {ReactNode} children - The modal body content.
 * @param {ReactNode} footer - Optional footer actions (buttons).
 * @param {string} size - Width preset ('sm', 'md', 'lg', 'xl').
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = "md" 
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  // Handle Escape key to close modal and manage focus trap
  useEffect(() => {
    if (!isOpen) return;
    
    // Store the element that was focused before modal opened
    previousFocusRef.current = document.activeElement;
    
    // Focus the modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    
    const handleTab = (e) => {
      if (e.key !== "Tab" || !modalRef.current) return;
      
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Trap focus within modal
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    window.addEventListener("keydown", handleEsc);
    window.addEventListener("keydown", handleTab);
    
    return () => {
      window.removeEventListener("keydown", handleEsc);
      window.removeEventListener("keydown", handleTab);
      
      // Restore focus to previous element when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      
      {/* Backdrop: Click to close */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Card */}
      <div 
        ref={modalRef}
        tabIndex={-1}
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
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl">
          <h3 id="modal-title" className="text-xl font-bold text-primary tracking-tight">{title}</h3>
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="!p-1.5 rounded-full text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer (Optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 shrink-0 flex justify-end gap-3 flex-wrap backdrop-blur-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
};

export default Modal;