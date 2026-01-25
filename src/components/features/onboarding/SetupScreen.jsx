import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Upload,
  Link as LinkIcon,
  Loader2,
  FileText,
  Plus,
  AlertCircle,
  Sun,
  Moon,
  Smartphone,
  Lock,
  ChevronRight,
} from "lucide-react";
import { useUI } from "../../../context/PlannerContext";
import { useData } from "../../../context/DataContext";
import { useAuth } from "../../../context/AuthContext";
import Card from "../../ui/Card";

const SetupScreen = () => {
  const { processICSContent, setEvents } = useData();
  const { setRoomId, setRoomPassword, authError } = useAuth();
  const { darkMode, setDarkMode, setView, openModal } = useUI();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = processICSContent(text);
      if (result.success) setView("planner");
      else setError(result.error);
    } catch (err) {
      setError("Failed to read file.");
    }
  };

  const handleUrlFetch = async () => {
    if (!urlInput) return;
    setIsLoading(true);
    setError("");

    try {
      let text;
      
      // Strategy: Try robust proxy first, fallback to legacy if needed
      try {
        // Primary: corsproxy.io
        // It handles redirects and tokens much better than allorigins
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(urlInput)}`);
        if (!response.ok) throw new Error("Primary proxy refused");
        text = await response.text();
      } catch (err) {
        console.warn("Primary proxy failed, attempting fallback...", err);
        
        // Fallback: allorigins.win
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`);
        if (!response.ok) throw new Error("All proxies failed");
        text = await response.text();
      }

      // Validate that we actually got ICS content (basic check)
      if (!text.includes("BEGIN:VCALENDAR")) {
        throw new Error("The URL returned data, but it doesn't look like a calendar file.");
      }

      const result = processICSContent(text);
      if (result.success) {
        setView("planner");
      } else {
        setError(result.error);
      }

    } catch (err) {
      console.error(err);
      setError("Unable to access this calendar. Please download the .ics file manually and upload it instead.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!roomInput.trim() || !passwordInput.trim()) {
      setError("Room Code and Password are required to sync.");
      return;
    }
    setRoomPassword(passwordInput);
    setRoomId(roomInput.toUpperCase());
    setView("planner");
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setError("Please set a password for your new sync room.");
      return;
    }
    const newCode = roomInput.trim() || Math.random().toString(36).substring(7).toUpperCase();
    setRoomPassword(passwordInput);
    setRoomId(newCode.toUpperCase());
    setView("planner");
  };

  const startEmpty = () => {
    setEvents([]);
    setView("planner");
  };

  return (
    // FIXED: Changed min-h-screen to h-screen and added overflow-y-auto
    // This forces the scrollbar to appear on this element specifically
    <div className="h-screen w-full overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      
      {/* Container ensures content is centered but allows scrolling if it overflows */}
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 relative">
        
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setDarkMode(prev => !prev)} // Use functional update
            className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 'my-auto' helps center vertically when possible, but flows naturally when scrolling */}
        <div className="max-w-5xl w-full my-auto">
          <header className="text-center mb-12">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">
              Homework Planner
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
              Your personal schedule, encrypted and synced across all your devices.
            </p>
          </header>

          {(error || authError) && (
            <div className="mb-8 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error || authError}</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Path 1: Syncing */}
            <Card className="p-6 flex flex-col h-full border-2 border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Sync Devices</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Connect this device to an existing room or create a new private sync bridge.
              </p>
              
              <form className="space-y-3 mt-auto">
                <input
                  type="text"
                  placeholder="ROOM CODE"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Secret Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 pl-8 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="submit"
                    onClick={handleConnect}
                    className="bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Connect
                  </button>
                  <button
                    type="submit"
                    onClick={handleCreateNew}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    New Room
                  </button>
                </div>
              </form>
            </Card>

            {/* Path 2: Importing */}
            <Card className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Import Data</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Bring your schedule from Canvas, Google Calendar, or a backup file.
              </p>

              <div className="space-y-4 mt-auto">
                <label className="block w-full">
                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Upload .ics file</span>
                  <input
                    type="file"
                    accept=".ics"
                    onChange={handleFileUpload}
                    className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-400 cursor-pointer"
                  />
                </label>

                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Fetch from URL</span>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white"
                    />
                    <button
                      onClick={handleUrlFetch}
                      disabled={isLoading || !urlInput}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Path 3: Starting Fresh */}
            <Card className="p-6 flex flex-col h-full bg-slate-100/50 dark:bg-slate-800/20 border-dashed border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Start Fresh</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Begin with a clean slate and add your tasks manually one by one.
              </p>

              <div className="space-y-2 mt-auto">
                <button
                  onClick={startEmpty}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Start Empty</span>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>

                <button
                  onClick={() => openModal("jsonEdit")}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Paste Raw JSON</span>
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                </button>
              </div>
            </Card>
          </div>

          <footer className="mt-12 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Secure Zero-Knowledge Architecture. No data is stored unencrypted.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;