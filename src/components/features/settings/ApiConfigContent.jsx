import React, { useState } from "react";
import { Server, RotateCcw, Check, AlertCircle } from "lucide-react";
import { API_BASE_URL, getApiBaseUrl, setApiBaseUrl } from "../../../utils/constants";

const ApiConfigContent = () => {
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const defaultUrl = "https://api.adangarcia.com/backend";

  // Test API connectivity
  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        timeout: 5000,
      });
      if (response.ok) {
        setTestStatus("success");
        setTestMessage("✓ Backend is reachable!");
      } else {
        setTestStatus("error");
        setTestMessage(`Server error: ${response.status}`);
      }
    } catch (error) {
      setTestStatus("error");
      setTestMessage(`Connection failed: ${error.message}`);
    }
  };

  // Save API URL to localStorage
  const handleSave = () => {
    if (!apiUrl.trim()) {
      setTestMessage("API URL cannot be empty");
      setTestStatus("error");
      return;
    }
    setApiBaseUrl(apiUrl.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setTestStatus(null);
  };

  // Reset to default
  const handleReset = () => {
    setApiUrl(defaultUrl);
    setApiBaseUrl(defaultUrl);
    setTestStatus(null);
    setTestMessage("");
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Backend Configuration
        </h3>
        <p className="text-xs text-blue-700 dark:text-blue-300 opacity-80">
          Configure your custom backend server for local hosting or alternative deployments.
        </p>
      </div>

      <div className="space-y-3">
        {/* Current API URL Display */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-secondary px-1 block mb-2">
            Current API URL
          </label>
          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-secondary font-mono break-all">
            {getApiBaseUrl()}
          </div>
        </div>

        {/* API URL Input */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-secondary px-1 block mb-2">
            Backend URL
          </label>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={defaultUrl}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[9px] text-secondary mt-1 px-1">
            Examples: https://localhost:3000/backend, https://api.example.com/backend
          </p>
        </div>

        {/* Test Status */}
        {testStatus && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testStatus === "testing"
                ? "bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-blue-700 dark:text-blue-300"
                : testStatus === "success"
                  ? "bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-300"
            }`}
          >
            {testStatus === "testing" ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>Testing connection...</span>
              </>
            ) : testStatus === "success" ? (
              <>
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{testMessage}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{testMessage}</span>
              </>
            )}
          </div>
        )}

        {/* Save Status */}
        {isSaved && (
          <div className="p-3 rounded-lg text-xs bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === "testing" || !apiUrl.trim()}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-secondary"
          >
            {testStatus === "testing" ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={apiUrl === getApiBaseUrl()}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-green-500 hover:bg-green-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-secondary"
          >
            Save
          </button>
          <button
            onClick={handleReset}
            title="Reset to default production API"
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-primary"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 text-[9px] text-orange-700 dark:text-orange-300">
        <strong>⚠️ Note:</strong> Changing the API URL will require page reload to take effect on all operations.
        You may need to clear browser cache and localStorage if you encounter authentication issues.
      </div>
    </div>
  );
};

export default ApiConfigContent;
