
import ICAL from "ical.js";
import { determineClass, determineType } from "../utils/helpers";

self.onmessage = ({ data: text }) => {
  try {
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

      const type = determineType(summary, description);
      const className = determineClass(location, summary);

      if (className) foundClasses.add(className);

      events.push({
        id: crypto.randomUUID(),
        title: summary,
        description: description,
        location: location,
        date: startDate.toJSDate().toISOString().split("T")[0],
        time: startDate.isDate
          ? null
          : startDate.toJSDate().toTimeString().substring(0, 5),
        type: type,
        class: className || "General",
        completed: false,
      });
    });

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