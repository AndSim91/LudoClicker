const PREFIX = "ludoclicker.";
/** Prefisso usato fino al 10/10/2026, quando il gioco si chiamava «Oggetto: Nuovi Iscritti». */
const LEGACY_PREFIX = "oggetto-nuovi-iscritti.";

export const STORAGE_KEYS = {
  gameSave: `${PREFIX}save`,
  theme: `${PREFIX}theme`,
  reduceMotion: `${PREFIX}reduce-motion`,
  tableSortPrefix: `${PREFIX}table-sort.v1`,
  listFiltersPrefix: `${PREFIX}list-filters.v1`,
  memberView: `${PREFIX}member-view`,
  dayPanelOpen: `${PREFIX}day-panel-open`,
  crashSession: `${PREFIX}crash-session`,
  crashReport: `${PREFIX}crash-report`,
} as const;

/**
 * Sposta ogni chiave col vecchio prefisso sotto «ludoclicker.» (salvataggio,
 * backup, preferenze, ordinamenti, filtri). Se la chiave nuova c'è già vince
 * quella. Va chiamata prima di qualsiasi lettura del localStorage.
 */
export function migrateLegacyStorageKeys(storage: Storage): void {
  try {
    const legacyKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key?.startsWith(LEGACY_PREFIX) ?? false);
    for (const legacyKey of legacyKeys) {
      const key = PREFIX + legacyKey.slice(LEGACY_PREFIX.length);
      const value = storage.getItem(legacyKey);
      if (value !== null && storage.getItem(key) === null) storage.setItem(key, value);
      // Rimuove la vecchia solo se la nuova è davvero scritta (quota piena → riprova al prossimo avvio).
      if (storage.getItem(key) !== null) storage.removeItem(legacyKey);
    }
  } catch {
    // Storage bloccato (finestra privata, quota): si riprova al prossimo avvio.
  }
}
