import { GAME_CONFIG } from "../../game/config";
import { useState, type CSSProperties } from "react";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import { getPresentedRarityLabel, getRarityClassName } from "../../shared/rarityPresentation";
import { useMediaQuery } from "../../shared/useMediaQuery";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  DAY_NOTIFICATION_VISIBILITY_MS,
  getDayNotificationGroupKey,
  getDayPipFill,
  isSpecialDayPerson,
  RENEWAL_CELLS,
  getRenewalCrossedCells,
  type DayEffect,
  orderDayNotifications,
  selectDayNotifications,
  type DayNotification,
  type DayNotificationKind,
  type DayNotificationPhase,
} from "./dayNotifications";
import { StoryGoalPill } from "./StoryGoalPill";
import { ShortGoalCard } from "./ShortGoalCard";

/** Above this the panel is always a column; below it the player opens and closes it (G2, 07/10). */
export const DAY_PANEL_MEDIA_QUERY = "(min-width: 1441px)";
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
  "trials-cancelled": "warning",
  renewal: "calendar",
};

const RENEWAL_NAMES = 3;

/** Mancato rinnovo (R13, 07/10): the appello on ruled paper, names crossed out, a stamp. */
function RenewalCard({ notification }: { notification: DayNotification }) {
  const { departed, before, names } = notification.renewal!;
  const crossed = before === undefined ? undefined : getRenewalCrossedCells(departed, before);
  const others = departed - Math.min(names.length, RENEWAL_NAMES);
  return (
    <div className="appointment-entry day-renewal">
      <div
        className="appointment day-renewal-body"
        aria-label={before === undefined
          ? `${notification.title}: ${departed} iscritti non rinnovano`
          : `Rinnovi dell'anno: ${before - departed} su ${before} rinnovano`}
      >
        <span className="day-renewal-eyebrow">Rinnovi dell'anno</span>
        <strong className="day-renewal-title">
          {before === undefined
            ? `${departed} ${departed === 1 ? "iscritto non rinnova" : "iscritti non rinnovano"}`
            : `${before - departed} su ${before} rinnovano`}
        </strong>
        {crossed ? (
          <span className="day-renewal-grid" aria-hidden="true">
            {Array.from({ length: RENEWAL_CELLS }, (_, index) => (
              <i key={index} className={crossed.has(index) ? "is-crossed" : undefined} />
            ))}
          </span>
        ) : null}
        <span className="day-renewal-names">
          {names.slice(0, RENEWAL_NAMES).map((name) => <s key={name}>{name}</s>)}
          {others > 0 ? <small>{names.length > 0 ? `e altri ${others}` : `${others} iscritti`}</small> : null}
          <span className="day-renewal-stamp" aria-hidden="true">Non rinnovato</span>
        </span>
      </div>
    </div>
  );
}

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

function DayEffects({ effects }: { effects: readonly DayEffect[] }) {
  return (
    <span className="day-effects">
      {effects.map((effect, index) => (
        <span key={index} className={effect.good ? "day-effect is-good" : "day-effect is-bad"}>
          <Icon name={effect.icon} />
          {effect.amount}
          {effect.keyword ? <> <b>{effect.keyword}</b></> : null}
          {effect.text ? ` ${effect.text}` : null}
        </span>
      ))}
    </span>
  );
}

