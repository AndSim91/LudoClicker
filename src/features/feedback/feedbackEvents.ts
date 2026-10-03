import type { GameState } from "../../game/types";
import { getFlowMultiplier } from "../../game/writingRhythm";

// New members are announced in La mia giornata, not as a pop (Andrea, Fase 8).
export type FeedbackKind = "fees" | "flow" | "perfect";

export interface FeedbackEvent {
  kind: FeedbackKind;
  text: string;
  detail?: string;
}

// What the feedback layer remembers between two states.
export interface FeedbackSnapshot {
  month: number;
  eurosEarned: number;
  flowMultiplier: number;
  perfectPhrases: number;
}

export function takeFeedbackSnapshot(
  state: Pick<GameState, "school" | "statistics" | "player">,
): FeedbackSnapshot {
  return {
    month: state.school.currentMonth,
    eurosEarned: state.statistics.eurosEarned,
    flowMultiplier: state.player.flow ? getFlowMultiplier(state.player.flow.meter) : 1,
    // Redazione's phrases pop like the player's; only the player's count for achievements.
    perfectPhrases: (state.player.perfectPhrases ?? 0) + (state.player.teamPerfectPhrases ?? 0),
  };
}

export function formatFeedbackEuros(value: number): string {
  return `+${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(Math.round(value))} €`;
}

/** Pure diff between two snapshots: the list of moments worth celebrating. */
export function diffFeedback(previous: FeedbackSnapshot, next: FeedbackSnapshot): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];

  if (next.month > previous.month) {
    const earned = next.eurosEarned - previous.eurosEarned;
    if (earned > 0) events.push({ kind: "fees", text: formatFeedbackEuros(earned), detail: "Quote mensili" });
  }

  if (next.flowMultiplier > previous.flowMultiplier) {
    events.push({ kind: "flow", text: `Flusso ×${next.flowMultiplier}` });
  }

  if (next.perfectPhrases > previous.perfectPhrases) {
    events.push({ kind: "perfect", text: "Frase perfetta!" });
  }

  return events;
}
