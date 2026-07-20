import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
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

export function SaveStatusPanel({ status, onSaveNow }: SaveStatusPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const lastSaved = status.lastSavedAt === null
    ? "Nessun salvataggio completato in questa sessione"
    : `Salvata alle ${formatClock(status.lastSavedAt)}`;
  const title = status.phase === "error"
    ? "Salvataggio non riuscito"
    : status.phase === "pending"
      ? "Modifiche da salvare"
      : "Partita salvata";
  const icon = status.phase === "error"
    ? "warning"
    : status.phase === "pending"
      ? "clock"
      : "check";
  const saveIntervalMinutes = GAME_CONFIG.saveIntervalMs / 60_000;
  const saveIntervalLabel = saveIntervalMinutes === 1
    ? "ogni minuto"
    : `ogni ${saveIntervalMinutes} minuti`;

  return (
    <section
      className={`save-assurance is-${status.phase}`}
      aria-label="Stato salvataggio"
    >
      <span className="save-assurance-icon"><Icon name={icon} /></span>
      <div>
        <div role="status" aria-live="polite" aria-atomic="true">
          <h2>{title}</h2>
          <p>
            {status.phase === "error"
              ? "Il browser non ha potuto memorizzare la partita. Riprova ora."
              : `${lastSaved} · Salvataggio automatico ${saveIntervalLabel}`}
          </p>
        </div>
        <small>
          {status.phase === "error"
            ? "Le modifiche restano in memoria finché questa pagina rimane aperta."
            : `Prossimo salvataggio ${formatCountdown(status.nextAutoSaveAt - now)}`}
        </small>
      </div>
      <button type="button" onClick={onSaveNow}>Salva ora</button>
    </section>
  );
}
