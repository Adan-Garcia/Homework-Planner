
import { determineClass, determineType } from "./helpers";

export const processICSContent = (
  text,
  currentClassColors,
  handleSetClassColors,
  isAuthorized,
  bulkAddEvents,
  setEvents,
) => {
  return new Promise((resolve) => {
    // Initialize Worker
    const worker = new Worker(new URL('../workers/ics.worker.js', import.meta.url), {
      type: 'module',
    });

    worker.postMessage(text);

    worker.onmessage = (e) => {
      const { success, events, classes, error } = e.data;
      
      if (!success) {
        worker.terminate();
        resolve({ success: false, error });
        return;
      }

      // Color Assignment Logic (Main Thread)
      let finalColors = { ...currentClassColors };
      const defaultPalette = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444", 
        "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
      ];
      let colorIndex = Object.keys(finalColors).length;

      classes.forEach((cls) => {
        if (!finalColors[cls]) {
          finalColors[cls] = defaultPalette[colorIndex % defaultPalette.length];
          colorIndex++;
        }
      });

      handleSetClassColors(finalColors);

      if (isAuthorized) {
        bulkAddEvents(events);
      } else {
        setEvents((prev) => [...prev, ...events]);
      }

      worker.terminate();
      resolve({ success: true, count: events.length });
    };

    worker.onerror = (err) => {
      console.error("Worker Error", err);
      worker.terminate();
      resolve({ success: false, error: "Worker failed to process file." });
    };
  });
};