import {
  unfoldLines,
  parseICSDate,
  determineClass,
  determineType,
} from "./helpers";

export const processICSContent = (
  text,
  currentClassColors,
  handleSetClassColors,
  isAuthorized,
  bulkAddEvents,
  setEvents,
) => {
  try {
    const unfolded = unfoldLines(text);
    const lines = unfolded.split(/\r\n|\n|\r/);
    const newEvents = [];
    let currentEvent = null;
    let inEvent = false;
    const foundClasses = new Set();

    for (const line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) {
        inEvent = true;
        currentEvent = {};
      } else if (line.startsWith("END:VEVENT")) {
        if (currentEvent) {
          const type = determineType(
            currentEvent.title,
            currentEvent.description,
          );
          const className = determineClass(
            currentEvent.location,
            currentEvent.title,
          );
          currentEvent.type = type;
          currentEvent.class = className;
          if (className) foundClasses.add(className);
          if (!currentEvent.id)
            currentEvent.id =
              Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
          newEvents.push(currentEvent);
        }
        inEvent = false;
        currentEvent = null;
      } else if (inEvent) {
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":");
        if (key.includes("DTSTART")) currentEvent.date = parseICSDate(value);
        if (key.includes("SUMMARY")) currentEvent.title = value;
        if (key.includes("LOCATION")) currentEvent.location = value;
        if (key.includes("DESCRIPTION")) currentEvent.description = value;
      }
    }

    // Color Logic
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
    return { success: false, error: e.message };
  }
};
