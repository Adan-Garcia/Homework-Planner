import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Settings, Moon, Sun, Plus, LayoutGrid, Columns, Rows, AlignLeft, Wifi, WifiOff
} from 'lucide-react';

// Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Utils
import { PALETTE } from './utils/constants';
import { addDaysToDate } from './utils/helpers';

// Components
import SetupScreen from './components/setup/SetupScreen';
import Sidebar from './components/planner/Sidebar';
import CalendarView from './components/planner/CalendarView';
import SettingsModal from './components/modals/SettingsModal';
import TaskModal from './components/modals/TaskModal';

// Context & Hooks
import { useEvents, useUI } from './context/PlannerContext';
import { usePlannerSync } from './hooks/usePlannerSync';

export default function App() {
  // --- Context Hooks ---
  const { 
    events, setEvents, 
    classColors, setClassColors, 
    hiddenClasses, setHiddenClasses, 
    processICSContent, updateEvent, deleteEvent,
    toggleTaskCompletion, deleteClass, mergeClasses,
    resetAllData, importJsonData, exportICS
  } = useEvents();

  const {
    darkMode, setDarkMode,
    calendarView, setCalendarView,
    view, setView,
    setCurrentDate,
    searchQuery, setSearchQuery,
    activeTypeFilter, setActiveTypeFilter,
    showCompleted, setShowCompleted,
    hideOverdue, setHideOverdue,
    modals, openModal, closeModal,
    editingTask, openTaskModal
  } = useUI();

  // --- Local State ---
  const [firebaseState, setFirebaseState] = useState({ db: null, user: null, appId: null });
  const [draggedEventId, setDraggedEventId] = useState(null);

  // Setup Inputs
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Class Management Local Inputs
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // JSON Editor Local State
  const [jsonEditText, setJsonEditText] = useState('');

  // --- Firebase Init ---
  useEffect(() => {
    if (typeof __firebase_config === 'undefined') {
        console.error("Firebase config is missing in the environment.");
        return;
    }
    
    try {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // 1. Setup Listener FIRST to capture auth state reliably
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            console.log("Firebase Auth State Changed:", u ? `Signed in as ${u.uid}` : "Signed out");
            setFirebaseState({ db, user: u, appId });
        });

        // 2. Trigger Auth
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Firebase Auth Failed:", err);
            }
        };
        initAuth();
        
        return () => unsubscribe();
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
  }, []);

  // --- Sync Hook ---
  // We pass the firebase connection and the data we want to sync
  const { 
    syncCode, syncStatus, createSyncSession, joinSyncSession, leaveSyncSession 
  } = usePlannerSync(
    firebaseState, 
    { events, classColors, hiddenClasses, setEvents, setClassColors, setHiddenClasses }
  );

  // --- Handlers ---

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = processICSContent(text);
      if (result.success) {
          setView('planner');
          if (result.firstDate) setCurrentDate(new Date(result.firstDate + 'T00:00:00'));
      } else {
          setError(result.error || 'Failed to parse file');
      }
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
      setView('planner');
    } catch (err) {
      setError('Failed to fetch URL. Try manual upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJsonSave = () => {
      const result = importJsonData(jsonEditText);
      if (result.success) {
          closeModal('jsonEdit');
          setView('planner');
      } else {
          alert(result.error);
      }
  };

  const handleICSExport = () => {
      const content = exportICS();
      if (!content) { alert("No events"); return; }
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'planner_export.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  };

  // --- Task Operations ---

  const toggleTask = (e, id) => {
    e.stopPropagation();
    toggleTaskCompletion(id);
  };

  const openNewTaskModal = () => openTaskModal(null);
  const openEditTaskModalWrapper = (task) => openTaskModal(task);

  const saveTask = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
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
        const used = Object.values(classColors);
        const nextColor = PALETTE.find(c => !used.includes(c)) || PALETTE[0];
        setClassColors(prev => ({...prev, [baseTask.class]: nextColor }));
    }

    if (editingTask) {
      updateEvent({ ...baseTask, date: startDate, id: editingTask.id, groupId: editingTask.groupId }, editScope);
    } else {
      let currentDateStr = startDate;
      let intervalDays = 0;
      if (recurrence === 'weekly') intervalDays = 7;
      if (recurrence === 'biweekly') intervalDays = 14;

      const newGroupId = intervalDays > 0 ? `grp-${Date.now()}` : null;
      const newEvents = [];

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
    closeModal('task');
  };

  const handleDeleteTask = (id) => {
      if (window.confirm('Delete task?')) {
          deleteEvent(id);
          closeModal('task');
      }
  };

  const handleMergeClasses = () => {
      mergeClasses(mergeSource, mergeTarget);
      setMergeSource('');
      setMergeTarget('');
  };

  const handleReset = () => {
      if (window.confirm("Reset all data?")) {
          resetAllData();
          setView('setup');
          closeModal('settings');
      }
  };

  // --- Drag and Drop ---
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
    const task = events.find(ev => ev.id === id);
    if (task && targetDate) {
        updateEvent({ ...task, date: targetDate });
    }
    setDraggedEventId(null);
  };

  const handleSidebarDrop = (e, targetGroup) => {
    e.preventDefault();
    let targetDate = new Date();
    if (targetGroup === 'tomorrow') targetDate.setDate(targetDate.getDate() + 1);
    else if (targetGroup !== 'today') return;
    handleDrop(e, targetDate.toISOString().split('T')[0]);
  };

  // --- Filtering ---
  const filteredEvents = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(0, 0, 0, 0);

    return events.filter(e => {
        if (hiddenClasses.includes(e.class)) return false;
        if (activeTypeFilter !== 'All' && e.type !== activeTypeFilter) return false;
        if (!showCompleted && e.completed) return false;
        const eventDate = new Date(e.date + 'T00:00:00');
        if (eventDate < cutoffDate) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return e.title.toLowerCase().includes(query) || e.class.toLowerCase().includes(query);
        }
        return true;
    });
  }, [events, hiddenClasses, activeTypeFilter, searchQuery, showCompleted]);

  // --- Render ---

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
        openJsonManual={() => { setJsonEditText('[]'); openModal('jsonEdit'); }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        showJsonEdit={modals.jsonEdit}
        setShowJsonEdit={(v) => v ? openModal('jsonEdit') : closeModal('jsonEdit')}
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
          <button onClick={() => openModal('settings')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
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
          openEditTaskModal={openEditTaskModalWrapper}
          draggedEventId={draggedEventId}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
        />
        <CalendarView /> 
      </div>

      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        classColors={classColors}
        setClassColors={setClassColors}
        mergeSource={mergeSource}
        setMergeSource={setMergeSource}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        mergeClasses={handleMergeClasses}
        deleteClass={(cls) => deleteClass(cls)}
        resetAllData={handleReset}
        showJsonEdit={modals.jsonEdit}
        setShowJsonEdit={(v) => v ? openModal('jsonEdit') : closeModal('jsonEdit')}
        jsonEditText={jsonEditText}
        setJsonEditText={setJsonEditText}
        handleJsonSave={handleJsonSave}
        handleICSExport={handleICSExport}
        syncCode={syncCode}
        syncStatus={syncStatus}
        createSyncSession={createSyncSession}
        joinSyncSession={joinSyncSession}
        leaveSyncSession={leaveSyncSession}
      />

      <TaskModal
        isOpen={modals.task}
        onClose={() => closeModal('task')}
        editingTask={editingTask}
        saveTask={saveTask}
        deleteTask={handleDeleteTask}
        classColors={classColors}
      />
    </div>
  );
}