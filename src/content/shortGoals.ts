import type { GameState, ShortGoalId, ShortGoalProgress, Statistics } from "../game/types";
import { GAME_CONFIG } from "../game/config";

type ShortGoalMetric = keyof Pick<
  Statistics,
  "emailsSent" | "trialsBooked" | "eventsCompleted" | "membersEnrolled"
>;

export interface ShortGoalDefinition {
  id: ShortGoalId;
  title: string;
  description: string;
  metric: ShortGoalMetric;
  baseTarget: number;
  targetGrowth: number;
  /** The target stops growing here; the reward keeps growing with the series. */
  maxTarget: number;
  baseReward: number;
  completionNarrative: string;
}

export const SHORT_GOAL_ORDER: ShortGoalId[] = [
  "complete-event",
  "send-emails",
  "book-trials",
  "enroll-member",
];

export const SHORT_GOALS: Record<ShortGoalId, ShortGoalDefinition> = {
  "send-emails": {
    id: "send-emails",
    title: "Inviti in partenza",
    description: "Completa una piccola tornata di email senza perdere il ritmo.",
    metric: "emailsSent",
    baseTarget: 2,
    targetGrowth: 1,
    maxTarget: 5,
    baseReward: 50,
    completionNarrative: "La segreteria ha dichiarato ufficialmente smaltita la pila urgente.",
  },
  "book-trials": {
    id: "book-trials",
    title: "Agenda in movimento",
    description: "Ottieni nuove prenotazioni per una lezione di prova.",
    metric: "trialsBooked",
    baseTarget: 2,
    targetGrowth: 1,
    maxTarget: 5,
    baseReward: 50,
    completionNarrative: "Il calendario ha finalmente abbastanza appuntamenti da sembrare intenzionale.",
  },
  "complete-event": {
    id: "complete-event",
    title: "Uscire a toccare l'erba",
    description: "Porta a termine qualche evento in esterna.",
    metric: "eventsCompleted",
    baseTarget: 2,
    targetGrowth: 1,
    maxTarget: 5,
    baseReward: 50,
    completionNarrative: "Il verbale della polizia locale conferma che siamo stati visti fuori dalla palestra.",
  },
  "enroll-member": {
    id: "enroll-member",
    title: "Una sedia in più",
    description: "Trasforma le lezioni di prova in nuove iscrizioni.",
    metric: "membersEnrolled",
    baseTarget: 2,
    targetGrowth: 1,
    maxTarget: 5,
    baseReward: 50,
    completionNarrative: "È stata aggiunta una sedia alla riunione e nessuno ha protestato.",
  },
};

export function createInitialShortGoal(now: number): ShortGoalProgress {
  return createInitialEmailMission(0, now);
}

/**
 * First school only: the email mission that opens Eventi. It sits outside the
 * series (the order starts with Eventi), so an email mission at count 0 is it.
 */
export function isTutorialEmailMission(progress: ShortGoalProgress): boolean {
  return progress.definitionId === "send-emails" && progress.completedCount === 0;
}

export function createInitialEmailMission(
  baseline: number,
  now: number,
): ShortGoalProgress {
  const definition = SHORT_GOALS["send-emails"];
  return {
    definitionId: definition.id,
    baseline,
    target: definition.baseTarget,
    startedAt: now,
    completedCount: 0,
    isActive: true,
  };
}

export function getShortGoalValue(state: GameState, definitionId: ShortGoalId): number {
  return state.statistics[SHORT_GOALS[definitionId].metric];
}

export function getShortGoalProgress(state: GameState): number {
  return Math.max(0, getShortGoalValue(state, state.shortGoal.definitionId) - state.shortGoal.baseline);
}

export function isShortGoalActive(state: GameState): boolean {
  return state.shortGoal.isActive;
}

/** Series = one full round of the four missions, starting from 1. */
export function getShortGoalSeries(completedCount: number): number {
  return Math.floor(completedCount / SHORT_GOAL_ORDER.length) + 1;
}

export function getShortGoalReward(progress: ShortGoalProgress): number {
  return SHORT_GOALS[progress.definitionId].baseReward * getShortGoalSeries(progress.completedCount);
}

export function createNextShortGoal(
  state: GameState,
  completedCount: number,
  now: number,
): ShortGoalProgress {
  return {
    ...createShortGoalFromStatistics(state.statistics, completedCount, now),
    isActive: state.school.euros < GAME_CONFIG.shortGoalActivationBalance,
  };
}

export function createShortGoalFromStatistics(
  statistics: Statistics,
  completedCount: number,
  now: number,
): ShortGoalProgress {
  const definitionId = SHORT_GOAL_ORDER[completedCount % SHORT_GOAL_ORDER.length];
  const definition = SHORT_GOALS[definitionId];
  const cycle = getShortGoalSeries(completedCount) - 1;
  return {
    definitionId,
    baseline: statistics[definition.metric],
    target: Math.min(definition.maxTarget, definition.baseTarget + cycle * definition.targetGrowth),
    startedAt: now,
    completedCount,
    isActive: true,
  };
}
