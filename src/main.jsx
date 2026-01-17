//
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { UIProvider } from "./context/PlannerContext"; // Renamed or extracted UI logic

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
