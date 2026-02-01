/**
 * Type Definitions for Homework Planner
 * 
 * This file contains all TypeScript interfaces and types used throughout the application.
 * As you migrate JavaScript files to TypeScript, import these types as needed.
 */

// ============================================================================
// Event/Task Types
// ============================================================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO format: yyyy-MM-dd
  time?: string; // HH:mm format
  class: string;
  type: EventType;
  priority: Priority;
  completed: boolean;
  groupId?: string; // For recurring events
  recurrence?: RecurrenceType;
  recurrenceEnd?: string; // ISO format: yyyy-MM-dd
  editScope?: "single" | "series"; // For editing recurring events
}

export type EventType =
  | "Assignment"
  | "Homework"
  | "Lab"
  | "Project"
  | "Exam"
  | "Quiz"
  | "Reading"
  | "Discussion"
  | "Lecture"
  | "Office Hours"
  | "Event";

export type Priority = "Low" | "Normal" | "Medium" | "High";

export type RecurrenceType = "none" | "weekly" | "biweekly";

export type CalendarView = "month" | "week" | "day" | "agenda";

// ============================================================================
// Encrypted Data Types
// ============================================================================

export interface EncryptedEvent {
  isEncrypted: true;
  iv: string; // Base64 encoded initialization vector
  data: string; // Base64 encoded encrypted data
  id: string; // Unencrypted ID for indexing
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthData {
  token: string; // JWT token
  salt: string;
  isNew: boolean; // Whether the room was just created
}

export interface RoomAuthState {
  isAuthorized: boolean;
  authToken: string | null;
  cryptoKey: CryptoKey | null;
  authError: string | null;
  isNewRoom: boolean;
}

// ============================================================================
// Storage & State Types
// ============================================================================

export interface ClassColors {
  [className: string]: string; // Hex color codes
}

export type HiddenClasses = string[];

export interface StorageKeys {
  EVENTS: string;
  COLORS: string;
  HIDDEN: string;
  THEME: string;
  VIEW: string;
  CAL_MODE: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Socket/Sync Types
// ============================================================================

export interface SocketEvents {
  CONNECT: string;
  CONNECT_ERROR: string;
  DISCONNECT: string;
  JOIN: string;
  EVENT_SYNC: string;
  EVENT_BULK_SYNC: string;
  EVENT_REMOVE: string;
  EVENT_SAVE: string;
  EVENT_BULK_SAVE: string;
  EVENT_DELETE: string;
  EVENT_BULK_DELETE: string;
  META_SYNC: string;
  META_SAVE: string;
  ROOM_COUNT: string;
}

export interface ServerMeta {
  classColors?: string | ClassColors;
}

export interface RoomData {
  events: EncryptedEvent[];
  meta: ServerMeta;
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export interface TaskItemProps {
  task: Event;
  toggleTask: (e: React.MouseEvent, id: string) => void;
  openEditTaskModal: (task: Event) => void;
  classColors: ClassColors;
}

// ============================================================================
// Context Types
// ============================================================================

export interface UIContextValue {
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  view: "setup" | "planner";
  setView: (view: "setup" | "planner") => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTypeFilter: string;
  setActiveTypeFilter: (filter: string) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  hideOverdue: boolean;
  setHideOverdue: (hide: boolean) => void;
  modals: {
    settings: boolean;
    task: boolean;
    jsonEdit: boolean;
  };
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
  editingTask: Event | null;
  setEditingTask: (task: Event | null) => void;
  openTaskModal: (task?: Event | null) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export interface DataContextValue {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  classColors: ClassColors;
  setClassColors: (colors: ClassColors) => void;
  hiddenClasses: HiddenClasses;
  setHiddenClasses: React.Dispatch<React.SetStateAction<HiddenClasses>>;
  addEvent: (event: Partial<Event>) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (id: string, deleteSeries?: boolean, groupId?: string | null) => void;
  bulkAddEvents: (events: Event[]) => void;
  toggleTaskCompletion: (id: string) => void;
  deleteClass: (className: string) => void;
  mergeClasses: (source: string, target: string) => void;
  renameClass: (oldName: string, newName: string) => void;
  refreshClassColors: () => boolean;
  importJsonData: (jsonString: string, append?: boolean) => ImportResult;
  exportICS: () => void;
  processICSContent: (text: string) => Promise<ImportResult>;
  importICSFromUrl: (url: string) => Promise<ImportResult>;
  resetAllData: () => void;
  isAuthorized: boolean;
  peerCount: number;
}

export interface AuthContextValue {
  roomId: string | null;
  setRoomId: (id: string | null) => void;
  roomPassword: string;
  setRoomPassword: (password: string) => void;
  isAuthorized: boolean;
  authToken: string | null;
  cryptoKey: CryptoKey | null;
  authError: string | null;
  isNewRoom: boolean;
  disconnectRoom: () => void;
}

export interface NotificationContextValue {
  error: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ImportResult {
  success: boolean;
  error?: string;
  count?: number;
  invalidCount?: number;
}

export interface ICSEvent {
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend?: string;
  categories?: string;
}

// ============================================================================
// Drag & Drop Types
// ============================================================================

export interface DragDropContextValue {
  draggedEventId: string | null;
  handleDragStart: (e: React.DragEvent, eventId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, newDate: string) => void;
  handleSidebarDrop: (e: React.DragEvent, groupKey: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

export const EVENT_TYPES: EventType[] = [
  "Assignment",
  "Homework",
  "Lab",
  "Project",
  "Exam",
  "Quiz",
  "Reading",
  "Discussion",
  "Lecture",
  "Office Hours",
  "Event",
];

export const PRIORITIES: Priority[] = ["Low", "Normal", "Medium", "High"];
