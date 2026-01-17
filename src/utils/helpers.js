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

// NEW: Helper to parse time from ICS date string (e.g., 20230101T143000)
export const parseICSTime = (dateStr) => {
  if (!dateStr || !dateStr.includes("T")) return "";

  // Remove trailing Z (UTC) if present to simplify, or handle timezone logic here if needed.
  // Currently treating as floating/local time for simplicity.
  const clean = dateStr.replace(/Z$/, "");

  const timePart = clean.split("T")[1];
  if (!timePart) return "";

  const match = /(\d{2})(\d{2})/.exec(timePart);
  if (match) return `${match[1]}:${match[2]}`;
  return "";
};

export const determineType = (summary, description) => {
  // Combine and normalize text for case-insensitive matching
  const text = (summary + " " + description || "").toLowerCase();

  // 1. Discussions & Peer Reviews
  if (text.includes("discussion") || text.includes("peer review")) {
    return "Discussion";
  }

  // 2. Office Hours & Reviews (Study sessions)
  // Check this early to prevent "Exam Review" from becoming just "Exam"
  if (
    text.includes("office hours") ||
    text.includes("review session") ||
    text.includes("help session")
  ) {
    return "Office Hours";
  }

  // 3. Quizzes
  if (text.includes("quiz")) {
    return "Quiz";
  }

  // 4. Projects
  // Priorities "Project" over "Final" (e.g. "Final Project" is a Project, not an Exam)
  if (
    text.includes("project") ||
    text.includes("milestone") ||
    text.includes("deliverable") ||
    text.includes("proposal")
  ) {
    return "Project";
  }

  // 5. Exams
  if (
    text.includes("exam") ||
    text.includes("test") ||
    text.includes("midterm") ||
    text.includes("final")
  ) {
    return "Exam";
  }

  // 6. Homework & Assignments
  // "Dropbox" and "Due" strongly imply an assignment submission
  if (
    text.includes("homework") ||
    text.includes("hw") ||
    text.includes("assignment") ||
    text.includes("dropbox") ||
    text.includes("problem set")
  ) {
    return "Homework";
  }

  // 7. Labs & Studios
  // "Studio" appeared frequently in your file as a class type
  if (text.includes("lab") || text.includes("studio")) {
    return "Lab";
  }

  // 8. Readings
  if (text.includes("reading")) {
    return "Reading";
  }

  // 9. Lectures & Class Sessions
  // Captures class meetings that aren't exams or labs
  if (
    text.includes("lecture") ||
    text.includes("recitation") ||
    text.includes("seminar") ||
    text.includes("orientation") ||
    text.includes("class")
  ) {
    return "Lecture";
  }

  // 10. Default catch-all
  // Changed to 'Event' to cover generic calendar items better than 'Assignment'
  return "Event";
};
export const determineClass = (location, summary) => {
  // Helper to validate if a string looks like a real class name
  const isValidName = (name) => {
    if (!name || name.length < 3) return false;
    // Reject times like "8:00am" or "11:59 PM"
    if (/\d/.test(name) && /am|pm/i.test(name)) return false;
    // Reject common status words if they end up as the "name"
    if (/^(due|available|assignment|zoom meeting)$/i.test(name)) return false;
    return true;
  };

  // Prioritize location because it usually contains the "Container" (Class Name)
  // whereas summary contains the "Content" (Event Name like 'Exam 1')
  const candidates = [location, summary];

  for (let rawText of candidates) {
    if (!rawText) continue;

    // --- FIX START ---
    // Force conversion to String to prevent "replace is not a function" on numbers/objects
    const text = String(rawText);
    // --- FIX END ---

    // 1. Clean up "Zoom" clutter to reveal the course info inside
    // Ex: "Zoom Online Meeting (MECE.102 - Mechanics)" -> "(MECE.102 - Mechanics)"
    let clean = text.replace(/Zoom (Online )?Meeting/i, "").trim();

    // 2. Unwrap parentheses if the whole remaining text is wrapped
    // Ex: "(MECE.102 - Mechanics)" -> "MECE.102 - Mechanics"
    if (clean.startsWith("(") && clean.endsWith(")")) {
      clean = clean.slice(1, -1).trim();
    }

    // 3. Split by common separators. " - " is the most common in your file.
    const separators = [" - ", " : ", " | "];

    for (const sep of separators) {
      if (clean.includes(sep)) {
        const parts = clean.split(sep);
        // The Class Name is usually the LAST part (e.g. "CODE - NAME")
        let name = parts[parts.length - 1].trim();

        // 4. Final Cleanup: Remove trailing trash
        name = name
          .replace(/\)$/, "") // Remove trailing ')' from "Mechanics)"
          .replace(/ - Due$/i, "") // Remove status
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
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const addDaysToDate = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export const getWeekDates = (baseDate) => {
  const current = new Date(baseDate);
  const day = current.getDay(); // 0 is Sunday
  const diff = current.getDate() - day; // adjust when day is sunday
  const start = new Date(current.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
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
    // Ensure UID is present, otherwise generate a simple one
    icsLines.push(
      `UID:${ev.id || `evt-${Math.random().toString(36).substr(2, 9)}`}`,
    );
    icsLines.push(`DTSTAMP:${now}`);

    // DTSTART
    if (ev.time) {
      const [h, m] = ev.time.split(":");
      const dt = `${formatDate(ev.date)}T${h}${m}00`;
      icsLines.push(`DTSTART:${dt}`);
    } else {
      icsLines.push(`DTSTART;VALUE=DATE:${formatDate(ev.date)}`);
    }

    icsLines.push(`SUMMARY:${ev.title}`);

    if (ev.description) {
      // Escape characters for ICS text fields
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

/**
 * src/utils/helpers.js
 * General helper functions.
 */

// Generate a secure random Room ID
export const generateRoomId = () => {
  const array = new Uint8Array(4);
  window.crypto.getRandomValues(array);
  // Convert to hex and take first 6 chars, uppercase
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 6)
    .toUpperCase();
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getContrastColor = (hexcolor) => {
  // If no color provided, default to black text
  if (!hexcolor) return "#000000";

  // Convert hex to RGB
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);

  // Calculate luminance (YIQ formula)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Returns black or white depending on background brightness
  return yiq >= 128 ? "#000000" : "#ffffff";
};
