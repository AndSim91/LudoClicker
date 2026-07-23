import type { AcquisitionEventDefinition } from "../content/events";
import { GAME_CONFIG } from "./config";
import type { AcquisitionEventCooldown, GameState } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getGameMonthPosition(state: GameState, now: number): number {
  const progress = clamp(
    1 - (state.school.nextFeeAt - now) / GAME_CONFIG.gameMonthMs,
    0,
    1,
  );
  return state.school.currentMonth + progress;
}

export function createEventCooldown(
  state: GameState,
  definition: AcquisitionEventDefinition,
  now: number,
): AcquisitionEventCooldown {
  if (definition.cooldown.kind === "realtime") {
    return {
      kind: "realtime",
      startedAt: now,
      availableAt: now + definition.cooldown.durationMs,
    };
  }
  return {
    kind: "calendar",
    startedMonthPosition: getGameMonthPosition(state, now),
    availableAtMonth: state.school.currentMonth + definition.cooldown.months,
  };
}

export function isEventCooldownActive(
  cooldown: AcquisitionEventCooldown | undefined,
  state: GameState,
  now: number,
): boolean {
  if (!cooldown) return false;
  return cooldown.kind === "realtime"
    ? now < cooldown.availableAt
    : state.school.currentMonth < cooldown.availableAtMonth;
}

export function getEventCooldownProgress(
  cooldown: AcquisitionEventCooldown,
  state: GameState,
  now: number,
): number {
  if (cooldown.kind === "realtime") {
    const duration = cooldown.availableAt - cooldown.startedAt;
    if (duration <= 0) return 100;
    return clamp(((now - cooldown.startedAt) / duration) * 100, 0, 100);
  }
  const duration = cooldown.availableAtMonth - cooldown.startedMonthPosition;
  if (duration <= 0) return 100;
  return clamp(
    ((getGameMonthPosition(state, now) - cooldown.startedMonthPosition) / duration) * 100,
    0,
    100,
  );
}

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatEventCooldownRemaining(
  cooldown: AcquisitionEventCooldown,
  state: GameState,
  now: number,
): string {
  if (cooldown.kind === "realtime") {
    return quantityLabel(
      Math.max(0, Math.ceil((cooldown.availableAt - now) / 1_000)),
      "secondo",
      "secondi",
    );
  }
  const remainingMonths = Math.max(
    0,
    cooldown.availableAtMonth - state.school.currentMonth,
  );
  const years = Math.floor(remainingMonths / 12);
  const months = remainingMonths % 12;
  const parts = [
    years > 0 ? quantityLabel(years, "anno", "anni") : "",
    months > 0 ? quantityLabel(months, "mese", "mesi") : "",
  ].filter(Boolean);
  return parts.join(" e ") || "0 mesi";
}

export function getNextRealtimeEventCooldownDeadline(
  state: GameState,
  now: number,
): number | undefined {
  return Object.values(state.activities.eventCooldowns).reduce<number | undefined>(
    (earliest, cooldown) => {
      if (!cooldown || cooldown.kind !== "realtime" || cooldown.availableAt <= now) {
        return earliest;
      }
      return earliest === undefined
        ? cooldown.availableAt
        : Math.min(earliest, cooldown.availableAt);
    },
    undefined,
  );
}
