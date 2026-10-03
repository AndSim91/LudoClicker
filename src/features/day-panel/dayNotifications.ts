import { NARRATIVE_EVENTS } from "../../content/narrativeEvents";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { GAME_CONFIG } from "../../game/config";
import {
  getLightInflationEventDescription,
  LIGHT_INFLATION_EVENT_TITLE,
} from "../../game/lightInflation";
import { isGameAreaUnlocked } from "../../game/progression";
import {
  getContactsById,
  getDirectEnrollmentContacts,
} from "../../game/runtimeIndexes";
import { selectDayTrials } from "../../game/selectors";
import type {
  GameState,
  PersonRarity,
  TournamentResult,
} from "../../game/types";
import { findUpcomingTournament } from "../tournaments/tournamentPresentation";
import { getOwnedFinal } from "../tournaments/finalDuel";
import { formatList } from "../../shared/formatters";

export const DAY_NOTIFICATION_VISIBILITY_MS = GAME_CONFIG.dayNotificationVisibilityMs;
export const DAY_TRIAL_NOTIFICATION_LIMIT = 5;
export const DAY_TRIAL_GROUPING_UNLOCK_MEMBERS = 5;
/** Beyond this the pips scale down: the detail line still carries the real counts. */
export const DAY_PROGRESS_PIP_LIMIT = 8;

export type DayNotificationKind =
  | "trial"
  | "trial-summary"
  | "direct-enrollment"
  | "tournament"
  | "important-event";

export type DayNotificationPhase =
  | "scheduled"
  | "in-progress"
  | "enrolled"
  | "lost"
  | "positive"
  | "neutral";

export interface DayNotification {
  id: string;
  kind: DayNotificationKind;
  phase: DayNotificationPhase;
  title: string;
  detail: string;
  /** Game notifications may freeze on hover; wall-clock notifications cannot. */
  clock: "game" | "wall";
  timestamp: number;
  startsAt?: number;
  expiresAt?: number;
  expiryDurationMs?: number;
  tutorialTarget?: boolean;
  /** A finished tournament whose Arena final had one of our athletes: «Guarda la finale» (4.3). */
  finalResultId?: string;
  /** One pip per trial: fills while waiting, moves in the gym, green or red at the end. */
  pips?: DayPip[];
  person?: {
    displayName: string;
    rarity: PersonRarity;
    secretLegendary: boolean;
  };
}

export type DayPipState = "waiting" | "live" | "enrolled" | "lost";

export interface DayPip {
  state: DayPipState;
  startsAt: number;
}

const DAY_PIP_ORDER: readonly DayPipState[] = ["enrolled", "lost", "live", "waiting"];

/**
 * Pips in reading order (outcomes, live, waiting by start), at most `limit`.
 * Over the limit each state keeps its share (live never rounds away) and the
 * earliest trials of each state stay, so the pips that move are the ones about to start.
 */
export function capDayPips(pips: readonly DayPip[], limit = DAY_PROGRESS_PIP_LIMIT): DayPip[] {
  const groups = DAY_PIP_ORDER.map((state) =>
    pips.filter((pip) => pip.state === state).sort((left, right) => left.startsAt - right.startsAt),
  );
  if (pips.length <= limit) return groups.flat();
  const shares = groups.map((group, index) => {
    const share = Math.round((group.length * limit) / pips.length);
    return DAY_PIP_ORDER[index] === "live" && group.length > 0 ? Math.max(1, share) : share;
  });
  let excess = shares.reduce((sum, share) => sum + share, 0) - limit;
  while (excess !== 0) {
    const largest = shares.indexOf(Math.max(...shares));
    shares[largest] -= Math.sign(excess);
    excess -= Math.sign(excess);
  }
  return groups.flatMap((group, index) => group.slice(0, shares[index]));
}

/** How far a waiting trial is towards its start, 0–1. */
export function getDayPipFill(pip: DayPip, now: number): number {
  if (pip.state !== "waiting") return 1;
  // ponytail: the wait is a fixed GAME_CONFIG span, so the booking time is derived; store it on the trial if waits ever vary.
  const waitMs = GAME_CONFIG.trialWaitMaxMs;
  return Math.min(1, Math.max(0, 1 - (pip.startsAt - now) / waitMs));
}

