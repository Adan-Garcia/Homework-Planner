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
} from "lucide-react";
import Modal from "../ui/Modal";
import { useEvents, useUI } from "../../context/PlannerContext";

const SetupScreen = () => {
  const { processICSContent, setEvents, openTaskModal } = useEvents();
  const { darkMode, setDarkMode, setView, openModal, closeModal, modals } =
    useUI();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle File
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

  // Handle URL
  const handleUrlFetch = async () => {
    if (!urlInput) return;
    setIsLoading(true);
    setError("");
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Network error");
      const text = await response.text();
      if (!text.includes("BEGIN:VCALENDAR"))
        throw new Error("Invalid iCal data");

      const result = processICSContent(text);
      if (result.success) setView("planner");
      else setError(result.error);
    } catch (err) {
      setError("Failed to fetch URL. Try manual upload.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEmpty = () => {
    setEvents([]);
    setView("planner");
    openTaskModal(null); // Open new task modal immediately
  };

  const openJsonManual = () => {
    // We reuse the JSON modal from UI Context, usually handled by Settings,
    // but here we trigger it manually.
    // NOTE: SetupScreen doesn't usually share the SettingsModal component directly,
    // but since we moved modals to Context, we can trigger the state.
    // However, we need to make sure the Modal itself is rendered somewhere.
    // For simplicity in this layout, SetupScreen will trigger the "JsonEdit" modal
    // and we will render a local version or use the global one if MainLayout rendered it.
    // Current MainLayout renders 'SettingsModal' which contains the Json Modal.
    // But SetupScreen replaces MainLayout content.
    // So we need to render the SettingsModal (or just the JSON part) here too or move Modals to root.
    // To keep it simple: We just call openModal('jsonEdit') and render SettingsModal hidden/visible.
    openModal("jsonEdit");
  };

  // We need to render SettingsModal here to access the JSON editor if we are in Setup View
  // Importing SettingsModal here creates a circular dependency if we aren't careful,
  // but since we use default imports it's okay.
  // Actually, let's just use the `openModal` and render `SettingsModal` in `App.jsx` at the root level?
  // No, `App.jsx` renders `SetupScreen` OR `MainLayout`.
  // Let's render `SettingsModal` inside `SetupScreen` as well, effectively.
  // OR better: Move `SettingsModal` to `App.jsx` OUTSIDE the conditional view logic.
  // I will update App.jsx to render Modals at the root level so they work in both views.

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>
            Planner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Your academic life, organized.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 grid gap-6 md:grid-cols-2">
          <div className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden">
            <input
              type="file"
              accept=".ics"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Upload Calendar
            </h3>
          </div>
          <div className="flex flex-col justify-center p-6 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Import via URL
              </h3>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button
                onClick={handleUrlFetch}
                disabled={isLoading || !urlInput}
                className="w-full bg-purple-600 text-white px-3 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Fetch Calendar"
                )}
              </button>
            </div>
          </div>
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
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
