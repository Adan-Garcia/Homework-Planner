import React from "react";
import ReactDOM from "react-dom/client"; 
import App from "./App.jsx";
import "./index.css";

// Enforce HTTPS in production
if (import.meta.env.PROD && window.location.protocol !== "https:") {
  window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
}

// Check for Web Crypto API support before starting the app
if (!window.crypto || !window.crypto.subtle) {
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="font-size: 24px; color: #e53e3e; margin-bottom: 16px;">⚠️ Unsupported Browser</h1>
      <p style="font-size: 16px; color: #4a5568; max-width: 500px; margin-bottom: 12px;">
        This application requires Web Crypto API support for secure encryption.
      </p>
      <p style="font-size: 14px; color: #718096;">
        Please use a modern browser like Chrome, Firefox, Safari, or Edge.
      </p>
    </div>
  `;
  throw new Error("Web Crypto API is not supported in this browser");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
