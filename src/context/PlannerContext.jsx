import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { STORAGE_KEYS, PALETTE } from "../utils/constants";
import {
  unfoldLines,
  parseICSDate,
  parseICSTime, // Import the new helper
  determineClass,
  determineType,
  generateICS,
} from "../utils/helpers";

// --- Context Definitions ---
const EventContext = createContext();
const UIContext = createContext();

// --- Hooks ---
export const useEvents = () => useContext(EventContext);
export const useUI = () => useContext(UIContext);

// --- Initialization Helper ---
const loadState = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key}`, e);
    return fallback;
  }
};

// --- Providers ---

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState(() =>
    loadState(STORAGE_KEYS.EVENTS, []),
  );
  const [classColors, setClassColors] = useState(() =>
    loadState(STORAGE_KEYS.COLORS, {}),
  );
  const [hiddenClasses, setHiddenClasses] = useState(() =>
    loadState(STORAGE_KEYS.HIDDEN, []),
  );

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors));
  }, [classColors]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses));
  }, [hiddenClasses]);

  // --- Logic: Color Generation ---
  const generateColorsForNewClasses = useCallback(
    (classList, existingColors) => {
      const uniqueClasses = [...new Set(classList)];
      const newColors = { ...existingColors };
      let colorIndex = Object.keys(existingColors).length;
      uniqueClasses.forEach((cls) => {
        if (!newColors[cls]) {
          newColors[cls] = PALETTE[colorIndex % PALETTE.length];
          colorIndex++;
        }
      });
      return newColors;
    },
    [],
  );

  // --- Logic: Import ICS ---
  const processICSContent = useCallback(
    (text, shouldAppend = false) => {
      try {
        const unfolded = unfoldLines(text);
        const eventBlocks = unfolded.split("BEGIN:VEVENT");
        eventBlocks.shift();

        const parsed = eventBlocks
          .map((block, index) => {
            const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r\n|\n)/);
            const dtStartMatch = block.match(
              /DTSTART(?:;.*?)?:(.*?)(?:\r\n|\n)/,
            );
            const locationMatch = block.match(/LOCATION:(.*?)(?:\r\n|\n)/);
            const descMatch = block.match(/DESCRIPTION:(.*?)(?:\r\n|\n)/);

            if (!summaryMatch && !dtStartMatch) return null;

            const summary = summaryMatch
              ? summaryMatch[1].replace(/\\,/g, ",").replace(/\\n/g, " ").trim()
              : "Untitled";
            const rawDate = dtStartMatch ? dtStartMatch[1] : "";
            const location = locationMatch
              ? locationMatch[1]
                  .replace(/\\,/g, ",")
                  .replace(/\\n/g, " ")
                  .trim()
              : "";
            const description = descMatch
              ? descMatch[1]
                  .replace(/\\,/g, ",")
                  .replace(/\\n/g, "\n")
                  .replace(/\\;/g, ";")
              : "";

            if (summary.startsWith("END:VCALENDAR")) return null;
            const dateStr = parseICSDate(rawDate);
            const timeStr = parseICSTime(rawDate); // Extract time

            if (!dateStr) return null;

            return {
              id: `evt-${Date.now()}-${index}`,
              title: summary,
              date: dateStr,
              time: timeStr, // Use extracted time
              class: determineClass(location, summary),
              type: determineType(summary, description),
              description: description || "",
              completed: false,
              priority: "Medium",
              groupId: null,
            };
          })
          .filter(Boolean);

        parsed.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Update State
        if (shouldAppend) {
          setEvents((prev) => [...prev, ...parsed]);
          setClassColors((prev) => 
            generateColorsForNewClasses(parsed.map((e) => e.class), prev)
          );
        } else {
          setEvents(parsed);
          setClassColors((prev) => 
            generateColorsForNewClasses(parsed.map((e) => e.class), {})
          );
        }

        return {
          success: true,
          count: parsed.length,
          firstDate: parsed.length > 0 ? parsed[0].date : null,
        };
      } catch (err) {
        console.error(err);
        return { success: false, error: "Failed to parse iCal data." };
      }
    },
    [generateColorsForNewClasses],
  );

  // --- CRUD Operations ---

  const addEvent = (newEvent) => {
    setEvents((prev) => [...prev, newEvent]);
    if (!classColors[newEvent.class]) {
      setClassColors((prev) =>
        generateColorsForNewClasses([newEvent.class], prev),
      );
    }
  };

  const updateEvent = (updatedEvent, scope = "single") => {
    // Handle Series Update
    if (scope === "series" && updatedEvent.groupId) {
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.groupId === updatedEvent.groupId) {
            // Keep date/id distinct, update other props
            return {
              ...ev,
              ...updatedEvent,
              date: ev.date,
              id: ev.id,
              groupId: ev.groupId,
            };
          }
          return ev;
        }),
      );
    } else {
      // Single Update
      setEvents((prev) =>
        prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)),
      );
    }

    // Check for new class color
    if (!classColors[updatedEvent.class]) {
      setClassColors((prev) =>
        generateColorsForNewClasses([updatedEvent.class], prev),
      );
    }
  };

  const toggleTaskCompletion = (id) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return { ...e, completed: !e.completed };
        }
        return e;
      }),
    );
  };

  const deleteEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const deleteClass = (clsToDelete) => {
    setEvents((prev) => prev.filter((e) => e.class !== clsToDelete));
    setClassColors((prev) => {
      const next = { ...prev };
      delete next[clsToDelete];
      return next;
    });
    setHiddenClasses((prev) => prev.filter((c) => c !== clsToDelete));
  };

  const deleteEventsBeforeDate = (dateStr) => {
    if (!dateStr) return;
    setEvents((prev) => prev.filter((e) => e.date >= dateStr));
  };

  const removeDuplicates = () => {
    const seen = new Set();
    const uniqueEvents = [];
    let duplicatesCount = 0;

    events.forEach((ev) => {
      const signature =
        `${ev.title}|${ev.date}|${ev.time}|${ev.class}|${ev.type}`.toLowerCase();
      if (seen.has(signature)) {
        duplicatesCount++;
      } else {
        seen.add(signature);
        uniqueEvents.push(ev);
      }
    });

    if (duplicatesCount > 0) {
      setEvents(uniqueEvents);
      alert(`Removed ${duplicatesCount} duplicate events.`);
    } else {
      alert("No duplicate events found.");
    }
  };

  const mergeClasses = (source, target) => {
    if (!source || !target || source === target) return;
    setEvents((prev) =>
      prev.map((e) => (e.class === source ? { ...e, class: target } : e)),
    );
    setClassColors((prev) => {
      const next = { ...prev };
      delete next[source];
      return next;
    });
    setHiddenClasses((prev) => prev.filter((c) => c !== source));
  };

  const resetAllData = () => {
    setEvents([]);
    setClassColors({});
    setHiddenClasses([]);
    localStorage.clear();
  };

  const importJsonData = (jsonText, shouldAppend = false) => {
    try {
      const cleanedJson = jsonText
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      let imported = JSON.parse(cleanedJson);
      if (!Array.isArray(imported)) throw new Error("Root must be an array");
      imported = imported.map((e, i) => ({
        ...e,
        id: e.id || `imp-${Date.now()}-${i}`,
        completed: !!e.completed,
        class: e.class || "Imported",
        type: e.type || "General",
        title: e.title || "Untitled",
        priority: e.priority || "Medium",
        description: e.description || "",
        date: e.date || new Date().toISOString().split("T")[0],
      }));

      if (shouldAppend) {
        setEvents((prev) => [...prev, ...imported]);
        setClassColors((prev) => 
          generateColorsForNewClasses(imported.map((e) => e.class), prev)
        );
      } else {
        setEvents(imported);
        setClassColors((prev) => 
          generateColorsForNewClasses(imported.map((e) => e.class), {})
        );
      }
      return { success: true, count: imported.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const exportICS = () => generateICS(events);

  return (
    <EventContext.Provider
      value={{
        events,
        setEvents,
        classColors,
        setClassColors,
        hiddenClasses,
        setHiddenClasses,
        processICSContent,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleTaskCompletion,
        deleteClass,
        mergeClasses,
        resetAllData,
        importJsonData,
        exportICS,
        deleteEventsBeforeDate,
        removeDuplicates,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const UIProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.THEME);
      if (item) return JSON.parse(item);
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch {
      return false;
    }
  });

  const [calendarView, setCalendarView] = useState(() =>
    loadState(STORAGE_KEYS.CAL_MODE, "month"),
  );
  const [view, setView] = useState("setup");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(true);
  const [hideOverdue, setHideOverdue] = useState(false);

  const [modals, setModals] = useState({
    settings: false,
    task: false,
    jsonEdit: false,
  });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    const savedEvents = loadState(STORAGE_KEYS.EVENTS, []);
    if (savedEvents.length > 0) setView("planner");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAL_MODE, JSON.stringify(calendarView));
  }, [calendarView]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const openModal = (name) => setModals((prev) => ({ ...prev, [name]: true }));
  const closeModal = (name) =>
    setModals((prev) => ({ ...prev, [name]: false }));

  const openTaskModal = (task = null) => {
    setEditingTask(task);
    openModal("task");
  };

  return (
    <UIContext.Provider
      value={{
        darkMode,
        setDarkMode,
        calendarView,
        setCalendarView,
        view,
        setView,
        currentDate,
        setCurrentDate,
        searchQuery,
        setSearchQuery,
        activeTypeFilter,
        setActiveTypeFilter,
        showCompleted,
        setShowCompleted,
        hideOverdue,
        setHideOverdue,
        modals,
        openModal,
        closeModal,
        editingTask,
        setEditingTask,
        openTaskModal,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};