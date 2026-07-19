import { useEffect, useMemo, useState } from "react";
import {
  SHORT_GOALS,
  getShortGoalProgress,
  getShortGoalReward,
} from "../../content/shortGoals";
import type { GameState, ScheduledTrial } from "../../game/types";
import { formatLongDate } from "../../shared/formatters";
import { Icon } from "../common/Icon";
import { ProgressBar } from "../common/ProgressBar";

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

function ShortGoalCard({ state }: { state: GameState }) {
  const definition = SHORT_GOALS[state.shortGoal.definitionId];
  const progress = Math.min(state.shortGoal.target, getShortGoalProgress(state));
  return (
    <section className="short-goal-card" aria-label="Obiettivo breve">
      <div className="short-goal-heading">
        <span>Missioni delle Onde</span>
        <b>Serie {state.shortGoal.completedCount + 1}</b>
      </div>
      <strong>{definition.title}</strong>
      <p>{definition.description}</p>
      <ProgressBar
        className="short-goal-progress"
        label={`Progresso: ${definition.title}`}
        value={progress}
        max={state.shortGoal.target}
      />
      <div className="short-goal-footer">
        <span>{progress}/{state.shortGoal.target}</span>
        <strong>Premio € {getShortGoalReward(state.shortGoal)}</strong>
      </div>
    </section>
  );
}

export function DayPanel({ state }: { state: GameState }) {
  const [now, setNow] = useState(() => Date.now());
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const currentDate = new Date(now);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  const dayTrials = useMemo(() => {
    const startOfDay = new Date(currentYear, currentMonth, currentDay).getTime();
    const endOfDay = new Date(currentYear, currentMonth, currentDay + 1).getTime();
    return state.scheduledTrials
      .filter(
        (trial) =>
          trial.status === "scheduled" ||
          (trial.startsAt >= startOfDay && trial.startsAt < endOfDay),
      )
      .slice()
      .sort((left, right) => left.startsAt - right.startsAt);
  }, [state.scheduledTrials, currentYear, currentMonth, currentDay]);
  const trials = dayTrials.filter(
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
      <div className="today">{formatLongDate(now)}</div>
      <ShortGoalCard state={state} />
      {trials.length === 0 ? (
        <div className="day-empty"><Icon name="clock" /><strong>Nessuna prova in calendario</strong><span>Gli appuntamenti confermati compariranno qui.</span></div>
      ) : trials.map((trial) => {
        const contact = contactsById.get(trial.contactId);
        const phase = getAppointmentPhase(trial, contact?.status, now);
        const timing = phase === "scheduled"
          ? formatCountdown(trial.startsAt - now)
          : phaseLabels[phase];
        const contactName = contact
          ? `${contact.firstName} ${contact.lastName}`
          : "Nuovo contatto";
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
              <div>
                <strong>Lezione di prova</strong>
                <span className={contact ? `rarity-name rarity-${contact.rarity}` : undefined}>
                  {contactName}
                </span>
                <small>Ordine delle Onde</small>
              </div>
            </div>
            {expiryProgress === null ? null : (
              <ProgressBar
                className="appointment-expiry"
                label={`Tempo residuo della notifica di ${contactName}`}
                value={expiryProgress}
              />
            )}
          </div>
        );
      })}
    </aside>
  );
}
