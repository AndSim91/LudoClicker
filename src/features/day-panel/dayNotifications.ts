import { NARRATIVE_EVENTS } from "../../content/narrativeEvents";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { GAME_CONFIG } from "../../game/config";
import { selectDayTrials } from "../../game/selectors";
import type {
  GameState,
  PersonRarity,
  TournamentResult,
} from "../../game/types";

export const DAY_NOTIFICATION_VISIBILITY_MS = GAME_CONFIG.dayNotificationVisibilityMs;

export type DayNotificationKind =
  | "trial"
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
  timestamp: number;
  startsAt?: number;
  expiresAt?: number;
  person?: {
    displayName: string;
    rarity: PersonRarity;
    secretLegendary: boolean;
  };
}

const narrativeDefinitionsById = new Map(
  NARRATIVE_EVENTS.map((definition) => [definition.id, definition]),
);

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

export function selectDayNotifications(state: GameState, now: number): DayNotification[] {
  const contactsById = new Map(state.contacts.map((contact) => [contact.id, contact]));
  const trialContactIds = new Set(state.scheduledTrials.map((trial) => trial.contactId));
  const notifications: DayNotification[] = [];

  for (const trial of selectDayTrials(state, now)) {
    const contact = contactsById.get(trial.contactId);
    const completed = trial.status === "completed";
    const cancelled = trial.status === "cancelled";
    const terminalTimestamp = cancelled ? trial.startsAt : trial.resolvesAt;
    const expiresAt = completed || cancelled
      ? terminalTimestamp + DAY_NOTIFICATION_VISIBILITY_MS
      : undefined;
    if (expiresAt !== undefined && now >= expiresAt) continue;
    const phase: DayNotificationPhase = cancelled
      ? "lost"
      : completed
      ? contact?.status === "enrolled" ? "enrolled" : "lost"
      : now < trial.startsAt ? "scheduled" : "in-progress";
    notifications.push({
      id: `trial-${trial.id}`,
      kind: "trial",
      phase,
      title: "Lezione di prova",
      detail: cancelled
        ? "Annullata: nessuna spada disponibile"
        : "Ordine delle Onde",
      timestamp: completed || cancelled ? terminalTimestamp : trial.startsAt,
      startsAt: trial.startsAt,
      expiresAt,
      person: contact
        ? {
            displayName: `${contact.firstName} ${contact.lastName}`,
            rarity: contact.rarity,
            secretLegendary: Boolean(contact.secretLegendaryId),
          }
        : undefined,
    });
  }

  for (const contact of state.contacts) {
    const expiresAt = contact.acquiredAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (
      contact.status !== "enrolled" ||
      trialContactIds.has(contact.id) ||
      contact.acquiredAt > now ||
      now >= expiresAt
    ) continue;
    notifications.push({
      id: `direct-enrollment-${contact.id}`,
      kind: "direct-enrollment",
      phase: "enrolled",
      title: "Iscrizione diretta",
      detail: "Nuovo atleta entrato senza lezione di prova",
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
    if (result.completedAt > now || now >= expiresAt) continue;
    const summary = getTournamentSummary(result);
    notifications.push({
      id: `tournament-${result.id}`,
      kind: "tournament",
      phase: summary.phase,
      title: `${TOURNAMENT_DEFINITIONS[result.level].label} completato`,
      detail: summary.detail,
      timestamp: result.completedAt,
      expiresAt,
    });
  }

  for (const event of state.narrative.history) {
    const expiresAt = event.occurredAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (event.occurredAt > now || now >= expiresAt) continue;
    const definition = narrativeDefinitionsById.get(event.definitionId);
    notifications.push({
      id: `important-event-${event.id}`,
      kind: "important-event",
      phase: definition?.tone === "positive" ? "positive" : "neutral",
      title: event.title,
      detail: event.summary,
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

  return notifications.sort((left, right) =>
    left.timestamp - right.timestamp || left.id.localeCompare(right.id)
  );
}
