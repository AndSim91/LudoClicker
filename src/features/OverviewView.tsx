import { useState } from "react";
import type { AppView } from "../components/outlook-shell/AppRail";
import { Icon } from "../components/common/Icon";
import { GAME_CONFIG } from "../game/config";
import { useGameStateSlices } from "../game/GameStateContext";
import type { GameSaveStatus } from "../game/saveStatus";
import type { GameState } from "../game/types";
import { SaveStatusPanel } from "./settings/SaveStatusPanel";

type OverviewViewName = Extract<AppView, "settings">;

const titles: Record<OverviewViewName, [string, string]> = {
  settings: ["Impostazioni", "Profilo, preferenze e gestione della partita"],
};

interface OverviewViewProps {
  view: OverviewViewName;
  state?: GameState;
  onExport: () => void;
  onImport: (raw: string) => boolean;
  onReset: () => void;
  onForceUpdate: () => void;
  saveStatus: GameSaveStatus;
  onSaveNow: () => void;
  onUpdateProfileName: (displayName: string) => void;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  reduceMotion: boolean;
  onReduceMotionChange: (enabled: boolean) => void;
}

export function OverviewView({
  view,
  state: stateOverride,
  onExport,
  onImport,
  onReset,
  onForceUpdate,
  saveStatus,
  onSaveNow,
  onUpdateProfileName,
  darkMode,
  onDarkModeChange,
  reduceMotion,
  onReduceMotionChange,
}: OverviewViewProps) {
  const state = useGameStateSlices(["profile", "version"], stateOverride);
  const [title, subtitle] = titles[view];
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [resetArmed, setResetArmed] = useState(false);

  const importSave = () => {
    const success = onImport(importText);
    setImportStatus(success ? "Salvataggio importato correttamente." : "Il testo non contiene un salvataggio valido.");
    if (success) setImportText("");
  };

  const reset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    onReset();
    setResetArmed(false);
  };

  return (
    <main className="overview-view settings-view">
      <header><Icon name="settings" /><div><h1>{title}</h1><p>{subtitle}</p></div></header>

      <div className="settings-layout">
        <SaveStatusPanel status={saveStatus} onSaveNow={onSaveNow} />

        <div className="settings-columns">
          <div className="settings-column">
            <section className="settings-section" aria-labelledby="settings-profile-title">
              <h2 id="settings-profile-title">Profilo</h2>
              <form
                className="settings-profile-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const displayName = String(form.get("displayName") ?? "").trim();
                  if (displayName) onUpdateProfileName(displayName);
                }}
              >
                <div><label htmlFor="settings-display-name">Nome e cognome</label><small id="settings-display-name-help">Firma usata nelle bozze e nelle nuove campagne.</small></div>
                <input id="settings-display-name" name="displayName" aria-describedby="settings-display-name-help" required maxLength={GAME_CONFIG.profileNameMaxLength} defaultValue={state.profile.displayName} />
                <button type="submit">Aggiorna nome</button>
              </form>
            </section>

            <section className="settings-section" aria-labelledby="settings-appearance-title">
              <h2 id="settings-appearance-title">Aspetto</h2>
              <label className="settings-toggle-row"><span><strong>Tema scuro</strong><small>Usa superfici blu-notte per una lettura più riposante.</small></span><input type="checkbox" checked={darkMode} onChange={(event) => onDarkModeChange(event.target.checked)} /></label>
              <label className="settings-toggle-row"><span><strong>Riduci animazioni</strong><small>Disattiva transizioni, barre animate e cursore lampeggiante.</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => onReduceMotionChange(event.target.checked)} /></label>
            </section>
          </div>

          <div className="settings-column">
            <section className="settings-section" aria-labelledby="settings-data-title">
              <h2 id="settings-data-title">Dati della partita</h2>
              <div className="settings-data-row"><span><strong>Versione salvataggio</strong><small>Formato locale attualmente in uso.</small></span><b>{state.version}</b></div>
              <div className="settings-data-row"><span><strong>Esporta salvataggio</strong><small>Scarica una copia di sicurezza in formato JSON.</small></span><button type="button" className="secondary" onClick={onExport}>Esporta salvataggio</button></div>
              <details className="settings-import-row">
                <summary><span><strong>Importa salvataggio</strong><small>Ripristina una copia esportata in precedenza.</small></span><Icon name="chevron" /></summary>
                <div className="settings-import-content">
                  <label className="import-field"><span>Contenuto JSON</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Incolla qui il contenuto esportato" /></label>
                  <button type="button" className="secondary" disabled={!importText.trim()} onClick={importSave}>Importa salvataggio</button>
                  {importStatus ? <p role="status" className="settings-status">{importStatus}</p> : null}
                </div>
              </details>
              <div className="settings-data-row is-danger"><span><strong>Azzera partita</strong><small>Cancella tutti i progressi e ricomincia da zero.</small></span><button type="button" className={resetArmed ? "danger" : "danger-link"} onClick={reset}>{resetArmed ? "Conferma azzeramento" : "Azzera partita"}</button></div>
            </section>

            <section className="settings-section settings-update-section" aria-labelledby="settings-update-title">
              <h2 id="settings-update-title">Aggiornamenti</h2>
              <div className="settings-update-row">
                <p>Salva la partita e ricarica l'ultima versione disponibile di LudoClicker.</p>
                <button type="button" onClick={onForceUpdate}>Controlla aggiornamenti</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
