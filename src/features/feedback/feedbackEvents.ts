import { GAME_CONFIG } from "../../game/config";
import type { Contact, GameState } from "../../game/types";
import { getFlowMultiplier } from "../../game/writingRhythm";
import { getPresentedPersonRarity, type PresentedPersonRarity } from "../../shared/rarityPresentation";

export type FeedbackKind = "member" | "fees" | "flow" | "perfect";

export interface FeedbackEvent {
  kind: FeedbackKind;
  text: string;
  detail?: string;
  rarity?: PresentedPersonRarity;
}

// What the feedback layer remembers between two states.
export interface FeedbackSnapshot {
  enrolledIds: ReadonlySet<string>;
  month: number;
  eurosEarned: number;
  flowMultiplier: number;
  perfectPhrases: number;
}

const RARITY_LABELS: Record<PresentedPersonRarity, string> = {
  common: "Comune",
  rare: "Raro",
  "ultra-rare": "Ultra Raro",
  legendary: "Leggendario",
  "secret-legendary": "Leggendario Segreto",
};

// ponytail: bulk enrolments (admin, tournaments) collapse into one pop, not a storm.
const MAX_MEMBER_POPS = 3;

export function takeFeedbackSnapshot(
  state: Pick<GameState, "contacts" | "school" | "statistics" | "player">,
): FeedbackSnapshot {
  return {
    enrolledIds: new Set(
      state.contacts.filter((contact) => contact.status === "enrolled").map((contact) => contact.id),
    ),
    month: state.school.currentMonth,
    eurosEarned: state.statistics.eurosEarned,
    flowMultiplier: state.player.flow ? getFlowMultiplier(state.player.flow.meter) : 1,
    perfectPhrases: state.player.perfectPhrases ?? 0,
  };
}

export function formatFeedbackEuros(value: number): string {
  return `+${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(Math.round(value))} €`;
}

/** Pure diff between two snapshots: the list of moments worth celebrating. */
export function diffFeedback(
  previous: FeedbackSnapshot,
  next: FeedbackSnapshot,
  contacts: readonly Contact[],
): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];

  const newMembers = contacts.filter(
    (contact) => next.enrolledIds.has(contact.id) && !previous.enrolledIds.has(contact.id),
  );
  if (newMembers.length > MAX_MEMBER_POPS) {
    events.push({ kind: "member", text: `+${newMembers.length} iscritti` });
  } else {
    for (const contact of newMembers) {
      const rarity = getPresentedPersonRarity(contact.rarity, Boolean(contact.secretLegendaryId));
      events.push({
        kind: "member",
        text: `+1 iscritto · ${formatFeedbackEuros(GAME_CONFIG.enrollmentBonus)}`,
        detail: `${contact.firstName} ${contact.lastName} · ${RARITY_LABELS[rarity]}`,
        rarity,
      });
    }
  }

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