function getInitials(displayName: string): string {
  return displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getLegendaryTrialState(notification: DayNotification, timing: string): string {
  if (notification.phase === "scheduled") return timing;
  if (notification.phase === "in-progress") return "In palestra";
  if (notification.phase === "enrolled") return "Iscritto";
  return notification.detail ? "Annullata" : "Non iscritto";
}

export function DayNotificationEntry({
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
      : `${expiryRemainingSeconds} ${expiryRemainingSeconds === 1 ? "secondo rimanente" : "secondi rimanenti"}`;
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

  const expiry = expiryProgress === undefined ? null : (
    <ProgressBar
      className="appointment-expiry"
      label={`Tempo residuo della notifica: ${accessibleSubject}`}
      value={expiryProgress}
      durationMs={expiryDurationMs}
      valueText={expiryValueText}
    />
  );

  if (notification.kind === "renewal" && notification.renewal) return <RenewalCard notification={notification} />;

  // Eventi, Imprevisti and cancelled trials: the V1 «Scheda» (07/10).
  if (notification.tone && notification.eyebrow) {
    return (
      <div
        className={`appointment-entry day-card is-${notification.tone} day-notification-${notification.kind}`}
        onMouseEnter={onPause}
        onMouseLeave={onResume}
      >
        <div className="appointment day-card-body" aria-label={`${notification.eyebrow}: ${notification.title}`}>
          <span className="day-card-eyebrow">
            <Icon name={notification.tone === "bad" ? "warning" : "spark"} />
            {notification.eyebrow}
          </span>
          <strong className="day-card-title">{notification.title}</strong>
          {notification.detail ? <small>{notification.detail}</small> : null}
          {notification.effects && notification.effects.length > 0 ? <DayEffects effects={notification.effects} /> : null}
        </div>
        {expiry}
      </div>
    );
  }

  // A Legendary's trial: portrait with the countdown ring (L1 + L3, 07/10).
  if (notification.kind === "trial" && notification.person && isSpecialDayPerson(notification)) {
    const pip = notification.pips?.[0];
    const ring = notification.phase === "scheduled" && pip ? getDayPipFill(pip, now) : 1;
    const rarityClass = getRarityClassName(notification.person.rarity, notification.person.secretLegendary);
    const state = getLegendaryTrialState(notification, timing);
    return (
      <div
        className={`appointment-entry day-legend ${rarityClass} is-${notification.phase}`}
        data-tutorial-region={isTutorialTrial ? "first-trial-row" : undefined}
        data-tutorial-target={isTutorialTrial ? "true" : undefined}
        onMouseEnter={onPause}
        onMouseLeave={onResume}
      >
        <div className="appointment day-legend-body" aria-label={`${accessibleSubject}: ${state}`}>
          <span className="day-legend-ring" style={{ "--ring": ring } as CSSProperties} aria-hidden="true">
            <span className={`person-avatar ${rarityClass}`}>{getInitials(notification.person.displayName)}</span>
          </span>
          <span className="day-legend-copy">
            <span className="day-legend-rarity">
              {getPresentedRarityLabel(notification.person.rarity, notification.person.secretLegendary)}
            </span>
            <strong className={`rarity-name ${rarityClass}`}>{notification.person.displayName}</strong>
            <span className="day-legend-line">
              Lezione di prova <span className="day-legend-state">{state}</span>
            </span>
          </span>
        </div>
        {expiry}
      </div>
    );
  }

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
      {expiry}
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
            : pausedNotificationSnapshot.groupKey
            ? notification.id !== pausedNotificationSnapshot.id &&
              (isSpecialDayPerson(notification) ||
                getDayNotificationGroupKey(notification) !== pausedNotificationSnapshot.groupKey)
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
  onWatchFinal,
  open = false,
  onClose,
}: {
  state?: GameState;
  onWatchFinal?: (resultId: string) => void;
  /** Below the breakpoint: shown as a column only while open. */
  open?: boolean;
  onClose?: () => void;
}) {
  const isAlwaysOpen = useMediaQuery(DAY_PANEL_MEDIA_QUERY, true);
  if (!isAlwaysOpen && !open) return null;

  return (
    <aside className="day-panel" data-tutorial-target="true" aria-label="La mia giornata">
      <div className="day-heading">
        <strong>La mia giornata</strong>
        <StoryGoalPill state={stateOverride} />
        {isAlwaysOpen ? <Icon name="calendar" /> : (
          <button className="day-panel-close" type="button" aria-label="Chiudi La mia giornata" onClick={onClose}>
            <Icon name="close" />
          </button>
        )}
      </div>
      <ShortGoalCard state={stateOverride} />
      <DayNotificationTimeline state={stateOverride} onWatchFinal={onWatchFinal} />
    </aside>
  );
}
