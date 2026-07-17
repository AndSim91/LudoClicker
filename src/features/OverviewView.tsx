import { useState } from "react";
import type { AppView } from "../components/outlook-shell/AppRail";
import { Icon } from "../components/common/Icon";
import { GAME_CONFIG } from "../game/config";
import { getOfflineLimitMs } from "../game/offline";
import { canFoundSchool, getPrestigeRequirements } from "../game/progression";
import type { GameState, SchoolFoundationDetails } from "../game/types";
import { formatClock, formatDate } from "../shared/formatters";

type OverviewViewName = Extract<AppView, "settings">;

const titles: Record<OverviewViewName, [string, string]> = {
  settings: ["Impostazioni", "Dati locali, rete delle scuole e preferenze"],
};

interface OverviewViewProps {
  view: OverviewViewName;
  state: GameState;
  onExport: () => void;
  onImport: (raw: string) => boolean;
  onReset: () => void;
  onUpdateProfileName: (displayName: string) => void;
  onFoundSchool: (details: SchoolFoundationDetails) => void;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  reduceMotion: boolean;
  onReduceMotionChange: (enabled: boolean) => void;
}

export function OverviewView({
  view,
  state,
  onExport,
  onImport,
  onReset,
  onUpdateProfileName,
  onFoundSchool,
  darkMode,
  onDarkModeChange,
  reduceMotion,
  onReduceMotionChange,
}: OverviewViewProps) {
  const [title, subtitle] = titles[view];
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [foundation, setFoundation] = useState<SchoolFoundationDetails>({
    name: "",
    city: "",
    accentColor: "#0f6cbd",
    motto: "",
    specialization: "redazione",
  });
  const eligible = canFoundSchool(state);
  const requirements = getPrestigeRequirements(state);

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

      <section className="settings-sheet">
        <h2>Profilo email</h2>
        <p>Questo nome identifica il profilo delle bozze e delle nuove campagne.</p>
        <form
          className="profile-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const displayName = String(form.get("displayName") ?? "").trim();
            if (displayName) onUpdateProfileName(displayName);
          }}
        >
          <label htmlFor="settings-display-name"><span>Nome e cognome</span><input id="settings-display-name" name="displayName" required maxLength={GAME_CONFIG.profileNameMaxLength} defaultValue={state.profile.displayName} /></label>
          <button type="submit">Aggiorna nome</button>
        </form>
      </section>

      <section className="settings-sheet">
        <h2>Salvataggio locale</h2>
        <p>I progressi sono salvati automaticamente ogni 10 secondi e dopo le azioni importanti. Il progresso offline è limitato a {Math.round(getOfflineLimitMs(state) / 3_600_000)} ore.</p>
        <dl><div><dt>Versione salvataggio</dt><dd>{state.version}</dd></div><div><dt>Ultimo salvataggio</dt><dd>{formatClock(state.lastSavedAt)}</dd></div></dl>
        <label className="preference-check"><input type="checkbox" checked={darkMode} onChange={(event) => onDarkModeChange(event.target.checked)} /><span><strong>Tema scuro</strong><small>Usa superfici blu-notte per una lettura più riposante.</small></span></label>
        <label className="preference-check"><input type="checkbox" checked={reduceMotion} onChange={(event) => onReduceMotionChange(event.target.checked)} /><span><strong>Riduci animazioni</strong><small>Disattiva transizioni, barre animate e cursore lampeggiante.</small></span></label>
        <div className="settings-actions">
          <button type="button" onClick={onExport}>Esporta JSON</button>
          <button type="button" className={resetArmed ? "danger" : "secondary"} onClick={reset}>{resetArmed ? "Conferma: azzera definitivamente" : "Azzera salvataggio"}</button>
        </div>
        <label className="import-field"><span>Importa da JSON</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Incolla qui il contenuto esportato" /></label>
        <button type="button" className="secondary" disabled={!importText.trim()} onClick={importSave}>Importa salvataggio</button>
        {importStatus ? <p role="status" className="settings-status">{importStatus}</p> : null}
      </section>

      <section className="network-sheet">
        <div className="network-heading"><div><Icon name="people" /><span><strong>Rete delle scuole</strong><small>Reputazione {state.network.reputation} · bonus permanente +{Math.round(state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool * 100)}%</small></span></div><b>{state.network.schools.length} sedi precedenti</b></div>
        <div className="prestige-requirements" aria-label="Requisiti nuova scuola">
          <Requirement label="Iscritti storici" value={state.school.historicMembers} target={requirements.historicMembers} />
          <Requirement label="Collaboratori" value={state.collaborators.length} target={requirements.collaborators} />
          <Requirement label="Eventi completati" value={state.statistics.eventsCompleted} target={requirements.events} />
        </div>
        {state.network.schools.length > 0 ? <div className="school-archive">{state.network.schools.slice().reverse().map((school) => <article key={school.id}><div><strong>{school.name}</strong><small>{school.city} · {school.membersAtTransfer} iscritti al trasferimento</small></div><time>{formatDate(school.transferredAt)}</time></article>)}</div> : null}

        <form className="foundation-form" onSubmit={(event) => { event.preventDefault(); onFoundSchool(foundation); }}>
          <h3>Procedura apertura nuova scuola</h3>
          <p>{eligible ? "La richiesta è approvata. La fondazione è volontaria e riavvierà la progressione locale." : "Completa tutti i requisiti per ricevere l'approvazione della rete."}</p>
          <div className="foundation-fields">
            <label><span>Nome dell'Ordine</span><input required value={foundation.name} onChange={(event) => setFoundation({ ...foundation, name: event.target.value })} /></label>
            <label><span>Città</span><input required value={foundation.city} onChange={(event) => setFoundation({ ...foundation, city: event.target.value })} /></label>
            <label><span>Specializzazione</span><select value={foundation.specialization} onChange={(event) => setFoundation({ ...foundation, specialization: event.target.value as SchoolFoundationDetails["specialization"] })}><option value="redazione">Redazione · +10% scrittura</option><option value="eventi">Eventi · +10% pubblico</option><option value="accoglienza">Accoglienza · +10% conversioni</option></select></label>
            <label><span>Colore accento</span><input type="color" value={foundation.accentColor} onChange={(event) => setFoundation({ ...foundation, accentColor: event.target.value })} /></label>
            <label className="motto-field"><span>Motto facoltativo</span><input value={foundation.motto} onChange={(event) => setFoundation({ ...foundation, motto: event.target.value })} /></label>
          </div>
          <button type="submit" disabled={!eligible || !foundation.name.trim() || !foundation.city.trim()}>Fonda la nuova scuola</button>
        </form>
      </section>
    </main>
  );
}

function Requirement({ label, value, target }: { label: string; value: number; target: number }) {
  const completed = value >= target;
  return <div className={completed ? "completed" : ""}><span>{label}</span><strong>{Math.min(value, target)}/{target}</strong><small>{completed ? "Completato" : "In corso"}</small></div>;
}
