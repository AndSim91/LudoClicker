import type { GameState, ShortGoalId, ShortGoalProgress, Statistics } from "../game/types";

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
  baseReward: number;
  completionNarrative: string;
}

export const SHORT_GOAL_ORDER: ShortGoalId[] = [
  "send-emails",
  "book-trials",
  "complete-event",
  "enroll-member",
];

export const SHORT_GOALS: Record<ShortGoalId, ShortGoalDefinition> = {
  "send-emails": {
    id: "send-emails",
    title: "Tre inviti in partenza",
    description: "Completa una piccola tornata di email senza perdere il ritmo.",
    metric: "emailsSent",
    baseTarget: 3,
    targetGrowth: 2,
    baseReward: 15,
    completionNarrative: "La segreteria ha dichiarato ufficialmente smaltita la pila urgente.",
  },
  "book-trials": {
    id: "book-trials",
    title: "Agenda in movimento",
    description: "Ottieni due nuove prenotazioni per una lezione di prova.",
    metric: "trialsBooked",
    baseTarget: 2,
    targetGrowth: 1,
    baseReward: 20,
    completionNarrative: "Il calendario ha finalmente abbastanza appuntamenti da sembrare intenzionale.",
  },
  "complete-event": {
    id: "complete-event",
    title: "Uscire a toccare l'erba",
    description: "Porta a termine un evento in esterna.",
    metric: "eventsCompleted",
    baseTarget: 1,
    targetGrowth: 1,
    baseReward: 20,
    completionNarrative: "Il verbale della polizia locale conferma che siamo stati visti fuori dalla palestra.",
  },
  "enroll-member": {
    id: "enroll-member",
    title: "Una sedia in più",
    description: "Trasforma una lezione di prova in una nuova iscrizione.",
    metric: "membersEnrolled",
    baseTarget: 1,
    targetGrowth: 1,
    baseReward: 25,
    completionNarrative: "È stata aggiunta una sedia alla riunione e nessuno ha protestato.",
  },
};

export function createInitialShortGoal(now: number): ShortGoalProgress {
  const definition = SHORT_GOALS[SHORT_GOAL_ORDER[0]];
  return {
    definitionId: definition.id,
    baseline: 0,
    target: definition.baseTarget,
    startedAt: now,
    completedCount: 0,
  };
}

export function getShortGoalValue(state: GameState, definitionId: ShortGoalId): number {
  return state.statistics[SHORT_GOALS[definitionId].metric];
}

export function getShortGoalProgress(state: GameState): number {
  return Math.max(0, getShortGoalValue(state, state.shortGoal.definitionId) - state.shortGoal.baseline);
}

export function getShortGoalReward(progress: ShortGoalProgress): number {
  const cycle = Math.floor(progress.completedCount / SHORT_GOAL_ORDER.length);
  return SHORT_GOALS[progress.definitionId].baseReward + cycle * 5;
}

export function createNextShortGoal(
  state: GameState,
  completedCount: number,
  now: number,
): ShortGoalProgress {
  return createShortGoalFromStatistics(state.statistics, completedCount, now);
}

export function createShortGoalFromStatistics(
  statistics: Statistics,
  completedCount: number,
  now: number,
): ShortGoalProgress {
  const definitionId = SHORT_GOAL_ORDER[completedCount % SHORT_GOAL_ORDER.length];
  const definition = SHORT_GOALS[definitionId];
  const cycle = Math.floor(completedCount / SHORT_GOAL_ORDER.length);
  return {
    definitionId,
    baseline: statistics[definition.metric],
    target: definition.baseTarget + cycle * definition.targetGrowth,
    startedAt: now,
    completedCount,
  };
}
