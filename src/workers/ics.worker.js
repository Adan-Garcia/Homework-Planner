// ICS Parser Worker
// * Runs in a background thread to prevent UI freezing during large file imports.
// * Responsibilities:
// 1. Parse raw ICS text using the 'ical.js' library.
// 2. Extract relevant fields (Summary, Description, Date, Location).
// 3. Apply heuristics to automatically categorize events (e.g., "MATH 101" -> Class: "MATH 101").

import ICAL from "ical.js";
import { determineClass, determineType } from "../utils/helpers";

self.onmessage = ({ data: text }) => {
  try {
    // 1. Parse the VCALENDAR object
    const jcalData = ICAL.parse(text);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents("vevent");

    const events = [];
    const foundClasses = new Set();

    vevents.forEach((vevent) => {
      const event = new ICAL.Event(vevent);
      const summary = event.summary || "";
      const description = event.description || "";
      const location = event.location || "";
      const startDate = event.startDate;

      if (!startDate) return;

      // 2. Apply Heuristics
      // We attempt to guess the "Type" (Homework vs Exam) and "Class" (e.g. CS 101)
      // based on keywords in the summary and location fields.
      const type = determineType(summary, description);
      const className = determineClass(location, summary);

      if (className) foundClasses.add(className);

      events.push({
        id: crypto.randomUUID(), // Generate a local ID for immediate use
        title: summary,
        description: description,
        location: location,
        // Convert ICal time to simplified ISO string (YYYY-MM-DD)
        date: startDate.toJSDate().toISOString().split("T")[0],
        // Handle All-Day events vs Time-based events
        time: startDate.isDate
          ? null
          : startDate.toJSDate().toTimeString().substring(0, 5),
        type: type,
        class: className || "General",
        completed: false,
      });
    });

    // Send processed data back to main thread
    self.postMessage({ 
      success: true, 
      events, 
      classes: Array.from(foundClasses) 
    });
  } catch (e) {
    self.postMessage({ 
      success: false, 
      error: "Failed to parse ICS file. Is it valid?" 
    });
  }
};