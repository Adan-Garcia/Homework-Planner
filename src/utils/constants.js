/**
 * Application Constants
 * 
 * Central location for all configuration values, storage keys, and magic numbers.
 * Organized by functional area for easy maintenance.
 */

import logger from "./logger.js";

/**
 * LocalStorage Keys
 * * Prefixed with 'hw_' to avoid conflicts with other apps on same domain
 */
export const STORAGE_KEYS = {
  EVENTS: "hw_events",
  COLORS: "hw_colors",
  HIDDEN: "hw_hidden",
  THEME: "hw_theme",
  VIEW: "hw_view",
  CAL_MODE: "hw_cal_mode",
};

// --- Socket & Network Configuration ---
export const SOCKET_TIMEOUT_MS = 5000; // 5 second timeout for socket operations
export const SOCKET_RECONNECT_DELAY_MS = 1000; // Delay before reconnecting
export const SOCKET_PATH = "/backend/socket.io"; // Socket.io server path

export const SOCKET_EVENTS = {
  CONNECT: "connect",
  CONNECT_ERROR: "connect_error",
  DISCONNECT: "disconnect",
  JOIN: "join",
  EVENT_SYNC: "event:sync",
  EVENT_BULK_SYNC: "event:bulk_sync",
  EVENT_REMOVE: "event:remove",
  EVENT_SAVE: "event:save",
  EVENT_BULK_SAVE: "event:bulk_save",
  EVENT_DELETE: "event:delete",
  EVENT_BULK_DELETE: "event:bulk_delete",
  META_SYNC: "meta:sync",
  META_SAVE: "meta:save",
  ROOM_COUNT: "room:count",
};

// --- Crypto Configuration ---
export const PBKDF2_ITERATIONS = 600000; // High iteration count for brute-force resistance
export const AUTH_DEBOUNCE_MS = 500; // Debounce delay for auth requests

// --- Recurrence Configuration ---
export const RECURRENCE_INTERVAL_WEEKLY = 7; // Days between weekly recurring events
export const RECURRENCE_INTERVAL_BIWEEKLY = 14; // Days between biweekly recurring events

// --- UI Configuration ---
export const FILTER_HISTORY_MONTHS = 1; // How many months of history to keep in filtered view
export const MAX_TASK_TITLE_LENGTH = 200; // Maximum characters for task title
export const MAX_TASK_DESCRIPTION_LENGTH = 2000; // Maximum characters for task description

// --- API Configuration ---
const DEFAULT_API_URL = "https://api.adangarcia.com/backend";

/**
 * Get the current API base URL
 * * Checks localStorage first for user-configured URL
 * * Falls back to environment variable
 * * Falls back to default production URL
 */
export const getApiBaseUrl = () => {
  try {
    const stored = localStorage.getItem("planner_api_url");
    if (stored) return stored;
  } catch (_e) {
    logger.warn("[Constants] Failed to read API URL from localStorage:", _e);
  }
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL;
};

/**
 * Set a custom API base URL
 * * Validates URL format and enforces HTTPS in production
 * * Persists to localStorage
 * * @param {string} url - The new API base URL
 * * @throws {Error} If URL is invalid or doesn't use HTTPS in production
 */
export const setApiBaseUrl = (url) => {
  try {
    if (url && url.trim()) {
      const trimmedUrl = url.trim();
      
      // Validate URL format
      let parsedUrl;
      try {
        parsedUrl = new URL(trimmedUrl);
      } catch (e) {
        throw new Error("Invalid URL format. Please provide a valid URL (e.g., https://api.example.com)");
      }
      
      // Enforce HTTPS in production for security
      if (import.meta.env.PROD && parsedUrl.protocol !== "https:") {
        throw new Error("API URL must use HTTPS in production mode for security");
      }
      
      // Prevent localhost URLs in production
      if (import.meta.env.PROD && 
          (parsedUrl.hostname === 'localhost' || 
           parsedUrl.hostname === '127.0.0.1' || 
           parsedUrl.hostname === '0.0.0.0')) {
        throw new Error("Cannot use localhost URLs in production");
      }
      
      // Allow http only in development (for localhost testing)
      if (!import.meta.env.PROD && parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("API URL must use HTTP or HTTPS protocol");
      }
      
      localStorage.setItem("planner_api_url", trimmedUrl);
      logger.log("[Constants] API URL updated:", trimmedUrl);
    } else {
      localStorage.removeItem("planner_api_url");
      logger.log("[Constants] API URL reset to default");
    }
  } catch (e) {
    logger.error("[Constants] Failed to set API URL:", e.message);
    throw e; // Re-throw so UI can display error to user
  }
};

/**
 * Reset API URL to default
 */
export const resetApiBaseUrl = () => {
  try {
    localStorage.removeItem("planner_api_url");
  } catch (e) {
    logger.error("[Constants] Failed to reset API URL:", e);
  }
};

// For backward compatibility, export as constant (but will use getter in actual implementation)
export const API_BASE_URL = getApiBaseUrl();

export const PALETTE = [
  "#0984e3",
  "#d63031",
  "#00b894",
  "#fdcb6e",
  "#6c5ce7",
  "#e17055",
  "#e84393",
  "#2d3436",
];

export const EVENT_TYPES = [
  "Homework",
  "Exam",
  "Quiz",
  "Project",
  "Reading",
  "Lab",
  "Discussion",
  "Assignment",
];

export const initialEvents = [];
export const initialClassColors = {};
export const initialHiddenClasses = [];

