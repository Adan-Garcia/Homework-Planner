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
  ArrowRight,
} from "lucide-react";
import { useUI } from "../../../context/PlannerContext";
import { useData } from "../../../context/DataContext";
import { useAuth } from "../../../context/AuthContext";

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
      
      const result = await processICSContent(text); 
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
      try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(urlInput)}`);
        if (!response.ok) throw new Error("Primary proxy refused");
        text = await response.text();
      } catch (err) {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`);
        if (!response.ok) throw new Error("All proxies failed");
        text = await response.text();
      }

      if (!text.includes("BEGIN:VCALENDAR")) {
        throw new Error("The URL returned data, but it doesn't look like a calendar file.");
      }

      const result = await processICSContent(text);
      if (result.success) setView("planner");
      else setError(result.error);

    } catch (err) {
      console.error(err);
      setError("Unable to access this calendar. Try downloading the .ics file manually.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!roomInput.trim() || !passwordInput.trim()) {
      setError("Room Code and Password are required.");
      return;
    }
    setRoomPassword(passwordInput);
    setRoomId(roomInput.toUpperCase());
    setView("planner");
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    
    
    if (!passwordInput || passwordInput.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    const newCode = roomInput.trim()
      ? roomInput.trim().toUpperCase()
      : Math.random().toString(36).substring(7).toUpperCase();

    setRoomPassword(passwordInput);
    setRoomId(newCode);
    setView("planner");
  };

  const startEmpty = () => {
    setEvents([]);
    setView("planner");
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#F2F2F7] dark:bg-black transition-colors duration-500 relative font-sans selection:bg-blue-500/30">
      
      
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[20%] w-[70%] h-[70%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
         <div className="absolute bottom-[-10%] right-[20%] w-[60%] h-[60%] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 relative z-10">
        
        
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className="p-3 rounded-full mac-glass hover:scale-110 transition-transform active:scale-95 text-secondary hover:text-primary"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        
        <div className="max-w-5xl w-full my-auto flex flex-col items-center">
          
          <header className="text-center mb-16 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] w-20 h-20 rounded-[22px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 ring-4 ring-white/20 dark:ring-white/10">
              <CalendarIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-primary mb-4 tracking-tight">
              Homework Planner
            </h1>
            <p className="text-secondary text-xl max-w-lg mx-auto leading-relaxed opacity-80">
              Your personal schedule, encrypted and synced across all your devices.
            </p>
          </header>

          {(error || authError) && (
            <div className="mb-8 mac-glass bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl flex items-center gap-3 w-full max-w-md animate-in slide-in-from-top-4 fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error || authError}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 w-full animate-in slide-in-from-bottom-12 duration-1000 fade-in fill-mode-backwards" style={{ animationDelay: '100ms' }}>
            
            <div className="mac-glass p-8 flex flex-col h-full rounded-[32px] hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#007AFF] mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-primary mb-2">Sync Devices</h3>
              <p className="text-sm text-secondary mb-8 leading-relaxed">
                Connect to an existing room or create a private sync bridge.
              </p>
              
              <form className="space-y-4 mt-auto">
                <input
                  type="text"
                  placeholder="ROOM CODE"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 text-sm mac-input-glass rounded-xl text-primary font-bold uppercase placeholder:font-normal placeholder:text-secondary/50 outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                />
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Secret Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 pl-10 text-sm mac-input-glass rounded-xl text-primary placeholder:text-secondary/50 outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  />
                  <Lock className="w-4 h-4 text-secondary/50 absolute left-3.5 top-3.5" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="submit"
                    onClick={handleConnect}
                    className="bg-[#007AFF] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#0062CC] shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                    Connect
                  </button>
                  <button
                    type="submit"
                    onClick={handleCreateNew}
                    className="bg-black/5 dark:bg-white/10 text-primary py-3 rounded-xl text-sm font-bold hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95"
                  >
                    New Room
                  </button>
                </div>
              </form>
            </div>

            
            <div className="mac-glass p-8 flex flex-col h-full rounded-[32px] hover:scale-[1.02] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-primary mb-2">Import Data</h3>
              <p className="text-sm text-secondary mb-8 leading-relaxed">
                Import from Canvas, Google Calendar, or a backup file.
              </p>

              <div className="space-y-6 mt-auto">
                <label className="block w-full group cursor-pointer">
                  <span className="text-xs font-bold uppercase text-secondary/70 mb-2 block tracking-wider">Upload .ics file</span>
                  <div className="mac-input-glass rounded-xl p-3 flex items-center justify-between group-hover:bg-white/50 dark:group-hover:bg-white/20 transition-colors">
                     <span className="text-xs text-secondary italic pl-1">Select file...</span>
                     <Upload className="w-4 h-4 text-purple-500" />
                  </div>
                  <input
                    type="file"
                    accept=".ics"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div>
                  <span className="text-xs font-bold uppercase text-secondary/70 mb-2 block tracking-wider">Fetch from URL</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 mac-input-glass rounded-xl px-4 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <button
                      onClick={handleUrlFetch}
                      disabled={isLoading || !urlInput}
                      className="bg-purple-600 text-white w-10 flex items-center justify-center rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/30"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mac-glass p-8 flex flex-col h-full rounded-[32px] hover:scale-[1.02] transition-transform duration-300 border-dashed border-2 !border-black/5 dark:!border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-500 mb-6">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-primary mb-2">Start Fresh</h3>
              <p className="text-sm text-secondary mb-8 leading-relaxed">
                Begin with a clean slate and add your tasks manually.
              </p>

              <div className="space-y-3 mt-auto">
                <button
                  onClick={startEmpty}
                  className="w-full flex items-center justify-between p-4 rounded-xl mac-input-glass hover:bg-white/60 dark:hover:bg-white/20 transition-all group border border-transparent hover:border-blue-500/30"
                >
                  <span className="text-sm font-bold text-primary">Start Empty</span>
                  <Plus className="w-4 h-4 text-secondary group-hover:text-blue-500 transition-colors" />
                </button>

                <button
                  onClick={() => openModal("jsonEdit")}
                  className="w-full flex items-center justify-between p-4 rounded-xl mac-input-glass hover:bg-white/60 dark:hover:bg-white/20 transition-all group border border-transparent hover:border-blue-500/30"
                >
                  <span className="text-sm font-bold text-primary">Paste Raw JSON</span>
                  <FileText className="w-4 h-4 text-secondary group-hover:text-blue-500 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          <footer className="mt-16 text-center opacity-60">
            <p className="text-[10px] uppercase tracking-widest text-secondary flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" /> Zero-Knowledge Architecture
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;