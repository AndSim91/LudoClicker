import { NARRATIVE_EVENTS } from "../../content/narrativeEvents";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { GAME_CONFIG } from "../../game/config";
import {
  getLightInflationEventDescription,
  LIGHT_INFLATION_EVENT_TITLE,
} from "../../game/lightInflation";
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

export const DAY_NOTIFICATION_VISIBILITY_MS = GAME_CONFIG.dayNotificationVisibilityMs;
export const DAY_TRIAL_NOTIFICATION_LIMIT = 5;
export const DAY_TRIAL_GROUPING_UNLOCK_MEMBERS = 5;

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
  person?: {
    displayName: string;
    rarity: PersonRarity;
    secretLegendary: boolean;
  };
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
      detail: cancelled
        ? "Annullata: nessuna spada disponibile"
        : "Ordine delle Onde",
      clock: "game",
      timestamp,
      startsAt: trial.startsAt,
      expiresAt,
      tutorialTarget: trial.tutorialSceneId === "first-event",
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
  const detail = [
    formatTrialCount(scheduledCount, "programmata", "programmate"),
    formatTrialCount(inProgressCount, "in corso", "in corso"),
    formatTrialCount(enrolledCount, "iscritto", "iscritti"),
    formatTrialCount(lostCount, "non iscritto", "non iscritti"),
  ].filter((item): item is string => item !== undefined).join(" · ");

  return [...specialTrialNotifications, {
    id: "trial-summary",
    kind: "trial-summary",
    phase,
    title: trialCount === 1 ? "1 lezione di prova" : `${trialCount} lezioni di prova`,
    detail,
    clock: "game",
    timestamp: earliestTimestamp,
    startsAt: phase === "scheduled" ? earliestScheduledStart : undefined,
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
        detail: `1° posto Arena: ${arenaWinner.firstName} ${arenaWinner.lastName} | 1° posto Stile: ${styleWinner.firstName} ${styleWinner.lastName}`,
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
    arenaPosition ? `Arena ${arenaPosition}°` : undefined,
    stylePosition ? `Stile ${stylePosition}°` : undefined,
  ].filter((placement): placement is string => Boolean(placement));
  if (placements.length === 0) {
    return {
      detail: "Risultato registrato senza atleti della scuola in classifica.",
      phase: "neutral",
    };
  }
  return {
    detail: `Miglior piazzamento: ${placements.join(" · ")}.`,
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
      title: "Iscrizione diretta",
      detail: "Nuovo atleta entrato senza lezione di prova",
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

  for (const result of state.tournaments.results) {
    const expiresAt = result.completedAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (result.completedAt > gameNow || gameNow >= expiresAt) continue;
    const summary = getTournamentSummary(result);
    notifications.push({
      id: `tournament-${result.id}`,
      kind: "tournament",
      phase: summary.phase,
      title: `${TOURNAMENT_DEFINITIONS[result.level].label} completato`,
      detail: summary.detail,
      clock: "game",
      timestamp: result.completedAt,
      expiresAt,
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
