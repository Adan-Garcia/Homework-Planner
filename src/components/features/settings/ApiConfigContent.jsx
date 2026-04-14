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
      <div className="status-info p-4 rounded-xl text-sm">
        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Backend Configuration
        </h3>
        <p className="text-xs opacity-80">
          Configure your custom backend server for local hosting or alternative deployments.
        </p>
      </div>

      <div className="space-y-3">
        {/* Current API URL Display */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-secondary px-1 block mb-2">
            Current API URL
          </label>
          <div className="p-2.5 rounded-lg border-base bg-black/5 dark:bg-white/5 text-xs text-secondary font-mono break-all">
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
            className="w-full px-3 py-2.5 rounded-lg text-sm surface-input text-input placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[9px] text-secondary mt-1 px-1">
            Examples: https://localhost:3000/backend, https://api.example.com/backend
          </p>
        </div>

        {/* Test Status */}
        {testStatus && (
          <div className={testStatus === "testing" ? "status-info" : testStatus === "success" ? "status-success" : "status-error"}>
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
          <div className="status-success text-xs">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === "testing" || !apiUrl.trim()}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors btn-primary disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-secondary"
          >
            {testStatus === "testing" ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={apiUrl === getApiBaseUrl()}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-secondary"
          >
            Save
          </button>
          <button
            onClick={handleReset}
            title="Reset to default production API"
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors btn-secondary"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="status-warning text-[9px]">
        <strong>⚠️ Note:</strong> Changing the API URL will require page reload to take effect on all operations.
        You may need to clear browser cache and localStorage if you encounter authentication issues.
      </div>
    </div>
  );
};

export default ApiConfigContent;
