import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import type { SaveFailure, SaveFailureReason, SaveOperation } from "../../game/saveDiagnostics";
import type { GameSaveStatus } from "../../game/saveStatus";
import { formatClock } from "../../shared/formatters";

interface SaveStatusPanelProps {
  status: GameSaveStatus;
  onSaveNow: () => void;
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  if (seconds === 0) return "a breve";
  if (seconds === 1) return "tra 1 secondo";
  return `tra ${seconds} secondi`;
}

const FAILURE_LABELS: Record<SaveFailureReason, string> = {
  "quota-exceeded": "lo spazio di archiviazione del browser \u00e8 esaurito",
  "storage-access-denied": "il browser ha negato l'accesso all'archiviazione locale",
  "storage-unavailable": "l'archiviazione locale del browser non \u00e8 disponibile",
  "serialization-failed":
    "i dati della partita non possono essere convertiti nel formato di salvataggio",
};

const OPERATION_LABELS: Record<SaveOperation, string> = {
  serialize: "preparazione dei dati",
  "read-current": "lettura del salvataggio esistente",
  "write-backup": "creazione della copia di sicurezza",
  "write-primary": "scrittura del salvataggio principale",
};

function getFailureSummary(error: SaveFailure | null): string {
  if (!error) return "Il browser non ha potuto memorizzare la partita. Riprova ora.";
  return `Causa: ${FAILURE_LABELS[error.reason]} durante la ${OPERATION_LABELS[error.operation]}.`;
}

function formatSerializedSize(serializedLength: number | null): string | null {
  if (serializedLength === null) return null;
  const kibibytes = (serializedLength * 2) / 1_024;
  return `dimensione stimata: ${kibibytes.toLocaleString("it-IT", {
    maximumFractionDigits: 1,
  })} KiB`;
}

export function SaveStatusPanel({ status, onSaveNow }: SaveStatusPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const lastSaved =
    status.lastSavedAt === null
      ? "Nessun salvataggio completato in questa sessione"
      : `Salvata alle ${formatClock(status.lastSavedAt)}`;
  const title =
    status.phase === "error"
      ? "Salvataggio non riuscito"
      : status.phase === "pending"
        ? "Modifiche da salvare"
        : "Partita salvata";
  const icon =
    status.phase === "error" ? "warning" : status.phase === "pending" ? "clock" : "check";
  const saveIntervalMinutes = GAME_CONFIG.saveIntervalMs / 60_000;
  const saveIntervalLabel =
    saveIntervalMinutes === 1 ? "ogni minuto" : `ogni ${saveIntervalMinutes} minuti`;

  return (
    <section className={`save-assurance is-${status.phase}`} aria-label="Stato salvataggio">
      <span className="save-assurance-icon">
        <Icon name={icon} />
      </span>
      <div>
        <div role="status" aria-live="polite" aria-atomic="true">
          <h2>{title}</h2>
          <p>
            {status.phase === "error"
              ? getFailureSummary(status.error)
              : `${lastSaved} · Salvataggio automatico ${saveIntervalLabel}`}
          </p>
        </div>
        {status.phase === "error" && status.error && (
          <details className="save-assurance-diagnostic">
            <summary>Dettagli tecnici per il bugfix</summary>
            <code>
              {[
                `codice: ${status.error.reason}`,
                `operazione: ${status.error.operation}`,
                `errore: ${status.error.errorName}`,
                `messaggio: ${status.error.errorMessage}`,
                formatSerializedSize(status.error.serializedLength),
              ]
                .filter(Boolean)
                .join(" | ")}
            </code>
          </details>
        )}
        <small>
          {status.phase === "error"
            ? "Le modifiche restano in memoria finché questa pagina rimane aperta."
            : `Prossimo salvataggio ${formatCountdown(status.nextAutoSaveAt - now)}`}
        </small>
      </div>
      <button type="button" onClick={onSaveNow}>
        Salva ora
      </button>
    </section>
  );
}
