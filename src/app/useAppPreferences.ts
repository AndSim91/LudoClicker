import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "../shared/storageKeys";

export function useAppPreferences() {
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true",
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem(STORAGE_KEYS.theme) === "dark",
  );
  // Modalità Onde is the default game skin; "ufficio" is the Outlook camouflage.
  const [ondeMode, setOndeMode] = useState(
    () => localStorage.getItem(STORAGE_KEYS.skin) !== "ufficio",
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reduceMotion, String(reduceMotion));
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, darkMode ? "dark" : "light");
    localStorage.setItem(STORAGE_KEYS.skin, ondeMode ? "onde" : "ufficio");
    // Onde builds on the dark theme overrides, then repaints the tokens on top.
    document.documentElement.dataset.theme = darkMode || ondeMode ? "dark" : "light";
    document.documentElement.dataset.skin = ondeMode ? "onde" : "ufficio";
  }, [darkMode, ondeMode]);

  return {
    reduceMotion,
    setReduceMotion,
    darkMode,
    setDarkMode,
    ondeMode,
    setOndeMode,
  };
}
