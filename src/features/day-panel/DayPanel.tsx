import {
  SHORT_GOALS,
  getShortGoalProgress,
  getShortGoalReward,
  isShortGoalActive,
} from "../../content/shortGoals";
import { GAME_CONFIG } from "../../game/config";
import { memo, useState, type CSSProperties } from "react";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { useMediaQuery } from "../../shared/useMediaQuery";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  DAY_NOTIFICATION_VISIBILITY_MS,
  getDayPipFill,
  orderDayNotifications,
  selectDayNotifications,
  type DayNotification,
  type DayNotificationKind,
  type DayNotificationPhase,
} from "./dayNotifications";
import { EquipmentQuickPanel } from "./EquipmentQuickPanel";

export const DAY_PANEL_MEDIA_QUERY = "(min-width: 1301px)";
const DAY_COUNTDOWN_UPDATE_INTERVAL_MS = 1_000;

const phaseLabels: Record<DayNotificationPhase, string> = {
  scheduled: "",
  "in-progress": "In palestra",
  enrolled: "Iscritto",
  lost: "Non iscritto",
  positive: "Novità",
  neutral: "Aggiornamento",
};

const notificationIcons: Record<DayNotificationKind, IconName> = {
  trial: "calendar",
  "trial-summary": "calendar",
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
  // The title already says it ("Iscritto al volo").
  if (notification.kind === "direct-enrollment") return "";
  if (notification.phase === "scheduled" && notification.startsAt !== undefined) {
    return formatCountdown(notification.startsAt - now);
  }
  return phaseLabels[notification.phase];
}

const ShortGoalCard = memo(function ShortGoalCard({
  state: stateOverride,
}: {
  state?: GameState;
}) {
  const state = useGameStateSlices(["shortGoal", "statistics"], stateOverride);
  if (!isShortGoalActive(state)) return null;
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
        <span>
          {progress}/{state.shortGoal.target}
        </span>
        <strong>Premio € {getShortGoalReward(state.shortGoal)}</strong>
      </div>
    </section>
  );
});

