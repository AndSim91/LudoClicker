import { NARRATIVE_EVENTS } from "../../content/narrativeEvents";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { GAME_CONFIG } from "../../game/config";
import { isGameAreaUnlocked } from "../../game/progression";
import {
  getContactsById,
  getDirectEnrollmentContacts,
} from "../../game/runtimeIndexes";
import { selectDayTrials } from "../../game/selectors";
import type {
  GameState,
  NarrativeEffects,
  PersonRarity,
  TournamentResult,
} from "../../game/types";
import { findUpcomingTournament } from "../tournaments/tournamentPresentation";
import { getOwnedFinal } from "../tournaments/finalDuel";
import { formatList, formatStat } from "../../shared/formatters";

export const DAY_NOTIFICATION_VISIBILITY_MS = GAME_CONFIG.dayNotificationVisibilityMs;
/** Ordinary trials shown one by one; from the 3rd at once they become one card (09/10). */
export const DAY_TRIAL_NOTIFICATION_LIMIT = 2;
export const DAY_TRIAL_GROUPING_UNLOCK_MEMBERS = 5;
/** More notifications than this with the same title become one card. */
export const DAY_NOTIFICATION_GROUP_LIMIT = 4;
const DAY_GROUP_NAME_LIMIT = 3;
/** Beyond this the pips scale down: the detail line still carries the real counts. */
export const DAY_PROGRESS_PIP_LIMIT = 8;

export type DayNotificationKind =
  | "trial"
  | "trial-summary"
  | "direct-enrollment"
  | "tournament"
  | "important-event"
  | "trials-cancelled"
  | "renewal";

export type DayNotificationPhase =
  | "scheduled"
  | "in-progress"
  | "enrolled"
  | "lost"
  | "positive"
  | "neutral";

/** One pastiglia under an Evento or Imprevisto: what it did to the game (07/10). */
export interface DayEffect {
  icon: "contact" | "coin" | "wrench" | "warning" | "check" | "calendar";
  amount: string;
  /** A game number («Contatti»): shown bold with its capital letter. */
  keyword?: string;
  text?: string;
  /** Good for the school, whatever the sign: «−30 usura» is good. */
  good: boolean;
}

export interface DayNotification {
  id: string;
  kind: DayNotificationKind;
  phase: DayNotificationPhase;
  title: string;
  detail: string;
  /** Eventi (good, green) and Imprevisti or problems (bad, red). */
  tone?: "good" | "bad";
  eyebrow?: string;
  effects?: DayEffect[];
  /** Mancato rinnovo (R13): the yearly rollout in one card. */
  renewal?: { departed: number; before?: number; names: string[] };
  timestamp: number;
  startsAt?: number;
  expiresAt?: number;
  expiryDurationMs?: number;
  tutorialTarget?: boolean;
  /** A finished tournament whose Arena final had one of our athletes: «Guarda la finale» (4.3). */
  finalResultId?: string;
  /** A card standing for several notifications with the same `kind:title`. */
  groupKey?: string;
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
  return [...notifications].sort((left, right) =>
    left.timestamp - right.timestamp || left.id.localeCompare(right.id));
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
  let cancelledCount = 0;
  let cancelledFirst = Number.POSITIVE_INFINITY;
  let cancelledExpiresAt = 0;

