import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { initializeCrashReporting } from "./game/crashReporting";
import { STORAGE_KEYS } from "./shared/storageKeys";
// Modalità Onde typefaces (Fase 8), bundled so every computer shows the same letters.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/400-italic.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/people-collaborator-sectors.css";
import "./styles/people-school.css";
import "./styles/centro-didattico-outlook.css";
import "./styles/school-onde.css";
import "./styles/instructor-card.css";
import "./styles/sector-scenes.css";
import "./styles/table-sorting.css";
import "./styles/list-filter-bar.css";
import "./styles/keywords.css";

initializeCrashReporting();

if (localStorage.getItem(STORAGE_KEYS.theme) !== "light") {
  document.documentElement.dataset.theme = "dark";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
