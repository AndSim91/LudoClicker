import { useEffect, useState } from "react";
import { selectDayTrials } from "../../game/selectors";
import type { GameState, ScheduledTrial } from "../../game/types";
import { Icon } from "../common/Icon";

type AppointmentPhase = "scheduled" | "in-progress" | "enrolled" | "lost";

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getAppointmentPhase(
  trial: ScheduledTrial,
  contactStatus: GameState["contacts"][number]["status"] | undefined,
  now: number,
): AppointmentPhase {
  if (trial.status === "completed") {
    return contactStatus === "enrolled" ? "enrolled" : "lost";
  }
  return now < trial.startsAt ? "scheduled" : "in-progress";
}

const phaseLabels: Record<AppointmentPhase, string> = {
  scheduled: "",
  "in-progress": "In corso…",
  enrolled: "Iscritto",
  lost: "Non iscritto",
};

function getContactName(state: GameState, id: string) {
  const contact = state.contacts.find((candidate) => candidate.id === id);
  return contact ? `${contact.firstName} ${contact.lastName}` : "Nuovo contatto";
}

export function DayPanel({ state }: { state: GameState }) {
  const [now, setNow] = useState(() => Date.now());
  const hasPendingTrials = state.scheduledTrials.some((trial) => trial.status === "scheduled");
  const trials = selectDayTrials(state, now);

  useEffect(() => {
    if (!hasPendingTrials) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [hasPendingTrials]);

  return (
    <aside className="day-panel">
      <div className="day-heading"><strong>La mia giornata</strong><Icon name="calendar" /></div>
      <div className="today">{new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(now)}</div>
      {trials.length === 0 ? (
        <div className="day-empty"><Icon name="clock" /><strong>Nessuna prova in calendario</strong><span>Gli appuntamenti confermati compariranno qui.</span></div>
      ) : trials.map((trial) => {
        const contact = state.contacts.find((candidate) => candidate.id === trial.contactId);
        const phase = getAppointmentPhase(trial, contact?.status, now);
        const timing = phase === "scheduled"
          ? formatCountdown(trial.startsAt - now)
          : phaseLabels[phase];
        const contactName = getContactName(state, trial.contactId);

        return (
          <div
            className={`appointment appointment-${phase}`}
            aria-label={`Lezione di prova di ${contactName}: ${timing}`}
            key={trial.id}
          >
            <span className="appointment-timing">{timing}</span>
            <i />
            <div><strong>Lezione di prova</strong><span>{contactName}</span><small>Ordine delle Onde</small></div>
          </div>
        );
      })}
    </aside>
  );
}
