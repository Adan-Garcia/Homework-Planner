import React, { createContext, useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  error: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/20 text-red-700 dark:text-red-300",
  success: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/20 text-green-700 dark:text-green-300",
  warning: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/20 text-yellow-700 dark:text-yellow-300",
  info: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/20 text-blue-700 dark:text-blue-300",
};

/**
 * Notification Component
 * * Displays a transient message with auto-dismiss
 */
const Toast = ({ id, type = "info", message, onDismiss, duration = 4000 }) => {
  const Icon = iconMap[type];

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`
        animate-in slide-in-from-top-2 fade-in-0 duration-300
        flex items-start gap-3 p-4 rounded-lg border ${colorMap[type]}
        shadow-lg max-w-sm
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * NotificationProvider
 * * Manages a queue of notifications and displays them
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const show = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value = {
    show,
    dismiss,
    error: (msg, duration) => show(msg, "error", duration),
    success: (msg, duration) => show(msg, "success", duration),
    warning: (msg, duration) => show(msg, "warning", duration),
    info: (msg, duration) => show(msg, "info", duration),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {notifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto">
            <Toast
              id={notif.id}
              type={notif.type}
              message={notif.message}
              onDismiss={dismiss}
              duration={notif.duration}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

Toast.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.oneOf(["error", "success", "warning", "info"]),
  message: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
  duration: PropTypes.number,
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
