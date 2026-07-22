import {
  SHORT_GOALS,
  getShortGoalProgress,
  getShortGoalReward,
} from "../../content/shortGoals";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  DAY_NOTIFICATION_VISIBILITY_MS,
  selectDayNotifications,
  type DayNotification,
  type DayNotificationKind,
  type DayNotificationPhase,
} from "./dayNotifications";

const phaseLabels: Record<DayNotificationPhase, string> = {
  scheduled: "",
  "in-progress": "In corso…",
  enrolled: "Iscritto",
  lost: "Non iscritto",
  positive: "Novità",
  neutral: "Aggiornamento",
};

const notificationIcons: Record<DayNotificationKind, IconName> = {
  trial: "calendar",
  "direct-enrollment": "people",
  tournament: "trophy",
  "important-event": "flag",
};

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTiming(notification: DayNotification, now: number): string {
  if (notification.phase === "scheduled" && notification.startsAt !== undefined) {
    return formatCountdown(notification.startsAt - now);
  }
  return phaseLabels[notification.phase];
}

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

function DayNotificationEntry({
  notification,
  now,
  isTutorialTrial,
}: {
  notification: DayNotification;
  now: number;
  isTutorialTrial: boolean;
}) {
  const timing = getTiming(notification, now);
  const expiryRemainingMs = notification.expiresAt === undefined
    ? undefined
    : Math.min(
        DAY_NOTIFICATION_VISIBILITY_MS,
        Math.max(0, notification.expiresAt - now),
      );
  const expiryProgress = expiryRemainingMs === undefined
    ? undefined
    : Math.max(
        0,
        Math.min(
          100,
          (expiryRemainingMs / DAY_NOTIFICATION_VISIBILITY_MS) * 100,
        ),
      );
  const expiryRemainingSeconds = expiryRemainingMs === undefined
    ? undefined
    : Math.ceil(expiryRemainingMs / 1_000);
  const expiryValueText = expiryRemainingSeconds === undefined
    ? undefined
    : `${expiryRemainingSeconds} ${expiryRemainingSeconds === 1 ? "secondo" : "secondi"} rimanenti`;
  const personClassName = notification.person
    ? `rarity-name ${getRarityClassName(
        notification.person.rarity,
        notification.person.secretLegendary,
      )}`
    : undefined;
  const accessibleSubject = notification.person
    ? `${notification.title} di ${notification.person.displayName}`
    : notification.title;

  return (
    <div
      className={`appointment-entry appointment-entry-${notification.phase} day-notification-${notification.kind}`}
      data-tutorial-region={isTutorialTrial ? "first-trial-row" : undefined}
      data-tutorial-target={isTutorialTrial ? "true" : undefined}
    >
      <div
        className={`appointment appointment-${notification.phase}`}
        aria-label={`${accessibleSubject}: ${timing}`}
      >
        <span className="appointment-timing">{timing}</span>
        <i />
        <div className="appointment-copy">
          <strong className="appointment-title">
            <Icon name={notificationIcons[notification.kind]} />
            <span>{notification.title}</span>
          </strong>
          {notification.person
            ? <span className={personClassName}>{notification.person.displayName}</span>
            : null}
          <small>{notification.detail}</small>
        </div>
      </div>
      {expiryProgress === undefined ? null : (
        <ProgressBar
          className="appointment-expiry"
          label={`Tempo residuo della notifica: ${accessibleSubject}`}
          value={expiryProgress}
          durationMs={DAY_NOTIFICATION_VISIBILITY_MS}
          valueText={expiryValueText}
        />
      )}
    </div>
  );
}

export function DayPanel({ state }: { state: GameState }) {
  const now = useGameTime(true, GAME_CONFIG.progressUpdateIntervalMs);
  const notifications = selectDayNotifications(state, now);
  const tutorialTrialNotificationId = state.scheduledTrials.find(
    (trial) => trial.tutorialSceneId === "first-event",
  )?.id;

  return (
    <aside className="day-panel" data-tutorial-target="true" aria-label="La mia giornata">
      <div className="day-heading"><strong>La mia giornata</strong><Icon name="calendar" /></div>
      <ShortGoalCard state={state} />
      {notifications.length === 0 ? (
        <div className="day-empty">
          <Icon name="clock" />
          <strong>Nessuna attività in corso</strong>
          <span>Prove, iscrizioni, tornei ed eventi importanti compariranno qui.</span>
        </div>
      ) : notifications.map((notification) => (
        <DayNotificationEntry
          key={notification.id}
          notification={notification}
          now={now}
          isTutorialTrial={notification.id === `trial-${tutorialTrialNotificationId}`}
        />
      ))}
    </aside>
  );
}