function DayNotificationEntry({
  notification,
  now,
  isTutorialTrial,
  onPause,
  onResume,
  onWatchFinal,
}: {
  notification: DayNotification;
  now: number;
  isTutorialTrial: boolean;
  onPause: () => void;
  onResume: () => void;
  onWatchFinal?: (resultId: string) => void;
}) {
  const timing = getTiming(notification, now);
  const expiryDurationMs = notification.expiryDurationMs ?? DAY_NOTIFICATION_VISIBILITY_MS;
  const expiryRemainingMs =
    notification.expiresAt === undefined
      ? undefined
      : Math.min(expiryDurationMs, Math.max(0, notification.expiresAt - now));
  const expiryProgress =
    expiryRemainingMs === undefined
      ? undefined
      : Math.max(0, Math.min(100, (expiryRemainingMs / expiryDurationMs) * 100));
  const expiryRemainingSeconds =
    expiryRemainingMs === undefined ? undefined : Math.ceil(expiryRemainingMs / 1_000);
  const expiryValueText =
    expiryRemainingSeconds === undefined
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
  const isTournament = notification.kind === "tournament";
  const tournamentScore = notification.phase === "scheduled" ? timing : "Fine";
  const tournamentStatus = notification.phase === "scheduled" ? "Al via" : undefined;
  const accessibleTiming =
    isTournament && notification.phase !== "scheduled" ? "Fine" : timing;

  return (
    <div
      className={`appointment-entry appointment-entry-${notification.phase} day-notification-${notification.kind}`}
      data-tutorial-region={isTutorialTrial ? "first-trial-row" : undefined}
      data-tutorial-target={isTutorialTrial ? "true" : undefined}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
    >
      <div
        className={`appointment appointment-${notification.phase}${isTournament ? " appointment-tournament" : ""}`}
        aria-label={`${accessibleSubject}: ${accessibleTiming}`}
      >
        {isTournament ? (
          <div className="tournament-notification-scoreboard" aria-hidden="true">
            <Icon name="trophy" />
            <strong>{tournamentScore}</strong>
            {tournamentStatus ? <span>{tournamentStatus}</span> : null}
          </div>
        ) : (
          <span className="appointment-timing">{timing}</span>
        )}
        <div className="appointment-copy">
          <strong className="appointment-title">
            {isTournament ? null : <Icon name={notificationIcons[notification.kind]} />}
            <span>{notification.title}</span>
          </strong>
          {notification.person ? (
            <span className={personClassName}>{notification.person.displayName}</span>
          ) : null}
          {notification.detail ? <small>{notification.detail}</small> : null}
          {notification.finalResultId && onWatchFinal ? (
            <button
              type="button"
              className="day-watch-final"
              onClick={() => onWatchFinal(notification.finalResultId!)}
            >
              <Icon name="play" />
              Guarda la finale
            </button>
          ) : null}
          {notification.pips ? (
            <div className="appointment-pips" aria-hidden="true">
              {notification.pips.map((pip, index) => (
                <div
                  key={index}
                  className={`appointment-pip appointment-pip-${pip.state}`}
                  style={{
                    "--pip-index": index,
                    "--pip-fill": getDayPipFill(pip, now),
                  } as CSSProperties}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {expiryProgress === undefined ? null : (
        <ProgressBar
          className="appointment-expiry"
          label={`Tempo residuo della notifica: ${accessibleSubject}`}
          value={expiryProgress}
          durationMs={expiryDurationMs}
          valueText={expiryValueText}
        />
      )}
    </div>
  );
}

function DayNotificationTimeline({
  state: stateOverride,
  onWatchFinal,
}: {
  state?: GameState;
  onWatchFinal?: (resultId: string) => void;
}) {
  const state = useGameStateSlices(
    [
      "contacts",
      "narrative",
      "scheduledTrials",
      "school",
      "tournaments",
    ],
    stateOverride,
  );
  const timeSource = useGameTimeSource();
  const [fallbackNow] = useState(Date.now);
  const [pausedNotification, setPausedNotification] = useState<{
    id: string;
    now: number;
  } | null>(null);
  const referenceGameNow = timeSource?.getNow() ?? fallbackNow;
  const referenceNotifications = selectDayNotifications(state, referenceGameNow);
  const hasSmoothProgress = referenceNotifications.some(
    (notification) => notification.expiresAt !== undefined,
  );
  const gameNow = useGameTime(
    referenceNotifications.length > 0,
    hasSmoothProgress
      ? GAME_CONFIG.progressUpdateIntervalMs
      : DAY_COUNTDOWN_UPDATE_INTERVAL_MS,
  );
  const now = timeSource ? gameNow : gameNow || referenceGameNow;
  const liveNotifications = now === referenceGameNow
    ? referenceNotifications
    : selectDayNotifications(state, now);
  const pausedNotificationSnapshot = pausedNotification
    ? selectDayNotifications(state, pausedNotification.now).find(
        (notification) => notification.id === pausedNotification.id,
      )
    : undefined;
  const notifications = pausedNotificationSnapshot
    ? orderDayNotifications([
        ...liveNotifications.filter(
          (notification) => pausedNotificationSnapshot.kind === "trial-summary"
            ? notification.kind !== "trial-summary" && (
                notification.kind !== "trial" ||
                notification.person?.rarity === "legendary" ||
                notification.person?.secretLegendary === true
              )
            : notification.id !== pausedNotificationSnapshot.id,
        ),
        pausedNotificationSnapshot,
      ])
    : liveNotifications;

  return (
    <>
      {notifications.length === 0 ? (
        <div className="day-empty">
          <Icon name="clock" />
          <strong>Giornata tranquilla</strong>
          <span>Goditela finchè dura. Qui compaiono prove, tornei ed eventi in corso.</span>
        </div>
      ) : (
        notifications.map((notification) => (
          <DayNotificationEntry
            key={notification.id}
            notification={notification}
            now={pausedNotification?.id === notification.id ? pausedNotification.now : now}
            isTutorialTrial={notification.tutorialTarget === true}
            onPause={() => setPausedNotification({ id: notification.id, now })}
            onResume={() => setPausedNotification(null)}
            onWatchFinal={onWatchFinal}
          />
        ))
      )}
    </>
  );
}

export function DayPanel({
  state: stateOverride,
  onMaintainEquipment = () => undefined,
  onBuyOfficialSwords = () => undefined,
  onWatchFinal,
}: {
  state?: GameState;
  onMaintainEquipment?: () => void;
  onBuyOfficialSwords?: (amount: 1 | 10 | 100) => void;
  onWatchFinal?: (resultId: string) => void;
}) {
  const isVisible = useMediaQuery(DAY_PANEL_MEDIA_QUERY, true);
  if (!isVisible) return null;

  return (
    <aside className="day-panel" data-tutorial-target="true" aria-label="La mia giornata">
      <div className="day-heading">
        <strong>La mia giornata</strong>
        <Icon name="calendar" />
      </div>
      <ShortGoalCard state={stateOverride} />
      <EquipmentQuickPanel
        state={stateOverride}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />
      <DayNotificationTimeline state={stateOverride} onWatchFinal={onWatchFinal} />
    </aside>
  );
}
