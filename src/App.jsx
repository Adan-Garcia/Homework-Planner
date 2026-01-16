import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Calendar as CalendarIcon,
  Settings,
  Moon,
  Sun,
  Plus,
  LayoutGrid,
  Columns,
  Rows,
  AlignLeft,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// Firebase
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";

// Utils
import { STORAGE_KEYS, PALETTE } from "./utils/constants";
import {
  unfoldLines,
  parseICSDate,
  determineType,
  determineClass,
  addDaysToDate,
  generateICS,
} from "./utils/helpers";
// Context
import {
  useEvents,
  useUI,
  EventProvider,
  UIProvider,
} from "./context/PlannerContext";

// Components
import SetupScreen from "./components/setup/SetupScreen";
import Sidebar from "./components/planner/Sidebar";
import CalendarView from "./components/planner/CalendarView";
import SettingsModal from "./components/modals/SettingsModal";
import TaskModal from "./components/modals/TaskModal";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Public Google STUN server
  ],
};

// Internal Component containing the main app logic
// We separate this so we can wrap it in Providers in the default export
function PlannerApp() {
  // --- Context Hooks (Must be called unconditionally) ---
  const {
    events,
    setEvents,
    classColors,
    setClassColors,
    hiddenClasses,
    setHiddenClasses,
    lastModified,
    syncWithRemote,
    changeLog, // <--- Use these instead
    addEvent,
    updateEvent,
    deleteEvent,
    deleteClass,
    mergeClasses,
    resetAllData,
    exportICS,
    importJsonData,
  } = useEvents();

  const {
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
  } = useUI();

  // --- Local State ---
  const [roomCode, setRoomCode] = useState(
    () => localStorage.getItem("hw_sync_room") || ""
  );
  const [syncStatus, setSyncStatus] = useState("disconnected"); // disconnected, connecting, connected, error
  const [firebaseState, setFirebaseState] = useState({
    db: null,
    user: null,
    appId: null,
  });

  // Settings JSON State
  const [jsonEditText, setJsonEditText] = useState("");

  // WebRTC Refs
  const pc = useRef(null);
  const dc = useRef(null);
  const heartbeatRef = useRef(null);
  const isHost = useRef(false);
  const processedCandidates = useRef(new Set());
  const handleSyncMessageRef = useRef(null);
  
  // DnD State
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  // --- Firebase Init ---
  useEffect(() => {
    // Only init if API key is present
    if (!import.meta.env.VITE_FIREBASE_API_KEY) return;

    try {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const appId = import.meta.env.VITE_FIREBASE_APP_ID || "default-app-id";

      const initAuth = async () => {
        await signInAnonymously(auth);
      };
      initAuth();

      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setFirebaseState({ db, user: u, appId });
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase init failed", e);
    }
  }, []);

  // --- Persistent Room Code ---
  useEffect(() => {
    localStorage.setItem("hw_sync_room", roomCode);
  }, [roomCode]);

  // --- WebRTC / Mesh Logic ---

  const cleanupRTC = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (dc.current) dc.current.close();
    if (pc.current) pc.current.close();
    pc.current = null;
    dc.current = null;
    processedCandidates.current.clear();
    setSyncStatus("disconnected");
  };

  const disconnectFromRoom = () => {
    cleanupRTC();
    setSyncStatus("disconnected");
  };

  const connectToRoom = async () => {
    const { db, appId, user } = firebaseState;
    if (!db || !user || !roomCode) {
      alert("Database not ready or room code empty.");
      return;
    }

    cleanupRTC();
    setSyncStatus("connecting");

    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "signaling",
      roomCode
    );

    try {
      const snapshot = await getDoc(docRef);
      const data = snapshot.exists() ? snapshot.data() : null;

      const now = Date.now();
      const isStale = data && now - (data.last_seen || 0) > 15000;

      if (!data || isStale) {
        await becomeHost(docRef);
      } else {
        await becomeClient(docRef);
      }
    } catch (e) {
      console.error("Connection failed", e);
      setSyncStatus("error");
    }
  };

  const becomeHost = async (docRef) => {
    isHost.current = true;
    console.log(`Becoming HOST for room: ${roomCode}`);

    pc.current = new RTCPeerConnection(RTC_CONFIG);
    const channel = pc.current.createDataChannel("planner_sync");
    setupDataChannel(channel);

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(docRef, {
          host_candidates: arrayUnion(JSON.stringify(event.candidate)),
        }).catch(() => {});
      }
    };

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    await setDoc(docRef, {
      offer: JSON.stringify(offer),
      last_seen: Date.now(),
      type: "host_active",
      host_candidates: [],
      peer_candidates: [],
    });

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      updateDoc(docRef, { last_seen: Date.now() }).catch(() => {});
    }, 5000);

    onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!pc.current) return;

      if (!pc.current.currentRemoteDescription && data.answer) {
        const answer = JSON.parse(data.answer);
        pc.current.setRemoteDescription(answer);
      }
      if (data.peer_candidates) {
        data.peer_candidates.forEach((c) => {
          if (!processedCandidates.current.has(c)) {
            processedCandidates.current.add(c);
            pc.current.addIceCandidate(JSON.parse(c)).catch(() => {});
          }
        });
      }
    });
  };

  const becomeClient = async (docRef) => {
    isHost.current = false;
    console.log(`Becoming CLIENT for room: ${roomCode}`);

    pc.current = new RTCPeerConnection(RTC_CONFIG);

    pc.current.ondatachannel = (e) => {
      setupDataChannel(e.channel);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(docRef, {
          peer_candidates: arrayUnion(JSON.stringify(event.candidate)),
        }).catch(() => {});
      }
    };

    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (Date.now() - (data.last_seen || 0) > 15000) {
        console.log("Host missing, restarting election...");
        unsubscribe();
        connectToRoom();
        return;
      }

      if (!pc.current.currentRemoteDescription && data.offer) {
        const offer = JSON.parse(data.offer);
        await pc.current.setRemoteDescription(offer);
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        await updateDoc(docRef, { answer: JSON.stringify(answer) });
      }

      if (data.host_candidates) {
        data.host_candidates.forEach((c) => {
          if (!processedCandidates.current.has(c)) {
            processedCandidates.current.add(c);
            pc.current.addIceCandidate(JSON.parse(c)).catch(() => {});
          }
        });
      }
    });
  };

  const setupDataChannel = (channel) => {
    dc.current = channel;
    channel.onopen = () => {
      setSyncStatus("connected");
      sendSyncPayload();
    };
    channel.onclose = () => {
      setSyncStatus("disconnected");
    };
    channel.onmessage = (event) => {
        if (handleSyncMessageRef.current) {
            handleSyncMessageRef.current(event);
        }
    };
  };

  const sendSyncPayload = () => {
    if (dc.current?.readyState === "open") {
      const payload = JSON.stringify({
        type: "SYNC_DATA",
        timestamp: lastModified,
        data: { changeLog, classColors, hiddenClasses }, // <--- Send changeLog
      });
      dc.current.send(payload);
    }
  };

  const handleSyncMessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "SYNC_DATA") {
        const remoteTime = msg.timestamp;
        const localTime = lastModified;

        if (remoteTime > localTime) {
          // Pass the whole data object to the context to handle log replay
          syncWithRemote(msg.data);
        } else if (localTime > remoteTime) {
          sendSyncPayload();
        }
      }
    } catch (e) {
      console.error("Sync parse error", e);
    }
  };
  handleSyncMessageRef.current = handleSyncMessage;
  useEffect(() => {
    if (syncStatus === "connected") sendSyncPayload();
  }, [events, classColors, hiddenClasses, lastModified]);

  // --- Data Handlers ---

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !targetDate) return;
    const ev = events.find((e) => e.id === id);
    if (ev) updateEvent({ ...ev, date: targetDate });
    setDraggedEventId(null);
  };

  const handleSidebarDrop = (e, targetGroup) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    let targetDate = new Date();
    if (targetGroup === "tomorrow")
      targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = targetDate.toISOString().split("T")[0];
    const ev = events.find((e) => e.id === id);
    if (ev) updateEvent({ ...ev, date: dateStr });
  };

  const handleJsonSave = () => {
    if (!jsonEditText) return;
    const result = importJsonData(jsonEditText);
    if (result.success) {
      closeModal("jsonEdit");
      if (view === "setup") setView("planner");
    } else {
      alert("Invalid JSON: " + result.error);
    }
  };

  // --- Filtering (Moved UP before conditional returns) ---
  const filteredEvents = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(0, 0, 0, 0);

    return events.filter((e) => {
      if (hiddenClasses.includes(e.class)) return false;
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter)
        return false;
      if (!showCompleted && e.completed) return false;
      const eventDate = new Date(e.date + "T00:00:00");
      if (eventDate < cutoffDate) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(query) ||
          e.class.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [events, hiddenClasses, activeTypeFilter, searchQuery, showCompleted]);

  // --- VIEW RENDERING ---

  // Common Modals (Rendered always to support JSON import from Setup)
  const renderModals = () => (
    <>
      <SettingsModal
        isOpen={modals.settings || modals.jsonEdit} // Show if either is active (jsonEdit usually inside settings, but we support standalone)
        onClose={() => {
          closeModal("settings");
          closeModal("jsonEdit");
        }}
        classColors={classColors}
        setClassColors={setClassColors}
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={() => {
          mergeClasses(mergeSource, mergeTarget);
          setMergeSource("");
          setMergeTarget("");
        }}
        deleteClass={deleteClass}
        resetAllData={resetAllData}
        showJsonEdit={modals.jsonEdit}
        setShowJsonEdit={(val) =>
          val ? openModal("jsonEdit") : closeModal("jsonEdit")
        }
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
        handleICSExport={exportICS}
        // Sync Props
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        syncStatus={syncStatus}
        connectToRoom={connectToRoom}
        disconnectFromRoom={disconnectFromRoom}
      />

      <TaskModal
        isOpen={modals.task}
        onClose={() => closeModal("task")}
        editingTask={editingTask}
        saveTask={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const isAllDay = formData.get("isAllDay") === "on";
          const baseTask = {
            title: formData.get("title"),
            time: isAllDay ? "" : formData.get("time"),
            class: formData.get("class"),
            type: formData.get("type"),
            priority: formData.get("priority") || "Medium",
            description: formData.get("description") || "",
            completed: editingTask ? editingTask.completed : false,
          };
          const startDate = formData.get("date");

          if (editingTask) {
            updateEvent({
              ...baseTask,
              date: startDate,
              id: editingTask.id,
              groupId: editingTask.groupId,
            });
          } else {
            addEvent({
              ...baseTask,
              date: startDate,
              id: `manual-${Date.now()}`,
              groupId: null,
            });
          }
          closeModal("task");
        }}
        deleteTask={(id) => {
          deleteEvent(id);
          closeModal("task");
        }}
        classColors={classColors}
      />
    </>
  );

  // Setup View
  if (view === "setup") {
    return (
      <div className="bg-white dark:bg-slate-900 min-h-screen">
        <SetupScreen />
        {renderModals()}
      </div>
    );
  }

  // Planner View
  return (
    <div
      className={`h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300`}
    >
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg hidden md:block">
            Homework Planner
          </h1>

          {syncStatus !== "disconnected" && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border animate-in fade-in ${
                syncStatus === "connected"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
            >
              {syncStatus === "connected" ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="uppercase">
                {syncStatus === "connected" ? "Synced" : "Connecting..."}
              </span>
            </div>
          )}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {[
            { id: "month", icon: LayoutGrid, label: "Month" },
            { id: "week", icon: Columns, label: "Week" },
            { id: "day", icon: Rows, label: "Day" },
            { id: "agenda", icon: AlignLeft, label: "Agenda" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setCalendarView(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                calendarView === v.id
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <v.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openTaskModal(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <div className="w-px h-5 bg-slate-200 mx-2"></div>
          <button
            onClick={() => openModal("settings")}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative"
          >
            <Settings className="w-4 h-4" />
            {syncStatus !== "disconnected" && (
              <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-white ${
                  syncStatus === "connected" ? "bg-green-500" : "bg-amber-500"
                }`}
              ></span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTypeFilter={activeTypeFilter}
          setActiveTypeFilter={setActiveTypeFilter}
          hiddenClasses={hiddenClasses}
          setHiddenClasses={setHiddenClasses}
          classColors={classColors}
          filteredEvents={filteredEvents}
          hideOverdue={hideOverdue}
          setHideOverdue={setHideOverdue}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleSidebarDrop={handleSidebarDrop}
          toggleTask={(e, id) => {
            e.stopPropagation();
            useEvents().toggleTaskCompletion(id);
          }}
          openEditTaskModal={(task) => openTaskModal(task)}
          draggedEventId={draggedEventId}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
        />
        <CalendarView
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          filteredEvents={filteredEvents}
          classColors={classColors}
          openEditTaskModal={(task) => openTaskModal(task)}
          handleDragOver={handleDragOver}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedEventId={draggedEventId}
        />
      </div>

      {renderModals()}
    </div>
  );
}

// Main Export wrapping with Providers to prevent Context errors
export default function App() {
  return (
    <EventProvider>
      <UIProvider>
        <PlannerApp />
      </UIProvider>
    </EventProvider>
  );
}
