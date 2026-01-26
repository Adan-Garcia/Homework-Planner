import { addDays, startOfWeek, format } from "date-fns";

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
  const date = new Date(dateStr + "T00:00:00");
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
    "PRODID:-
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
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
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


export const urlRegex = /(https?:\/\/[^\s]+)/g;