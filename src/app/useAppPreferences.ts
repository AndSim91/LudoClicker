import { useEffect, useState } from "react";
import { GAME_CONFIG } from "../game/config";
import { STORAGE_KEYS } from "../shared/storageKeys";

// ponytail: one-off migration from the short-lived separate "skin" preference.
const LEGACY_SKIN_KEY = "oggetto-nuovi-iscritti.skin";

function readInitialDarkMode(): boolean {
  const legacySkin = localStorage.getItem(LEGACY_SKIN_KEY);
  if (legacySkin !== null) return legacySkin !== "ufficio";
  // The dark theme is Modalità Onde, the default look; light is the Outlook camouflage.
  return localStorage.getItem(STORAGE_KEYS.theme) !== "light";
}

/**
 * Andrea's weight order: Onde > Outlook > Onde senza animazioni > Outlook senza
 * animazioni. The lighter modes advance the game in longer steps (deadlines
 * grouped over 0,5 or 1 s), so a slow processor does a fraction of the work.
 */
export function getTickStepMs(darkMode: boolean, reduceMotion: boolean): number {
  if (!reduceMotion) return GAME_CONFIG.minTickStepMs;
  return darkMode ? 500 : 1_000;
}

export function useAppPreferences() {
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true",
  );
  const [darkMode, setDarkMode] = useState(readInitialDarkMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.reduceMotion, String(reduceMotion));
    // On <html> so it also reaches the layers rendered outside the shell (moments, duel, Reptile, tutorial).
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
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