export function orderDayNotifications(notifications: readonly DayNotification[]): DayNotification[] {
  return [...notifications].sort((left, right) => {
    if (left.id === "light-inflation") return -1;
    if (right.id === "light-inflation") return 1;
    return left.timestamp - right.timestamp || left.id.localeCompare(right.id);
  });
}

const narrativeDefinitionsById = new Map(
  NARRATIVE_EVENTS.map((definition) => [definition.id, definition]),
);

function formatTrialCount(
  count: number,
  singular: string,
  plural: string,
): string | undefined {
  if (count === 0) return undefined;
  return `${count} ${count === 1 ? singular : plural}`;
}

function getDayPipState(phase: DayNotificationPhase): DayPipState {
  if (phase === "scheduled") return "waiting";
  if (phase === "in-progress") return "live";
  return phase === "enrolled" ? "enrolled" : "lost";
}

function selectTrialNotifications(state: GameState, gameNow: number): DayNotification[] {
  const contactsById = getContactsById(state.contacts);
  const specialTrialNotifications: DayNotification[] = [];
  const ordinaryTrialNotifications: DayNotification[] = [];
  const groupOrdinaryTrialsByDefault = Math.max(
    state.school.activeMembers,
    state.school.peakActiveMembers,
  ) >= DAY_TRIAL_GROUPING_UNLOCK_MEMBERS;
  let trialCount = 0;
  let scheduledCount = 0;
  let inProgressCount = 0;
  let enrolledCount = 0;
  let lostCount = 0;
  let earliestTimestamp = Number.POSITIVE_INFINITY;
  let earliestScheduledStart: number | undefined;
  let tutorialTarget = false;
  const ordinaryPips: DayPip[] = [];

  for (const trial of selectDayTrials(state, gameNow)) {
    const contact = contactsById.get(trial.contactId);
    const completed = trial.status === "completed";
    const cancelled = trial.status === "cancelled";
    const terminalTimestamp = cancelled ? trial.startsAt : trial.resolvesAt;
    const expiresAt = completed || cancelled
      ? terminalTimestamp + DAY_NOTIFICATION_VISIBILITY_MS
      : undefined;
    if (expiresAt !== undefined && gameNow >= expiresAt) continue;
    const phase: DayNotificationPhase = cancelled
      ? "lost"
      : completed
      ? contact?.status === "enrolled" ? "enrolled" : "lost"
      : gameNow < trial.startsAt ? "scheduled" : "in-progress";
    const timestamp = completed || cancelled ? terminalTimestamp : trial.startsAt;
    const isSpecialTrial = contact?.rarity === "legendary" ||
      Boolean(contact?.secretLegendaryId) ||
      Boolean(trial.secretLegendaryId);
    const notification: DayNotification = {
      id: `trial-${trial.id}`,
      kind: "trial",
      phase,
      title: "Lezione di prova",
      // The timing column already says where the trial stands (Fase 8).
      detail: cancelled ? "Annullata: nessuna spada libera da prestare." : "",
      clock: "game",
      timestamp,
      startsAt: trial.startsAt,
      expiresAt,
      tutorialTarget: trial.tutorialSceneId === "first-event",
      pips: [{ state: getDayPipState(phase), startsAt: trial.startsAt }],
      person: contact
        ? {
            displayName: `${contact.firstName} ${contact.lastName}`,
            rarity: contact.rarity,
            secretLegendary: Boolean(contact.secretLegendaryId),
          }
        : undefined,
    };

    if (isSpecialTrial) {
      specialTrialNotifications.push(notification);
      continue;
    }

    trialCount += 1;
    ordinaryPips.push(...notification.pips!);
    earliestTimestamp = Math.min(earliestTimestamp, timestamp);
    tutorialTarget ||= trial.tutorialSceneId === "first-event";

    switch (phase) {
      case "scheduled":
        scheduledCount += 1;
        earliestScheduledStart = earliestScheduledStart === undefined
          ? trial.startsAt
          : Math.min(earliestScheduledStart, trial.startsAt);
        break;
      case "in-progress":
        inProgressCount += 1;
        break;
      case "enrolled":
        enrolledCount += 1;
        break;
      case "lost":
        lostCount += 1;
        break;
      default:
        break;
    }

    if (groupOrdinaryTrialsByDefault) continue;
    if (trialCount > DAY_TRIAL_NOTIFICATION_LIMIT) {
      ordinaryTrialNotifications.length = 0;
      continue;
    }
    ordinaryTrialNotifications.push(notification);
  }

  if (trialCount === 0) return specialTrialNotifications;
  if (!groupOrdinaryTrialsByDefault && trialCount <= DAY_TRIAL_NOTIFICATION_LIMIT) {
    return [...specialTrialNotifications, ...ordinaryTrialNotifications];
  }

  const phase: DayNotificationPhase = inProgressCount > 0
    ? "in-progress"
    : scheduledCount > 0
    ? "scheduled"
    : enrolledCount > 0 && lostCount === 0
    ? "enrolled"
    : lostCount > 0 && enrolledCount === 0
    ? "lost"
    : "neutral";
  const detail = formatList([
    formatTrialCount(scheduledCount, "in programma", "in programma"),
    formatTrialCount(inProgressCount, "in palestra", "in palestra"),
    formatTrialCount(enrolledCount, "iscritto", "iscritti"),
    formatTrialCount(lostCount, "senza iscrizione", "senza iscrizione"),
  ].filter((item): item is string => item !== undefined));

  return [...specialTrialNotifications, {
    id: "trial-summary",
    kind: "trial-summary",
    phase,
    title: trialCount === 1 ? "1 lezione di prova" : `${trialCount} lezioni di prova`,
    detail,
    clock: "game",
    timestamp: earliestTimestamp,
    startsAt: phase === "scheduled" ? earliestScheduledStart : undefined,
    pips: capDayPips(ordinaryPips),
    tutorialTarget,
  }];
}

