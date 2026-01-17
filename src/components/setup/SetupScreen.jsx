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
  Users,
  Lock,
} from "lucide-react";
import Modal from "../ui/Modal";
import { useUI } from "../../context/PlannerContext";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext"; // Added import

const SetupScreen = () => {
  const {
    processICSContent,
    setEvents,
    // setRoomId,       <-- Removed (moved to useAuth)
    // setRoomPassword, <-- Removed (moved to useAuth)
    // syncError,       <-- Removed (replaced by authError)
  } = useData();

  // Added useAuth hook to access room state and auth errors
  const { setRoomId, setRoomPassword, authError } = useAuth();

  const { darkMode, setDarkMode, setView, openModal, closeModal, modals } =
    useUI();

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
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        urlInput,
      )}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Network error");
      const text = await response.text();
      const result = processICSContent(text);
      if (result.success) setView("planner");
      else setError(result.error);
    } catch (err) {
      setError("Failed to fetch URL. CORS or network issue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setRoomPassword(passwordInput);
    setRoomId(roomInput.toUpperCase());
    setView("planner");
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    // FIX: Use the input name if provided, otherwise generate random
    const newCode = roomInput.trim()
      ? roomInput.trim().toUpperCase()
      : Math.random().toString(36).substring(7).toUpperCase();

    setRoomPassword(passwordInput);
    setRoomId(newCode);
    setView("planner");
  };

  const openJsonManual = () => {
    /* ... */
  };
  const startEmpty = () => {
    setEvents([]);
    setView("planner");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 transform rotate-3">
            <CalendarIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">
            Academic Planner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            Import your schedule to get started. We support standard ICS files
            from Canvas, Blackboard, or Google Calendar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Upload File
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Drag & drop your .ics file here or browse your computer.
            </p>
            <label className="block w-full">
              <span className="sr-only">Choose file</span>
              <input
                type="file"
                accept=".ics"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 transition-all cursor-pointer"
              />
            </label>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-900 transition-all group">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LinkIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Sync via URL
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Paste a public calendar subscription link (webcal/ics).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://canvas.instructure.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white transition-all"
              />
              <button
                onClick={handleUrlFetch}
                disabled={isLoading || !urlInput}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-sm">
                <span className="font-semibold text-slate-800 dark:text-white block">
                  Multiplayer
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Collaborate with peers in real-time.
                </span>
              </div>
            </div>
            <form className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
              <input
                type="text"
                placeholder="ROOM CODE"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                className="w-full md:w-32 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white uppercase outline-none focus:border-green-500"
              />

              <div className="relative w-full md:w-32">
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 pl-8 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-green-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  onClick={handleJoinRoom}
                  disabled={!roomInput}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Join
                </button>
                <button
                  type="submit"
                  onClick={handleCreateRoom}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
          {(error || authError) && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error || authError}</p>
            </div>
          )}
          <div className="md:col-span-2 flex justify-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-4">
              <button
                onClick={openJsonManual}
                className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> Manually enter JSON
              </button>
              <button
                onClick={startEmpty}
                className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Start Empty
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
