import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/common/Icon";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import { DayNotificationEntry } from "./DayPanel";
import { getDayAlertKey, selectDayNotifications, type DayNotification } from "./dayNotifications";

/** How long an avviso stays on screen; the finger or the mouse on it stops the clock. */
export const DAY_ALERT_MS = 6_000;
const DAY_ALERT_LIMIT = 2;
const ALERT_CHECK_INTERVAL_MS = 500;

interface ShownAlert {
  key: string;
  notification: DayNotification;
}

/**
 * G4 (07/10): with La mia giornata closed, the important notifications appear
 * for a few seconds under the «Giornata» button, as the same V1 card. The list
 * of what counts as important lives in `getDayAlertKey`.
 */
export function DayAlerts({
  state: stateOverride,
  onOpenDay,
  onWatchFinal,
}: {
  state?: GameState;
  onOpenDay: () => void;
  onWatchFinal?: (resultId: string) => void;
}) {
  const state = useGameStateSlices(["contacts", "narrative", "scheduledTrials", "school", "tournaments"], stateOverride);
  const timeSource = useGameTimeSource();
  const [fallbackNow] = useState(Date.now);
  const gameNow = useGameTime(true, ALERT_CHECK_INTERVAL_MS);
  // Without a game clock (tests, previews) the first render must already know the time.
  const now = timeSource ? gameNow : gameNow || fallbackNow;
  const notifications = selectDayNotifications(state, now);
  const keyed = notifications.flatMap((notification) => {
    const key = getDayAlertKey(notification, state.school.currentMonth);
    return key ? [{ key, notification }] : [];
  });
  // Mounted only while the giornata is closed: what is already there on mount is not news.
  // Adjusted during render (React's «information from previous renders»), not in an effect.
  const [{ seen, shown }, setAlerts] = useState(() => ({
    seen: new Set(keyed.map((alert) => alert.key)) as ReadonlySet<string>,
    shown: [] as ShownAlert[],
  }));
  if (keyed.some((alert) => !seen.has(alert.key))) {
    setAlerts((previous) => {
      const fresh = keyed.filter((alert) => !previous.seen.has(alert.key));
      if (fresh.length === 0) return previous;
      return {
        seen: new Set([...previous.seen, ...fresh.map((alert) => alert.key)]),
        shown: [...previous.shown, ...fresh].slice(-DAY_ALERT_LIMIT),
      };
    });
  }

  if (shown.length === 0) return null;
  const live = new Map(notifications.map((notification) => [notification.id, notification]));
  const dismiss = (key: string) => setAlerts((previous) => ({
    ...previous,
    shown: previous.shown.filter((alert) => alert.key !== key),
  }));

  return (
    <div className="day-alerts" role="status" aria-live="polite" aria-label="Avvisi della giornata">
      {shown.map((alert) => (
        <DayAlert
          key={alert.key}
          onDone={() => dismiss(alert.key)}
          onOpen={() => {
            setAlerts((previous) => ({ ...previous, shown: [] }));
            onOpenDay();
          }}
        >
          <DayNotificationEntry
            // The live card while the notification lasts, then the copy taken when it arrived.
            notification={live.get(alert.notification.id) ?? alert.notification}
            now={now}
            isTutorialTrial={false}
            onPause={noop}
            onResume={noop}
            onWatchFinal={onWatchFinal}
          />
        </DayAlert>
      ))}
    </div>
  );
}

function noop() {}

function DayAlert({
  children,
  onDone,
  onOpen,
}: {
  children: ReactNode;
  onDone: () => void;
  onOpen: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DAY_ALERT_MS);
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => finish(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused]);

  return (
    <div
      className="day-alert"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onClick={(event) => {
        // The card opens the giornata; its own buttons («Guarda la finale», ×) keep their job.
        if (!(event.target as HTMLElement).closest("button")) onOpen();
      }}
    >
      {children}
      <button className="day-alert-close" type="button" aria-label="Chiudi l'avviso" onClick={onDone}>
        <Icon name="close" />
      </button>
      <span
        className="day-alert-timer"
        aria-hidden="true"
        style={{ animationDuration: `${DAY_ALERT_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
