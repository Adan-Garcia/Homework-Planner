import { addDays, startOfWeek, format } from "date-fns";
import { MAX_TASK_DESCRIPTION_LENGTH, MAX_TASK_TITLE_LENGTH } from "./constants";
import { z } from "zod";

export const unfoldLines = (text) => text.replace(/\r\n /g, "");

export const parseICSDate = (dateStr) => {
  if (!dateStr) return "";
  const cleanDate = dateStr
    .split(";")[0]
    .replace("DTSTART:", "")
    .replace("DTSTART;", "");
  const match = /(\d{4})(\d{2})(\d{2})/.exec(cleanDate);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return "";
};

export const parseICSTime = (dateStr) => {
  if (!dateStr || !dateStr.includes("T")) return "";
  const clean = dateStr.replace(/Z$/, "");
  const timePart = clean.split("T")[1];
  if (!timePart) return "";
  const match = /(\d{2})(\d{2})/.exec(timePart);
  if (match) return `${match[1]}:${match[2]}`;
  return "";
};

export const determineType = (summary, description) => {
  const text = (summary + " " + description || "").toLowerCase();
  if (text.includes("discussion") || text.includes("peer review"))
    return "Discussion";
  if (
    text.includes("office hours") ||
    text.includes("review session") ||
    text.includes("help session")
  )
    return "Office Hours";
  if (text.includes("quiz")) return "Quiz";
  if (
    text.includes("project") ||
    text.includes("milestone") ||
    text.includes("deliverable") ||
    text.includes("proposal")
  )
    return "Project";
  if (
    text.includes("exam") ||
    text.includes("test") ||
    text.includes("midterm") ||
    text.includes("final")
  )
    return "Exam";
  if (
    text.includes("homework") ||
    text.includes("hw") ||
    text.includes("assignment") ||
    text.includes("dropbox") ||
    text.includes("problem set")
  )
    return "Homework";
  if (text.includes("lab") || text.includes("studio")) return "Lab";
  if (text.includes("reading")) return "Reading";
  if (
    text.includes("lecture") ||
    text.includes("recitation") ||
    text.includes("seminar") ||
    text.includes("orientation") ||
    text.includes("class")
  )
    return "Lecture";
  return "Event";
};

export const determineClass = (location, summary) => {
  const isValidName = (name) => {
    if (!name || name.length < 3) return false;
    if (/\d/.test(name) && /am|pm/i.test(name)) return false;
    if (/^(due|available|assignment|zoom meeting)$/i.test(name)) return false;
    return true;
  };

  const candidates = [location, summary];
  for (let rawText of candidates) {
    if (!rawText) continue;
    const text = String(rawText);
    let clean = text.replace(/Zoom (Online )?Meeting/i, "").trim();
    if (clean.startsWith("(") && clean.endsWith(")")) {
      clean = clean.slice(1, -1).trim();
    }
    const separators = [" - ", " : ", " | "];
    for (const sep of separators) {
      if (clean.includes(sep)) {
        const parts = clean.split(sep);
        let name = parts[parts.length - 1].trim();
        name = name
          .replace(/\)$/, "")
          .replace(/ - Due$/i, "")
          .replace(/ - Available$/i, "")
          .trim();
        if (isValidName(name)) {
          return name;
        }
      }
    }
  }
  return "General";
};

export const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, "h:mm a");
};

export const addDaysToDate = (dateStr, days) => {
  // Parse date in UTC to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const newDate = addDays(date, days);
  return format(newDate, "yyyy-MM-dd");
};

export const getWeekDates = (baseDate) => {
  const start = startOfWeek(baseDate); 
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(format(addDays(start, i), "yyyy-MM-dd"));
  }
  return days;
};

