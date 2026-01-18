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