function getBestOwnedPosition(
  ranking: readonly string[],
  ownedParticipantIds: ReadonlySet<string>,
): number | undefined {
  const index = ranking.findIndex((participantId) => ownedParticipantIds.has(participantId));
  return index >= 0 ? index + 1 : undefined;
}

function getTournamentSummary(result: TournamentResult): {
  detail: string;
  phase: "positive" | "neutral";
} {
  if (result.level === "school") {
    const arenaWinner = result.participants.find(
      (participant) => participant.id === result.arenaRanking[0],
    );
    const styleWinner = result.participants.find(
      (participant) => participant.id === result.styleRanking[0],
    );
    if (arenaWinner && styleWinner) {
      return {
        detail: `Vincono ${arenaWinner.firstName} ${arenaWinner.lastName} in Arena e ${styleWinner.firstName} ${styleWinner.lastName} nello Stile.`,
        phase: "positive",
      };
    }
  }

  const ownedParticipantIds = new Set(
    result.participants
      .filter((participant) => participant.ownedContactId)
      .map((participant) => participant.id),
  );
  const arenaPosition = getBestOwnedPosition(result.arenaRanking, ownedParticipantIds);
  const stylePosition = getBestOwnedPosition(result.styleRanking, ownedParticipantIds);
  const placements = [
    arenaPosition ? `${arenaPosition}° in Arena` : undefined,
    stylePosition ? `${stylePosition}° nello Stile` : undefined,
  ].filter((placement): placement is string => Boolean(placement));
  if (placements.length === 0) {
    return {
      detail: "Nessuno dei nostri in classifica. Esperienza, la chiamano.",
      phase: "neutral",
    };
  }
  return {
    detail: `I nostri migliori: ${formatList(placements)}.`,
    phase: arenaPosition && arenaPosition <= 3 || stylePosition && stylePosition <= 3
      ? "positive"
      : "neutral",
  };
}

