import ICAL from "ical.js"; // Requires npm install ical.js
import { determineClass, determineType } from "./helpers";

export const processICSContent = (
  text,
  currentClassColors,
  handleSetClassColors,
  isAuthorized,
  bulkAddEvents,
  setEvents,
) => {
  try {
    // 1. Parse using Library
    const jcalData = ICAL.parse(text);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents("vevent");

    const newEvents = [];
    const foundClasses = new Set();

    vevents.forEach((vevent) => {
      const event = new ICAL.Event(vevent);

      const summary = event.summary || "";
      const description = event.description || "";
      const location = event.location || "";
      const startDate = event.startDate;

      // Skip if no date
      if (!startDate) return;

      const type = determineType(summary, description);
      const className = determineClass(location, summary);

      if (className) foundClasses.add(className);

      newEvents.push({
        id: crypto.randomUUID(), // Secure ID
        title: summary,
        description: description,
        location: location,
        // Convert ICAL date to YYYY-MM-DD
        date: startDate.toJSDate().toISOString().split("T")[0],
        time: startDate.isDate
          ? null
          : startDate.toJSDate().toTimeString().substring(0, 5),
        type: type,
        class: className || "General",
        completed: false,
      });
    });

    // Color Logic (Same as before)
    let finalColors = { ...currentClassColors };
    const defaultPalette = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
    ];
    let colorIndex = Object.keys(finalColors).length;

    foundClasses.forEach((cls) => {
      if (!finalColors[cls]) {
        finalColors[cls] = defaultPalette[colorIndex % defaultPalette.length];
        colorIndex++;
      }
    });

    handleSetClassColors(finalColors);

    if (isAuthorized) {
      bulkAddEvents(newEvents);
    } else {
      setEvents((prev) => [...prev, ...newEvents]);
    }

    return { success: true, count: newEvents.length };
  } catch (e) {
    console.error("ICS Parse Error", e);
    return { success: false, error: "Failed to parse ICS file. Is it valid?" };
  }
};
