export const STORAGE_KEYS = {
  EVENTS: "hw_events",
  COLORS: "hw_colors",
  HIDDEN: "hw_hidden",
  THEME: "hw_theme",
  VIEW: "hw_view",
  CAL_MODE: "hw_cal_mode",
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://planner.adangarcia.com/backend";

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




export const UI_THEME = {
  
  LAYOUT: {
    CARD_WIDTH_OPEN: "min-w-[300px]",
    CARD_WIDTH_CLOSED: "min-w-[200px]",
    EDITOR_HEIGHT: "h-[500px]",
  },
  
  
  SURFACE: {
    MAIN: "bg-white dark:bg-slate-900",
    CARD: "bg-slate-50 dark:bg-slate-700/30",
    CARD_HOVER: "hover:bg-slate-100 dark:hover:bg-slate-700/50",
    INPUT: "bg-white dark:bg-slate-600",
    MODAL_BG: "bg-slate-50 dark:bg-slate-900",
  },
  
  BORDERS: {
    BASE: "border border-slate-100 dark:border-slate-600",
    INPUT: "border border-slate-300 dark:border-slate-500",
    DIVIDER: "border-t border-slate-100 dark:border-slate-700",
    RING_ACTIVE: "ring-2 ring-blue-500/10 dark:ring-blue-400/10",
  },

  
  TEXT: {
    PRIMARY: "text-slate-700 dark:text-slate-200",
    SECONDARY: "text-slate-500 dark:text-slate-400",
    MUTED: "text-slate-400",
    HEADING: "text-sm font-bold text-slate-700 dark:text-slate-200",
    INPUT_TEXT: "text-slate-800 dark:text-white",
    LINK: "text-blue-600 dark:text-blue-400 hover:text-blue-700",
    LINK_HOVER: "hover:text-blue-600 dark:hover:text-blue-400",
  },

  
  BUTTON: {
    PRIMARY: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    PRIMARY_ACCENT: "bg-purple-600 text-white hover:bg-purple-700",
    SECONDARY: "bg-slate-100 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600",
    DANGER_SOFT: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40",
    DANGER_ICON: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50",
    GHOST: "text-slate-600 hover:bg-slate-100",
    GHOST_DANGER: "text-slate-300 hover:text-red-500",
    GHOST_EDIT: "text-slate-300 hover:text-blue-500",
    LINK_STYLE: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20",
    LINK_DANGER: "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
    BASE_STYLE: "flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors p-2",
  },

  
  STATUS: {
    ACTIVE_ROOM_BG: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800",
    ACTIVE_TEXT: "text-blue-700 dark:text-blue-300",
    HOST_DOT: "bg-green-500",
    PEER_DOT: "bg-blue-400",
    ERROR_BG: "bg-red-100 dark:bg-red-900/30 text-red-600",
  },

  
  ICON: {
    SIZE_XS: "w-3 h-3",
    SIZE_SM: "w-4 h-4",
    COLOR_ACTIVE: "text-blue-500",
    COLOR_INACTIVE: "text-slate-400",
  }
};