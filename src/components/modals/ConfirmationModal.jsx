import React from "react";
import PropTypes from "prop-types";
import { AlertTriangle } from "lucide-react";
import Button from "../ui/Button";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="surface-modal rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={isDanger ? "status-error p-2 rounded-full flex-none justify-center" : "status-warning p-2 rounded-full flex-none justify-center"}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary">
              {title}
            </h3>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            {message}
          </p>
        </div>
        <div className="bg-white/40 dark:bg-white/5 p-4 flex gap-3 justify-end border-t border-divider backdrop-blur-xl">
          <Button
            onClick={onClose}
            variant="ghost"
            className="px-4 py-2 text-sm font-semibold"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={isDanger ? "danger" : "primary"}
            className="px-4 py-2 text-sm font-bold shadow-sm transition-transform active:scale-95"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  isDanger: PropTypes.bool,
};

export default ConfirmationModal;