  for (const trial of selectDayTrials(state, gameNow)) {
    const contact = contactsById.get(trial.contactId);
    const completed = trial.status === "completed";
    const cancelled = trial.status === "cancelled";
    const terminalTimestamp = cancelled ? trial.startsAt : trial.resolvesAt;
    const phase: DayNotificationPhase = cancelled
      ? "lost"
      : completed
      ? contact?.status === "enrolled" ? "enrolled" : "lost"
      : gameNow < trial.startsAt ? "scheduled" : "in-progress";
    const expiryDurationMs = cancelled
      ? GAME_CONFIG.dayTrialCancelledVisibilityMs
      : completed
      ? phase === "enrolled" ? GAME_CONFIG.dayTrialEnrolledVisibilityMs : GAME_CONFIG.dayTrialLostVisibilityMs
      : undefined;
    const expiresAt = expiryDurationMs === undefined ? undefined : terminalTimestamp + expiryDurationMs;
    if (expiresAt !== undefined && gameNow >= expiresAt) continue;
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
      timestamp,
      startsAt: trial.startsAt,
      expiresAt,
      expiryDurationMs,
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
    // No free sword: one red «Prove annullate» card, apart from the ordinary trials (07/10).
    if (cancelled) {
      cancelledCount += 1;
      cancelledFirst = Math.min(cancelledFirst, terminalTimestamp);
      cancelledExpiresAt = Math.max(cancelledExpiresAt, expiresAt ?? 0);
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

  const cancelledNotifications: DayNotification[] = cancelledCount === 0 ? [] : [{
    id: "trials-cancelled",
    kind: "trials-cancelled",
    phase: "lost",
    tone: "bad",
    eyebrow: "Palestra",
    title: cancelledCount === 1 ? "Prova annullata" : "Prove annullate",
    detail: "Nessuna spada libera da prestare.",
    timestamp: cancelledFirst,
    expiresAt: cancelledExpiresAt,
    expiryDurationMs: GAME_CONFIG.dayTrialCancelledVisibilityMs,
    effects: [{
      icon: "calendar",
      amount: String(cancelledCount),
      text: cancelledCount === 1 ? "prova saltata" : "prove saltate",
      good: false,
    }],
  }];
  if (trialCount === 0) return [...specialTrialNotifications, ...cancelledNotifications];
  if (!groupOrdinaryTrialsByDefault && trialCount <= DAY_TRIAL_NOTIFICATION_LIMIT) {
    return [...specialTrialNotifications, ...cancelledNotifications, ...ordinaryTrialNotifications];
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

  return [...specialTrialNotifications, ...cancelledNotifications, {
    id: "trial-summary",
    kind: "trial-summary",
    phase,
    title: trialCount === 1 ? "1 lezione di prova" : `${trialCount} lezioni di prova`,
    detail,
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
): DayNotification[] {
  const notifications = selectTrialNotifications(state, gameNow);

  for (const contact of getDirectEnrollmentContacts(state.contacts, state.scheduledTrials)) {
    if (contact.acquiredAt > gameNow) continue;
    const expiresAt = contact.acquiredAt + GAME_CONFIG.dayDirectEnrollmentVisibilityMs;
    if (gameNow >= expiresAt) break;
    notifications.push({
      id: `direct-enrollment-${contact.id}`,
      kind: "direct-enrollment",
      phase: "enrolled",
      title: "Iscritto al volo",
      detail: "Saltata la prova: ha firmato e basta.",
      timestamp: contact.acquiredAt,
      expiresAt,
      expiryDurationMs: GAME_CONFIG.dayDirectEnrollmentVisibilityMs,
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
      timestamp: upcomingTournament.occursAt,
      startsAt: upcomingTournament.occursAt,
    });
  }

  for (const result of state.tournaments.results) {
    const expiresAt = result.completedAt + GAME_CONFIG.dayTournamentResultVisibilityMs;
    if (result.completedAt > gameNow || gameNow >= expiresAt) continue;
    const summary = getTournamentSummary(result);
    notifications.push({
      id: result.level === "chronicles"
        ? `tournament-${result.id}`
        : `tournament-${result.level}-${result.season}`,
      kind: "tournament",
      phase: summary.phase,
      title: `${TOURNAMENT_DEFINITIONS[result.level].label} completato`,
      timestamp: result.completedAt,
      expiresAt,
      expiryDurationMs: GAME_CONFIG.dayTournamentResultVisibilityMs,
      // With one of ours in the final, the winners would spoil «Guarda la finale».
      ...(getOwnedFinal(result) ? { detail: "", finalResultId: result.id } : { detail: summary.detail }),
    });
  }

  const renewals: GameState["narrative"]["history"] = [];
  for (const event of state.narrative.history) {
    const expiresAt = event.occurredAt + DAY_NOTIFICATION_VISIBILITY_MS;
    if (event.occurredAt > gameNow || gameNow >= expiresAt) continue;
    if (event.definitionId === "missed-renewal") {
      renewals.push(event);
      continue;
    }
    const definition = narrativeDefinitionsById.get(event.definitionId);
    const isEventOrMishap = definition !== undefined;
    const tone = isEventOrMishap ? definition.kind === "negative" ? "bad" : "good" : undefined;
    notifications.push({
      id: `important-event-${event.id}`,
      kind: "important-event",
      phase: definition?.tone === "positive" ? "positive" : "neutral",
      title: event.title,
      // The pastiglie carry the effect, so the text is the definition's alone.
      detail: isEventOrMishap ? definition.description : event.summary,
      ...(tone ? {
        tone,
        eyebrow: tone === "bad" ? "Imprevisto" : "Evento",
        effects: getNarrativeEffects(event.effects ?? {
          contacts: definition!.contactDelta,
          euros: definition!.euroDelta,
          wear: definition!.wearDelta,
          damagedSwords: definition!.damagedSwordsDelta,
          repairedSwords: definition!.repairedSwordsDelta,
        }),
      } : {}),
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

  notifications.push(...selectRenewalNotifications(renewals));

  return orderDayNotifications(groupCrowdedNotifications(notifications));
}

export const RENEWAL_CELLS = 42;

/** Which of the appello's cells are crossed out: the share that left, spread over the grid. */
export function getRenewalCrossedCells(departed: number, before: number): Set<number> {
  const crossed = departed <= 0 || before <= 0
    ? 0
    : Math.min(RENEWAL_CELLS, Math.max(1, Math.round((departed / before) * RENEWAL_CELLS)));
  return new Set(Array.from({ length: crossed }, (_, index) => Math.floor(((index + 0.5) * RENEWAL_CELLS) / crossed)));
}

/** Mancato rinnovo (R13, 07/10): one card per yearly rollout, whatever its number of records. */
function selectRenewalNotifications(records: GameState["narrative"]["history"]): DayNotification[] {
  const byRollout = new Map<number, GameState["narrative"]["history"]>();
  for (const record of records) byRollout.set(record.occurredAt, [...(byRollout.get(record.occurredAt) ?? []), record]);
  return [...byRollout.entries()].map(([occurredAt, rollout]) => {
    const [first] = rollout;
    const names = rollout.flatMap((record) => record.person ? [record.person.displayName] : []);
    return {
      id: `renewal-${first.id}`,
      kind: "renewal" as const,
      phase: "neutral" as const,
      title: first.title,
      detail: first.summary,
      timestamp: occurredAt,
      expiresAt: occurredAt + DAY_NOTIFICATION_VISIBILITY_MS,
      renewal: {
        // Records saved before 07/10 carry no totals: one record per named member then.
        departed: first.renewal?.departed ?? names.length,
        before: first.renewal?.before,
        names,
      },
    };
  });
}

/** The pastiglie of an Evento or Imprevisto; the colour says whether it helps, not the sign. */
export function getNarrativeEffects(effects: NarrativeEffects): DayEffect[] {
  const list: DayEffect[] = [];
  const sign = (value: number) => value > 0 ? `+${value}` : `−${Math.abs(value)}`;
  if (effects.contacts) list.push({ icon: "contact", amount: sign(effects.contacts), keyword: "Contatti", good: effects.contacts > 0 });
  if (effects.euros) {
    list.push({ icon: "coin", amount: `${effects.euros > 0 ? "+" : "−"}${formatStat(Math.abs(effects.euros))} €`, good: effects.euros > 0 });
  }
  if (effects.wear) list.push({ icon: "wrench", amount: sign(effects.wear), text: "usura", good: effects.wear < 0 });
  if (effects.damagedSwords) {
    list.push({ icon: "warning", amount: String(effects.damagedSwords), text: effects.damagedSwords === 1 ? "spada rotta" : "spade rotte", good: false });
  }
  if (effects.repairedSwords) {
    list.push({ icon: "check", amount: String(effects.repairedSwords), text: effects.repairedSwords === 1 ? "spada riparata" : "spade riparate", good: true });
  }
  return list;
}

/**
 * G4 (07/10): the notifications that become an avviso when the giornata is closed,
 * as Andrea chose them. Each key fires once; null means «only in the giornata».
 * Prove annullate fire at most once per game month; a Legendary's trial when booked
 * and when it ends; tournaments when announced and when done.
 */
export function getDayAlertKey(notification: DayNotification, currentMonth: number): string | null {
  switch (notification.kind) {
    case "important-event":
      return notification.tone ? notification.id : null;
    case "trials-cancelled":
      return `trials-cancelled-${currentMonth}`;
    case "tournament":
      return `${notification.id}:${notification.phase === "scheduled" ? "announced" : "done"}`;
    case "trial":
      if (!isSpecialDayPerson(notification)) return null;
      return `${notification.id}:${notification.phase === "scheduled" || notification.phase === "in-progress" ? "booked" : "ended"}`;
    default:
      return null;
  }
}

export function getDayNotificationGroupKey(notification: DayNotification): string {
  return `${notification.kind}:${notification.title}`;
}

export function isSpecialDayPerson(notification: DayNotification): boolean {
  return notification.person?.rarity === "legendary" || notification.person?.secretLegendary === true;
}

/**
 * Same-title notifications (direct enrollments, recurring events) beyond the limit
 * collapse into one card; Legendaries keep their own. Trials have their own summary.
 */
function groupCrowdedNotifications(notifications: DayNotification[]): DayNotification[] {
  const groups = new Map<string, DayNotification[]>();
  for (const notification of notifications) {
    if (notification.kind === "trial" || notification.kind === "trial-summary") continue;
    if (notification.kind === "tournament" || isSpecialDayPerson(notification)) continue;
    const key = getDayNotificationGroupKey(notification);
    groups.set(key, [...(groups.get(key) ?? []), notification]);
  }
  const grouped = new Set<DayNotification>();
  const summaries: DayNotification[] = [];
  for (const [key, members] of groups) {
    if (members.length <= DAY_NOTIFICATION_GROUP_LIMIT) continue;
    members.forEach((member) => grouped.add(member));
    const sorted = [...members].sort((left, right) => left.timestamp - right.timestamp);
    const [first] = sorted;
    const names = sorted.flatMap((member) => member.person ? [member.person.displayName] : []);
    const shown = names.slice(-DAY_GROUP_NAME_LIMIT).reverse();
    const others = names.length - shown.length;
    const sameDetail = sorted.every((member) => member.detail === first.detail);
    summaries.push({
      id: `group-${key}`,
      kind: first.kind,
      phase: sorted.every((member) => member.phase === first.phase) ? first.phase : "neutral",
      title: first.kind === "direct-enrollment"
        ? `${members.length} iscritti al volo`
        : `${first.title} · ${members.length} volte`,
      detail: names.length > 0
        ? formatList(others > 0 ? [...shown, `altri ${others}`] : shown) + "."
        : sameDetail ? first.detail : "",
      timestamp: first.timestamp,
      expiresAt: Math.max(...sorted.map((member) => member.expiresAt ?? first.timestamp)),
      expiryDurationMs: first.expiryDurationMs,
      groupKey: key,
      ...(first.tone ? { tone: first.tone, eyebrow: first.eyebrow } : {}),
    });
  }
  return [...notifications.filter((notification) => !grouped.has(notification)), ...summaries];
}