export const generateICS = (events) => {
  if (!events || events.length === 0) return "";
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, "");
  };
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Homework Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  events.forEach((ev) => {
    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${ev.id || crypto.randomUUID()}`);
    icsLines.push(`DTSTAMP:${now}`);
    if (ev.time) {
      const [h, m] = ev.time.split(":");
      const dt = `${formatDate(ev.date)}T${h}${m}00`;
      icsLines.push(`DTSTART:${dt}`);
    } else {
      icsLines.push(`DTSTART;VALUE=DATE:${formatDate(ev.date)}`);
    }
    icsLines.push(`SUMMARY:${ev.title}`);
    if (ev.description) {
      const desc = ev.description
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
      icsLines.push(`DESCRIPTION:${desc}`);
    }
    if (ev.class && ev.class !== "General") {
      icsLines.push(`LOCATION:${ev.class}`);
    }
    if (ev.type) {
      icsLines.push(`CATEGORIES:${ev.type}`);
    }
    icsLines.push("END:VEVENT");
  });
  icsLines.push("END:VCALENDAR");
  return icsLines.join("\r\n");
};

export const generateRoomId = () => {
  const array = new Uint8Array(4);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 6)
    .toUpperCase();
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return format(date, "EEE, MMM d");
};

export const getContrastColor = (hexcolor) => {
  if (!hexcolor) return "#000000";
  
  // Remove # if present
  const color = hexcolor.replace('#', '');
  
  // Validate color length to prevent NaN from invalid parsing
  if (color.length < 6) return "#000000";
  
  // Parse RGB values
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate relative luminance using WCAG formula
  const toLuminance = (val) => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  
  const luminance = 0.2126 * toLuminance(r) + 
                    0.7152 * toLuminance(g) + 
                    0.0722 * toLuminance(b);
  
  // Return white for dark backgrounds, black for light backgrounds
  // Threshold of 0.179 provides good contrast
  return luminance > 0.179 ? "#000000" : "#ffffff";
};

export const parseCssColor = (colorValue) => {
  if (!colorValue || typeof colorValue !== "string") {
    return null;
  }

  const normalized = colorValue.trim();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const expanded = hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex;

    if (expanded.length !== 6) return null;

    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);

    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a: 1 };
  }

  const match = normalized.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;

  const parts = match[1].split(",").map((value) => value.trim());
  if (parts.length < 3) return null;

  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  const a = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;

  if ([r, g, b, a].some(Number.isNaN)) return null;

  return { r, g, b, a };
};

export const mixCssColors = (foreground, background) => {
  if (!foreground || !background) return null;

  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: Math.round((foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha),
    g: Math.round((foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha),
    b: Math.round((foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha),
    a: alpha,
  };
};

export const relativeLuminance = (color) => {
  if (!color) return 0;

  const toLinear = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * toLinear(color.r) +
    0.7152 * toLinear(color.g) +
    0.0722 * toLinear(color.b)
  );
};

export const getContrastRatio = (foreground, background) => {
  const fg = typeof foreground === "string" ? parseCssColor(foreground) : foreground;
  const bg = typeof background === "string" ? parseCssColor(background) : background;

  if (!fg || !bg) return 0;

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
};

export const isReadableContrast = (foreground, background, minimumRatio = 4.5) => {
  return getContrastRatio(foreground, background) >= minimumRatio;
};

const resolveBackgroundColor = (element) => {
  if (typeof window === "undefined" || !element) return null;

  const style = window.getComputedStyle(element);
  const background = parseCssColor(style.backgroundColor);

  if (background && background.a > 0) {
    if (background.a >= 1) return background;

    const parentBackground = resolveBackgroundColor(element.parentElement);
    return parentBackground ? mixCssColors(background, parentBackground) : background;
  }

  return resolveBackgroundColor(element.parentElement) || parseCssColor(window.getComputedStyle(document.body).backgroundColor);
};

const getElementPath = (element) => {
  if (!element || !element.tagName) return "";

  const segments = [];
  let current = element;

  while (current && current.nodeType === 1 && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const className = typeof current.className === "string"
      ? current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".")
      : "";
    const segment = className ? `${tag}.${className}` : tag;
    segments.unshift(segment);
    current = current.parentElement;
  }

  return segments.join(" > ");
};

const isElementHidden = (element, style) => {
  if (!element || !style) return true;
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return true;
  }

  const rect = element.getBoundingClientRect();
  return rect.width === 0 || rect.height === 0;
};

const getRequiredContrastRatio = (element, style) => {
  const fontSize = Number.parseFloat(style.fontSize || "16");
  const fontWeight = Number.parseInt(style.fontWeight || "400", 10);
  const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

  if (element.matches("input, textarea, select, option")) {
    return 4.5;
  }

  return isLargeText ? 3 : 4.5;
};

const createContrastIssue = ({
  element,
  text,
  ratio,
  minimumRatio,
  foreground,
  background,
  source,
}) => ({
  path: getElementPath(element),
  tag: element.tagName.toLowerCase(),
  source,
  text: (text || "").trim().slice(0, 100),
  ratio: Number(ratio.toFixed(2)),
  minimumRatio,
  foreground,
  background,
});

export const auditFullUIContrast = ({ minimumRatio = 4.5 } = {}) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { issues: [], checked: 0 };
  }

  const issues = [];
  const checkedElements = new WeakMap();
  const issueSignatures = new Set();

  const isAuditPanelElement = (element) => {
    return Boolean(element?.closest?.("[data-contrast-audit-panel='true']"));
  };

  const hasCheckedSource = (element, source) => {
    const seenSources = checkedElements.get(element);
    return Boolean(seenSources && seenSources.has(source));
  };

  const markCheckedSource = (element, source) => {
    const seenSources = checkedElements.get(element) || new Set();
    seenSources.add(source);
    checkedElements.set(element, seenSources);
  };

  const inspectElementContrast = (element, source = "text") => {
    if (!element || isAuditPanelElement(element) || hasCheckedSource(element, source)) return;

    const style = window.getComputedStyle(element);
    if (isElementHidden(element, style)) return;

    const foreground = parseCssColor(style.color);
    const backgroundColor = resolveBackgroundColor(element);
    if (!foreground || !backgroundColor) return;

    const ratio = getContrastRatio(foreground, backgroundColor);
    const requiredRatio = Math.max(minimumRatio, getRequiredContrastRatio(element, style));

    if (ratio < requiredRatio) {
      const issue = createContrastIssue({
        element,
        text: source === "placeholder" ? element.getAttribute("placeholder") || "placeholder" : element.textContent,
        ratio,
        minimumRatio: requiredRatio,
        foreground: style.color,
        background: window.getComputedStyle(element.parentElement || document.body).backgroundColor,
        source,
      });

      const signature = `${issue.path}|${issue.source}|${issue.text}|${issue.ratio}`;
      if (!issueSignatures.has(signature)) {
        issueSignatures.add(signature);
        issues.push(issue);
      }
    }

    markCheckedSource(element, source);
  };

  // Check rendered text nodes across the current UI screen.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node || !node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (isAuditPanelElement(parent)) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textParents = new Set();
  while (walker.nextNode()) {
    textParents.add(walker.currentNode.parentElement);
  }

  textParents.forEach((element) => inspectElementContrast(element, "text"));

  // Check input and control surfaces (including placeholder contrast).
  const controls = document.querySelectorAll("input, textarea, select, button, [role='button'], a, label");
  controls.forEach((element) => {
    if (isAuditPanelElement(element)) return;
    if (element.matches("input, textarea") && element.disabled) return;
    inspectElementContrast(element, "control");

    if (element.matches("input, textarea") && element.getAttribute("placeholder")) {
      const placeholderStyle = window.getComputedStyle(element, "::placeholder");
      const placeholderColor = parseCssColor(placeholderStyle.color) || parseCssColor(window.getComputedStyle(element).color);
      const backgroundColor = resolveBackgroundColor(element);

      if (placeholderColor && backgroundColor) {
        const ratio = getContrastRatio(placeholderColor, backgroundColor);
        if (ratio < 4.5) {
          issues.push(createContrastIssue({
            element,
            text: element.getAttribute("placeholder"),
            ratio,
            minimumRatio: 4.5,
            foreground: placeholderStyle.color,
            background: window.getComputedStyle(element.parentElement || document.body).backgroundColor,
            source: "placeholder",
          }));
        }
      }
    }
  });

  return {
    checked: textParents.size + controls.length,
    issues: issues.sort((a, b) => a.ratio - b.ratio),
  };
};

export const auditContrastElements = ({
  selectors = [".text-primary", ".text-secondary", ".text-heading", ".text-input", ".text-link-hover"],
  minimumRatio = 4.5,
} = {}) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return [];
  }

  const elements = new Set();
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => elements.add(element));
  });

  const issues = [];

  elements.forEach((element) => {
    const text = element.textContent?.trim();
    if (!text) return;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;

    const foreground = parseCssColor(style.color);
    const background = resolveBackgroundColor(element);
    if (!foreground || !background) return;

    const ratio = getContrastRatio(foreground, background);
    if (ratio < minimumRatio) {
      issues.push({
        selector: selectors.find((selector) => element.matches(selector)) || element.tagName.toLowerCase(),
        text: text.slice(0, 80),
        ratio: Number(ratio.toFixed(2)),
        foreground: style.color,
        background: window.getComputedStyle(element.parentElement || document.body).backgroundColor,
      });
    }
  });

  return issues.sort((a, b) => a.ratio - b.ratio);
};


export const compareTasks = (a, b) => {
  const dateDiff = new Date(a.date) - new Date(b.date);
  if (dateDiff !== 0) return dateDiff;

  
  
  const getPriorityWeight = (p) => {
    if (p === "High") return 3;
    if (p === "Medium" || p === "Normal") return 2;
    return 1;
  };
  
  const pA = getPriorityWeight(a.priority);
  const pB = getPriorityWeight(b.priority);
  
  
  if (pA !== pB) return pB - pA;

  
  
  
  if (!a.time && b.time) return -1;
  if (a.time && !b.time) return 1;
  
  
  if (a.time && b.time) {
      const timeDiff = a.time.localeCompare(b.time);
      if (timeDiff !== 0) return timeDiff;
  }

  
  return a.title.localeCompare(b.title);
};

/**
 * Validates event/task input
 * * @param {Object} event - The event object to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
/**
 * Validates an event object against business rules.
 * * Checks required fields, data types, and length constraints.
 * * Returns detailed error messages for debugging.
 * 
 * @param {Object} event - The event object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result with error messages
 * 
 * @example
 * const result = validateEvent({ title: "", date: "2026-02-15" });
 * // Returns: { isValid: false, errors: ["Task title is required"] }
 */
export const validateEvent = (event) => {
  const errors = [];

  if (!event.title || !event.title.trim()) {
    errors.push("Task title is required");
  } else if (event.title.trim().length > MAX_TASK_TITLE_LENGTH) {
    errors.push(`Task title cannot exceed ${MAX_TASK_TITLE_LENGTH} characters`);
  }

  if (event.description && event.description.length > MAX_TASK_DESCRIPTION_LENGTH) {
    errors.push(`Task description cannot exceed ${MAX_TASK_DESCRIPTION_LENGTH} characters`);
  }

  if (!event.date) {
    errors.push("Task date is required");
  }

  if (event.time && !/^\d{2}:\d{2}$/.test(event.time)) {
    errors.push("Invalid time format. Use HH:MM");
  }

  if (!event.class || !event.class.trim()) {
    errors.push("Task class is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Normalizes an event object to safe defaults.
 * * Ensures required fields exist and types are correct.
 * @param {Object} event - Raw event data
 * @returns {Object|null} - Normalized event or null if input is not an object
 */
export const normalizeEvent = (event) => {
  if (!event || typeof event !== "object") return null;

  const id =
    typeof event.id === "string" && event.id.trim()
      ? event.id
      : (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`);

  return {
    ...event,
    id,
    title: typeof event.title === "string" ? event.title : "",
    description: typeof event.description === "string" ? event.description : "",
    date: typeof event.date === "string" ? event.date : "",
    time: typeof event.time === "string" ? event.time : "",
    class: typeof event.class === "string" && event.class.trim() ? event.class : "General",
    type: typeof event.type === "string" ? event.type : "Assignment",
    priority: typeof event.priority === "string" ? event.priority : "Normal",
    completed: Boolean(event.completed),
  };
};

