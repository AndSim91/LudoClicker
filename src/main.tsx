import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { initializeCrashReporting } from "./game/crashReporting";
import { STORAGE_KEYS } from "./shared/storageKeys";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/people-collaborator-sectors.css";
import "./styles/people-school.css";

initializeCrashReporting();

if (localStorage.getItem(STORAGE_KEYS.theme) === "dark") {
  document.documentElement.dataset.theme = "dark";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
