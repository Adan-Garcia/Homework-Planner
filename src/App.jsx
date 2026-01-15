import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Settings, Moon, Sun, Plus, LayoutGrid, Columns, Rows, AlignLeft, RefreshCw, Wifi, WifiOff
} from 'lucide-react';

// Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

// Utils
import { STORAGE_KEYS, PALETTE } from './utils/constants';
import { unfoldLines, parseICSDate, determineType, determineClass, addDaysToDate, generateICS, generateSyncCode } from './utils/helpers';

// Components
import SetupScreen from './components/setup/SetupScreen';
import Sidebar from './components/planner/Sidebar';
import CalendarView from './components/planner/CalendarView';
import SettingsModal from './components/modals/SettingsModal';
import TaskModal from './components/modals/TaskModal';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' } // Public Google STUN server
  ]
};

export default function App() {
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

  // --- State ---
  const [events, setEvents] = useState(() => loadState(STORAGE_KEYS.EVENTS, []));
  const [classColors, setClassColors] = useState(() => loadState(STORAGE_KEYS.COLORS, {}));
  const [hiddenClasses, setHiddenClasses] = useState(() => loadState(STORAGE_KEYS.HIDDEN, []));
  
  // Sync State
  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [firebaseState, setFirebaseState] = useState({ db: null, user: null, appId: null });
  
  // WebRTC Refs
  const pc = useRef(null);
  const dc = useRef(null);
  const isHost = useRef(false);
  const isRemoteUpdate = useRef(false);
  const processedCandidates = useRef(new Set()); // Dedup candidates

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
     try {
       const item = localStorage.getItem(STORAGE_KEYS.THEME);
       if (item) return JSON.parse(item);
       return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
     } catch {
       return false;
     }
  });

  const [calendarView, setCalendarView] = useState(() => loadState(STORAGE_KEYS.CAL_MODE, 'month'));
  
  const [view, setView] = useState(() => {
    const savedEvents = loadState(STORAGE_KEYS.EVENTS, []);
    return savedEvents.length > 0 ? 'planner' : 'setup';
  });

  // UI State
  const [hideOverdue, setHideOverdue] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [showCompleted, setShowCompleted] = useState(true);

  // DnD State
  const [draggedEventId, setDraggedEventId] = useState(null);

  // Setup Inputs
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showJsonEdit, setShowJsonEdit] = useState(false);
  const [jsonEditText, setJsonEditText] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Class Management
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.COLORS, JSON.stringify(classColors)); }, [classColors]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify(hiddenClasses)); }, [hiddenClasses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CAL_MODE, JSON.stringify(calendarView)); }, [calendarView]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- Firebase Init ---
  useEffect(() => {
    if (typeof __firebase_config === 'undefined') return;
    try {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const initAuth = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
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

  // --- WebRTC Logic ---

  const cleanupRTC = () => {
      if (dc.current) dc.current.close();
      if (pc.current) pc.current.close();
      pc.current = null;
      dc.current = null;
      processedCandidates.current.clear();
      setSyncStatus('disconnected');
  };

  const setupDataChannel = (channel) => {
      dc.current = channel;
      channel.onopen = () => {
          setSyncStatus('connected');
          // Send initial state immediately upon connection
          sendSyncData();
      };
      channel.onclose = () => setSyncStatus('disconnected');
      channel.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data.type === 'SYNC_UPDATE') {
                  isRemoteUpdate.current = true;
                  if (data.events) setEvents(data.events);
                  if (data.classColors) setClassColors(data.classColors);
                  if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                  // Reset flag after a short delay to allow state to settle
                  setTimeout(() => { isRemoteUpdate.current = false; }, 100);
              }
          } catch (e) {
              console.error("Failed to parse sync message", e);
          }
      };
  };

  const sendSyncData = () => {
      if (dc.current && dc.current.readyState === 'open' && !isRemoteUpdate.current) {
          const payload = JSON.stringify({
              type: 'SYNC_UPDATE',
              events,
              classColors,
              hiddenClasses
          });
          dc.current.send(payload);
      }
  };

  // Trigger send on local changes
  useEffect(() => {
      sendSyncData();
  }, [events, classColors, hiddenClasses]);

  const createSyncSession = async () => {
      const { db, appId } = firebaseState;
      if (!db) return;

      cleanupRTC();
      const code = generateSyncCode();
      setSyncCode(code);
      setSyncStatus('connecting');
      isHost.current = true;

      // 1. Create PC & Data Channel
      pc.current = new RTCPeerConnection(RTC_CONFIG);
      const channel = pc.current.createDataChannel("planner_sync");
      setupDataChannel(channel);

      // 2. Handle ICE Candidates
      pc.current.onicecandidate = (event) => {
          if (event.candidate) {
              const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
              updateDoc(docRef, {
                  host_candidates: arrayUnion(JSON.stringify(event.candidate))
              }).catch(() => {}); // Ignore initial write errors
          }
      };

      // 3. Create Offer
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      // 4. Write Offer to Signaling
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
      await setDoc(docRef, {
          offer: JSON.stringify(offer),
          created: Date.now()
      });

      // 5. Listen for Answer & Peer Candidates
      onSnapshot(docRef, (snap) => {
          if (!snap.exists() || !pc.current) return;
          const data = snap.data();

          if (!pc.current.currentRemoteDescription && data.answer) {
              const answer = JSON.parse(data.answer);
              pc.current.setRemoteDescription(answer);
          }

          if (data.peer_candidates) {
              data.peer_candidates.forEach(c => {
                  if (!processedCandidates.current.has(c)) {
                      processedCandidates.current.add(c);
                      pc.current.addIceCandidate(JSON.parse(c));
                  }
              });
          }
      });
  };

  const joinSyncSession = async (code) => {
      const { db, appId } = firebaseState;
      if (!db || !code) return;

      cleanupRTC();
      setSyncCode(code);
      setSyncStatus('connecting');
      isHost.current = false;

      // 1. Create PC
      pc.current = new RTCPeerConnection(RTC_CONFIG);

      // 2. Handle Data Channel (Wait for Host)
      pc.current.ondatachannel = (event) => {
          setupDataChannel(event.channel);
      };

      // 3. Handle ICE Candidates
      pc.current.onicecandidate = (event) => {
          if (event.candidate) {
              const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
              updateDoc(docRef, {
                  peer_candidates: arrayUnion(JSON.stringify(event.candidate))
              }).catch(e => console.error("Error sending candidate", e));
          }
      };

      // 4. Listen for Offer
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'signaling', code);
      onSnapshot(docRef, async (snap) => {
          if (!snap.exists() || !pc.current) return;
          const data = snap.data();

          // Handle Offer
          if (!pc.current.currentRemoteDescription && data.offer) {
              const offer = JSON.parse(data.offer);
              await pc.current.setRemoteDescription(offer);
              const answer = await pc.current.createAnswer();
              await pc.current.setLocalDescription(answer);
              
              await updateDoc(docRef, {
                  answer: JSON.stringify(answer)
              });
          }

          // Handle Host Candidates
          if (data.host_candidates) {
              data.host_candidates.forEach(c => {
                  if (!processedCandidates.current.has(c)) {
                      processedCandidates.current.add(c);
                      pc.current.addIceCandidate(JSON.parse(c));
                  }
              });
          }
      });
  };

  const leaveSyncSession = () => {
      cleanupRTC();
      setSyncCode(null);
  };

  // --- Data Processing & Setup Logic ---
  const generateColorsForNewClasses = useCallback((classList, existingColors) => {
    const uniqueClasses = [...new Set(classList)];
    const newColors = { ...existingColors };
    let colorIndex = Object.keys(existingColors).length;
    uniqueClasses.forEach(cls => {
      if (!newColors[cls]) {
        newColors[cls] = PALETTE[colorIndex % PALETTE.length];
        colorIndex++;
      }
    });
    return newColors;
  }, []);

  const processICSContent = (text) => {
    try {
      const unfolded = unfoldLines(text);
      const eventBlocks = unfolded.split('BEGIN:VEVENT');
      eventBlocks.shift();

      const parsed = eventBlocks.map((block, index) => {
        const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r\n|\n)/);
        const dtStartMatch = block.match(/DTSTART(?:;.*?)?:(.*?)(?:\r\n|\n)/);
        const locationMatch = block.match(/LOCATION:(.*?)(?:\r\n|\n)/);
        const descMatch = block.match(/DESCRIPTION:(.*?)(?:\r\n|\n)/);

        if (!summaryMatch && !dtStartMatch) return null;

        const summary = summaryMatch ? summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : 'Untitled';
        const rawDate = dtStartMatch ? dtStartMatch[1] : '';
        const location = locationMatch ? locationMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : '';
        const description = descMatch ? descMatch[1] : '';

        if (summary.startsWith('END:VCALENDAR')) return null;
        const dateStr = parseICSDate(rawDate);
        if (!dateStr) return null;

        return {
          id: `evt-${Date.now()}-${index}`,
          title: summary,
          date: dateStr,
          time: '', 
          class: determineClass(location, summary),
          type: determineType(summary, description),
          description: description || '',
          completed: false,
          priority: 'Medium',
          groupId: null 
        };
      }).filter(Boolean);

      parsed.sort((a, b) => new Date(a.date) - new Date(b.date));
      const newColors = generateColorsForNewClasses(parsed.map(e => e.class), {});

      setEvents(parsed);
      setClassColors(newColors);
      
      if (parsed.length > 0) {
        const firstDate = new Date(parsed[0].date);
        const fixedDate = new Date(firstDate.valueOf() + firstDate.getTimezoneOffset() * 60000);
        setCurrentDate(fixedDate);
      }
      
      setView('planner');
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to parse iCal data.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      processICSContent(text);
    } catch (err) {
      setError('Failed to read file.');
    }
  };

  const handleUrlFetch = async () => {
    if (!urlInput) return;
    setIsLoading(true);
    setError('');
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network error');
      const text = await response.text();
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Invalid iCal data');
      processICSContent(text);
    } catch (err) {
      setError('Failed to fetch URL. Try manual upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleICSExport = () => {
    const icsContent = generateICS(events);
    if (!icsContent) {
      alert("No events to export.");
      return;
    }
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'planner_export.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // --- Task Management ---

  const toggleTask = (e, id) => {
    e.stopPropagation();
    setEvents(prev => prev.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const saveTask = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // "All Day" Logic
    const isAllDay = formData.get('isAllDay') === 'on';
    const timeValue = isAllDay ? '' : formData.get('time');

    const baseTask = {
      title: formData.get('title'),
      time: timeValue, 
      class: formData.get('class'),
      type: formData.get('type'),
      priority: formData.get('priority') || 'Medium',
      description: formData.get('description') || '',
      completed: editingTask ? editingTask.completed : false,
    };
    
    const startDate = formData.get('date');
    const recurrence = formData.get('recurrence'); 
    const recurrenceEnd = formData.get('recurrenceEnd');
    const editScope = formData.get('editScope');

    if (!classColors[baseTask.class]) {
      setClassColors(prev => generateColorsForNewClasses([baseTask.class], prev));
    }

    if (editingTask) {
      if (editScope === 'series' && editingTask.groupId) {
          setEvents(prev => prev.map(ev => {
              // Update all events in the group (optionally could restrict to future only)
              if (ev.groupId === editingTask.groupId) {
                  return {
                      ...ev,
                      ...baseTask,
                      // Preserve the individual date and id of the series instance
                      date: ev.date, 
                      id: ev.id,
                      groupId: ev.groupId
                  };
              }
              return ev;
          }));
      } else {
          // Single Edit
          const updatedTask = { 
             ...baseTask, 
             date: startDate, 
             id: editingTask.id,
             groupId: editingTask.groupId // Keep group link if exists
          };
          setEvents(prev => prev.map(ev => ev.id === editingTask.id ? updatedTask : ev));
      }
    } else {
      // Create New
      const newEvents = [];
      let currentDateStr = startDate;
      let intervalDays = 0;
      if (recurrence === 'weekly') intervalDays = 7;
      if (recurrence === 'biweekly') intervalDays = 14;

      const newGroupId = intervalDays > 0 ? `grp-${Date.now()}` : null;

      if (intervalDays === 0 || !recurrenceEnd) {
         newEvents.push({ ...baseTask, date: startDate, id: `manual-${Date.now()}-0`, groupId: null });
      } else {
         let count = 0;
         while (currentDateStr <= recurrenceEnd && count < 52) { 
            newEvents.push({ 
                ...baseTask, 
                date: currentDateStr, 
                id: `manual-${Date.now()}-${count}`, 
                groupId: newGroupId 
            });
            currentDateStr = addDaysToDate(currentDateStr, intervalDays);
            count++;
         }
      }
      setEvents(prev => [...prev, ...newEvents]);
    }
    setShowTaskModal(false);
  };

  const deleteTask = (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setEvents(prev => prev.filter(e => e.id !== id));
      setShowTaskModal(false);
    }
  };

  const deleteClass = (clsToDelete) => {
    if (window.confirm(`Delete "${clsToDelete}"?`)) {
      setEvents(prev => prev.filter(e => e.class !== clsToDelete));
      setClassColors(prev => { const next = { ...prev }; delete next[clsToDelete]; return next; });
      setHiddenClasses(prev => prev.filter(c => c !== clsToDelete));
    }
  };

  const mergeClasses = () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    setEvents(prev => prev.map(e => e.class === mergeSource ? { ...e, class: mergeTarget } : e));
    setClassColors(prev => { const next = { ...prev }; delete next[mergeSource]; return next; });
    setHiddenClasses(prev => prev.filter(c => c !== mergeSource));
    setMergeSource('');
    setMergeTarget('');
  };

  const resetAllData = () => {
    if (window.confirm("Reset all data?")) {
      setEvents([]);
      setClassColors({});
      setHiddenClasses([]);
      localStorage.clear();
      setView('setup');
      setShowSettings(false);
    }
  };

  // --- Drag and Drop Logic ---

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

    setEvents(prev => prev.map(ev => {
      if (ev.id === id) {
        return { ...ev, date: targetDate };
      }
      return ev;
    }));
    setDraggedEventId(null);
  };

  const handleSidebarDrop = (e, targetGroup) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    
    let targetDate = new Date();
    if (targetGroup === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (targetGroup === 'today') {
        // already set to today
    } else {
        return; // Only support simple relative moves for now
    }
    
    const dateStr = targetDate.toISOString().split('T')[0];
    handleDrop(e, dateStr);
  };

  // --- Filtering ---
  const filteredEvents = useMemo(() => {
    // Cutoff: 1 Month Ago
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(0, 0, 0, 0);

    return events.filter(e => {
        if (hiddenClasses.includes(e.class)) return false;
        if (activeTypeFilter !== 'All' && e.type !== activeTypeFilter) return false;
        
        if (!showCompleted && e.completed) return false;

        // Auto-Hide Old Assignments (> 1 month)
        // Ensure date comparison treats string 'YYYY-MM-DD' as local time for accurate cutoff
        const eventDate = new Date(e.date + 'T00:00:00');
        if (eventDate < cutoffDate) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return e.title.toLowerCase().includes(query) || e.class.toLowerCase().includes(query);
        }
        return true;
    });
  }, [events, hiddenClasses, activeTypeFilter, searchQuery, showCompleted]);

  // JSON Import Helper
  const handleJsonSave = () => {
    try {
      const cleanedJson = jsonEditText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      let imported = JSON.parse(cleanedJson);
      if (!Array.isArray(imported)) throw new Error("Root must be an array");
      imported = imported.map((e, i) => ({
        ...e,
        id: e.id || `imp-${Date.now()}-${i}`,
        completed: !!e.completed,
        class: e.class || 'Imported',
        type: e.type || 'General',
        title: e.title || 'Untitled',
        priority: e.priority || 'Medium',
        description: e.description || '',
        date: e.date || new Date().toISOString().split('T')[0],
      }));
      const newColors = generateColorsForNewClasses(imported.map(e => e.class), classColors);
      setEvents(imported);
      setClassColors(newColors);
      setShowJsonEdit(false);
      setView('planner');
    } catch (e) {
      alert("Invalid JSON: " + e.message);
    }
  };

  // --- View Handling ---

  if (view === 'setup') {
    return (
      <SetupScreen
        handleFileUpload={handleFileUpload}
        handleUrlFetch={handleUrlFetch}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        isLoading={isLoading}
        error={error}
        startEmpty={() => { setEvents([]); setView('planner'); openNewTaskModal(); }}
        openJsonManual={() => { setJsonEditText('[]'); setShowJsonEdit(true); }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        // JSON modal
        showJsonEdit={showJsonEdit}
        setShowJsonEdit={setShowJsonEdit}
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
      />
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300`}>
      
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg"><CalendarIcon className="w-5 h-5 text-white" /></div>
          <h1 className="font-bold text-lg hidden md:block">Homework Planner</h1>
          {/* Sync Indicator */}
          {syncCode && (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border animate-in fade-in ${syncStatus === 'connected' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
                  {syncStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span className="uppercase">{syncStatus === 'connected' ? 'P2P Connected' : 'Connecting...'}</span>
              </div>
          )}
        </div>
        
        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {[
                { id: 'month', icon: LayoutGrid, label: 'Month' },
                { id: 'week', icon: Columns, label: 'Week' },
                { id: 'day', icon: Rows, label: 'Day' },
                { id: 'agenda', icon: AlignLeft, label: 'Agenda' }
            ].map(v => (
                <button
                    key={v.id}
                    onClick={() => setCalendarView(v.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${calendarView === v.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <v.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{v.label}</span>
                </button>
            ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={openNewTaskModal} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm"><Plus className="w-4 h-4" /> New</button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <div className="w-px h-5 bg-slate-200 mx-2"></div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
              <Settings className="w-4 h-4" />
              {syncCode && <span className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-white ${syncStatus === 'connected' ? 'bg-green-500' : 'bg-amber-500'}`}></span>}
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
          toggleTask={toggleTask}
          openEditTaskModal={openEditTaskModal}
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
          openEditTaskModal={openEditTaskModal}
          handleDragOver={handleDragOver}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedEventId={draggedEventId}
        />
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        classColors={classColors}
        setClassColors={setClassColors}
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={mergeClasses}
        deleteClass={deleteClass}
        resetAllData={resetAllData}
        // JSON editor also used inside settings
        showJsonEdit={showJsonEdit}
        setShowJsonEdit={setShowJsonEdit}
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
        handleICSExport={handleICSExport}
        // Sync Props
        syncCode={syncCode}
        syncStatus={syncStatus}
        createSyncSession={createSyncSession}
        joinSyncSession={joinSyncSession}
        leaveSyncSession={leaveSyncSession}
      />

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        editingTask={editingTask}
        saveTask={saveTask}
        deleteTask={deleteTask}
        classColors={classColors}
      />
    </div>
  );
}