export const urlRegex = /(https?:\/\/[^\s]+)/g;

/**
 * Sanitizes user input to prevent XSS and other injection attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
/**
 * Sanitizes user input to prevent XSS attacks.
 * * Removes HTML tags, script content, and event handlers.
 * * Strips dangerous protocols like javascript:
 * * Always use this before rendering user-provided content.
 * 
 * **Security Note:** This is client-side sanitization for defense-in-depth.
 * React already escapes content, but this provides an extra layer.
 * 
 * @param {string} input - Raw user input string
 * @returns {string} Sanitized string safe for display
 * 
 * @example
 * sanitizeInput("<script>alert('xss')</script>Hello")
 * // Returns: "alert('xss')Hello"
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  const trimmed = withoutTags.trim();
  
  // Remove any script-like content and event handlers
  const withoutScripts = trimmed.replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["']?[^"'\s>]*/gi, ''); // Removes onclick=, onerror=, etc.
  
  return withoutScripts;
};

/**
 * Validation Schemas
 * Implemented with Zod for data validation
 */
export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(MAX_TASK_TITLE_LENGTH, "Title is too long"),
  description: z.string().max(MAX_TASK_DESCRIPTION_LENGTH, "Description is too long"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  priority: z.enum(["Low", "Normal", "High"]),
});

export const validateTask = (task) => {
  try {
    taskSchema.parse(task);
    return { valid: true, errors: null };
  } catch (error) {
    return { valid: false, errors: error.issues || error.errors || [error.message] };
  }
};