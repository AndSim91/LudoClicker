import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "../shared/storageKeys";

// ponytail: one-off migration from the short-lived separate "skin" preference.
const LEGACY_SKIN_KEY = "oggetto-nuovi-iscritti.skin";

function readInitialDarkMode(): boolean {
  const legacySkin = localStorage.getItem(LEGACY_SKIN_KEY);
  if (legacySkin !== null) return legacySkin !== "ufficio";
  // The dark theme is Modalità Onde, the default look; light is the Outlook camouflage.
  return localStorage.getItem(STORAGE_KEYS.theme) !== "light";
}

export function useAppPreferences() {
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true",
  );
  const [darkMode, setDarkMode] = useState(readInitialDarkMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reduceMotion, String(reduceMotion));
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, darkMode ? "dark" : "light");
    localStorage.removeItem(LEGACY_SKIN_KEY);
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  return {
    reduceMotion,
    setReduceMotion,
    darkMode,
    setDarkMode,
  };
}
