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

/**
 * Game rhythm per display mode (Andrea, 05/10): 0,5 s with the animations, 1 s
 * without. The Centro didattico loops its bars on its own («Un giro per
 * Forma»), so the slower rhythm does not show. Weight order stays Onde > Outlook
 * > Onde senza animazioni > Outlook senza animazioni through the graphics.
 */
export function getTickStepMs(_darkMode: boolean, reduceMotion: boolean): number {
  return reduceMotion ? 1_000 : 500;
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
