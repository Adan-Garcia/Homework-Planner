import { determineClass, determineType } from "./helpers";
import { API_BASE_URL } from "./constants";

/**
 * Fetch Remote ICS
 * * Fetches an ICS file from a remote URL via our backend proxy.
 * * This is necessary to avoid CORS errors when fetching directly from client.
 */
export const fetchRemoteICS = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/proxy/ical?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      // Try to parse error from backend
      try {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch calendar");
      } catch (e) {
        throw new Error(`Server Error: ${response.status}`);
      }
    }

    return await response.text();
  } catch (error) {
    console.error("ICS Fetch Error:", error);
    throw error; 
  }
};

/**
 * Process ICS Content
 * * Orchestrates the parsing of ICS text data using a Web Worker.
 * * Uses a worker to keep the UI responsive during heavy parsing of large calendar files.
 * * Also assigns random colors to newly discovered classes.
 * * @param {string} text - Raw ICS file content.
 * @param {Object} currentClassColors - Existing class->color map.
 * @param {Function} handleSetClassColors - State setter for colors.
 * @param {boolean} isAuthorized - Are we connected to a sync room?
 * @param {Function} bulkAddEvents - Function to add parsed events to state.
 * @param {Function} setEvents - Local state setter (fallback if not authorized).
 */
export const processICSContent = (
  text,
  currentClassColors,
  handleSetClassColors,
  isAuthorized,
  bulkAddEvents,
  setEvents,
) => {
  return new Promise((resolve) => {
    // Initialize Web Worker for background processing
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

      // Assign colors to any newly found classes
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

      // Add the parsed events to the application state
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