export function selectDayNotifications(
  state: GameState,
  gameNow: number,
  wallNow = gameNow,
): DayNotification[] {
  const notifications = selectTrialNotifications(state, gameNow);
  const lightInflationEvent = state.lightInflation.event;
  const lightInflationNotification = lightInflationEvent
    && lightInflationEvent.occurredAt <= wallNow
    && wallNow < lightInflationEvent.visibleUntil
    ? {
        id: "light-inflation",
        kind: "important-event" as const,
        phase: "neutral" as const,
        title: LIGHT_INFLATION_EVENT_TITLE,
        detail: getLightInflationEventDescription(lightInflationEvent.cause),
        clock: "wall" as const,
        timestamp: lightInflationEvent.occurredAt,
        expiresAt: lightInflationEvent.visibleUntil,
        expiryDurationMs: lightInflationEvent.visibleUntil - lightInflationEvent.occurredAt,
      }
    : undefined;

  for (const contact of getDirectEnrollmentContacts(state.contacts, state.scheduledTrials)) {
    if (contact.acquiredAt > gameNow) continue;
    const expiresAt = contact.acquiredAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (gameNow >= expiresAt) break;
    notifications.push({
      id: `direct-enrollment-${contact.id}`,
      kind: "direct-enrollment",
      phase: "enrolled",
      title: "Iscritto al volo",
      detail: "Saltata la prova: ha firmato e basta.",
      clock: "game",
      timestamp: contact.acquiredAt,
      expiresAt,
      person: {
        displayName: `${contact.firstName} ${contact.lastName}`,
        rarity: contact.rarity,
        secretLegendary: Boolean(contact.secretLegendaryId),
      },
    });
  }

  const upcomingTournament = isGameAreaUnlocked("tournaments", state)
    ? findUpcomingTournament(state)
    : undefined;
  if (
    upcomingTournament?.absoluteMonth === state.school.currentMonth &&
    gameNow < upcomingTournament.occursAt
  ) {
    const definition = TOURNAMENT_DEFINITIONS[upcomingTournament.level];
    notifications.push({
      id: `tournament-${upcomingTournament.level}-${upcomingTournament.season}`,
      kind: "tournament",
      phase: "scheduled",
      title: `${definition.label} in arrivo`,
      detail: "Si combatte a fine mese: c'è ancora tempo per allenarsi.",
      clock: "game",
      timestamp: upcomingTournament.occursAt,
      startsAt: upcomingTournament.occursAt,
    });
  }

  for (const result of state.tournaments.results) {
    const expiresAt = result.completedAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (result.completedAt > gameNow || gameNow >= expiresAt) continue;
    const summary = getTournamentSummary(result);
    notifications.push({
      id: result.level === "chronicles"
        ? `tournament-${result.id}`
        : `tournament-${result.level}-${result.season}`,
      kind: "tournament",
      phase: summary.phase,
      title: `${TOURNAMENT_DEFINITIONS[result.level].label} completato`,
      clock: "game",
      timestamp: result.completedAt,
      expiresAt,
      // With one of ours in the final, the winners would spoil «Guarda la finale».
      ...(getOwnedFinal(result) ? { detail: "", finalResultId: result.id } : { detail: summary.detail }),
    });
  }

  for (const event of state.narrative.history) {
    const expiresAt = event.occurredAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (event.occurredAt > gameNow || gameNow >= expiresAt) continue;
    const definition = narrativeDefinitionsById.get(event.definitionId);
    notifications.push({
      id: `important-event-${event.id}`,
      kind: "important-event",
      phase: definition?.tone === "positive" ? "positive" : "neutral",
      title: event.title,
      detail: event.summary,
      clock: "game",
      timestamp: event.occurredAt,
      expiresAt,
      person: event.person
        ? {
            displayName: event.person.displayName,
            rarity: event.person.rarity,
            secretLegendary: false,
          }
        : undefined,
    });
  }

  const visibleNotifications = lightInflationNotification
    ? [lightInflationNotification, ...notifications]
    : notifications;
  return orderDayNotifications(visibleNotifications);
}
