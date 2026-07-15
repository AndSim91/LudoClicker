import { useEffect, useState } from "react";
import {
  SHORT_GOALS,
  getShortGoalProgress,
  getShortGoalReward,
} from "../../content/shortGoals";
import { selectDayTrials } from "../../game/selectors";
import type { GameState, ScheduledTrial } from "../../game/types";
import { Icon } from "../common/Icon";

type AppointmentPhase = "scheduled" | "in-progress" | "enrolled" | "lost";

const COMPLETED_TRIAL_VISIBILITY_MS = 10_000;

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

function ShortGoalCard({ state }: { state: GameState }) {
  const definition = SHORT_GOALS[state.shortGoal.definitionId];
  const progress = Math.min(state.shortGoal.target, getShortGoalProgress(state));
  const percentage = Math.round((progress / state.shortGoal.target) * 100);
  return (
    <section className="short-goal-card" aria-label="Obiettivo breve">
      <div className="short-goal-heading">
        <span>Priorità della settimana</span>
        <b>Serie {state.shortGoal.completedCount + 1}</b>
      </div>
      <strong>{definition.title}</strong>
      <p>{definition.description}</p>
      <div
        className="short-goal-progress"
        role="progressbar"
        aria-label={`Progresso: ${definition.title}`}
        aria-valuemin={0}
        aria-valuemax={state.shortGoal.target}
        aria-valuenow={progress}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="short-goal-footer">
        <span>{progress}/{state.shortGoal.target}</span>
        <strong>Premio € {getShortGoalReward(state.shortGoal)}</strong>
      </div>
    </section>
  );
}

export function DayPanel({ state }: { state: GameState }) {
  const [now, setNow] = useState(() => Date.now());
  const trials = selectDayTrials(state, now).filter(
    (trial) =>
      trial.status === "scheduled" ||
      now < trial.resolvesAt + COMPLETED_TRIAL_VISIBILITY_MS,
  );
  const hasLiveNotifications = trials.some(
    (trial) =>
      trial.status === "scheduled" ||
      now < trial.resolvesAt + COMPLETED_TRIAL_VISIBILITY_MS,
  );

  useEffect(() => {
    if (!hasLiveNotifications) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [hasLiveNotifications]);

  return (
    <aside className="day-panel">
      <div className="day-heading"><strong>La mia giornata</strong><Icon name="calendar" /></div>
      <div className="today">{new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(now)}</div>
      <ShortGoalCard state={state} />
      {trials.length === 0 ? (
        <div className="day-empty"><Icon name="clock" /><strong>Nessuna prova in calendario</strong><span>Gli appuntamenti confermati compariranno qui.</span></div>
      ) : trials.map((trial) => {
        const contact = state.contacts.find((candidate) => candidate.id === trial.contactId);
        const phase = getAppointmentPhase(trial, contact?.status, now);
        const timing = phase === "scheduled"
          ? formatCountdown(trial.startsAt - now)
          : phaseLabels[phase];
        const contactName = getContactName(state, trial.contactId);
        const expiryProgress = trial.status === "completed"
          ? Math.max(
              0,
              Math.min(
                100,
                ((trial.resolvesAt + COMPLETED_TRIAL_VISIBILITY_MS - now) /
                  COMPLETED_TRIAL_VISIBILITY_MS) * 100,
              ),
            )
          : null;

        return (
          <div className={`appointment-entry appointment-entry-${phase}`} key={trial.id}>
            <div
              className={`appointment appointment-${phase}`}
              aria-label={`Lezione di prova di ${contactName}: ${timing}`}
            >
              <span className="appointment-timing">{timing}</span>
              <i />
              <div><strong>Lezione di prova</strong><span>{contactName}</span><small>Ordine delle Onde</small></div>
            </div>
            {expiryProgress === null ? null : (
              <div
                className="appointment-expiry"
                role="progressbar"
                aria-label={`Tempo residuo della notifica di ${contactName}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.ceil(expiryProgress)}
              >
                <span style={{ width: `${expiryProgress}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
