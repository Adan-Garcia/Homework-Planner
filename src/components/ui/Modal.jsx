import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;