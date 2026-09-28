import { getEmailBuildSource } from "../content/emailBuild";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import type { CampaignEmail, GameState, UpgradeLevels, WritingFlow } from "./types";

/*
 * Rhythm mechanics of manual writing (plan points 2.1 and 2.2).
 *
 * Both start locked: the game opens plain and mechanical, and the rhythm is
 * bought in the Scrittura branch extension.
 *
 * Flusso ("Ritmo di battitura"): every manual input fills a meter that drains
 * slowly while the player keeps typing and fast after a short pause. Every 25
 * points add one step of multiplier; each upgrade level raises the cap by one,
 * from ×2 up to ×5.
 *
 * Frase perfetta ("Frasi fatte"): a small chance per input to finish the
 * current sentence at once. The roll is derived from the email and the input count, so it never
 * consumes the shared random seed that events, trials and tournaments rely on.
 */

export function getFlowMeterAt(flow: WritingFlow | undefined, now: number): number {
  if (!flow) return 0;
  const idleMs = Math.max(0, now - flow.updatedAt);
  const graceMs = Math.min(idleMs, GAME_CONFIG.flowGraceMs);
  const pauseMs = Math.max(0, idleMs - GAME_CONFIG.flowGraceMs);
  const drained = (flow.drainScale ?? 1) * (
    (graceMs / 1_000) * GAME_CONFIG.flowDrainPerSecond +
    (pauseMs / 1_000) * GAME_CONFIG.flowPauseDrainPerSecond
  );
  return Math.min(GAME_CONFIG.flowMeterMax, Math.max(0, flow.meter - drained));
}

// Meter points per multiplier step (25 with the default config).
const FLOW_STEP = GAME_CONFIG.flowMeterMax / (GAME_CONFIG.flowMaxMultiplier - 1);

/** Highest multiplier the upgrades allow: 1 means the Flusso is still locked. */
export function getFlowCap(upgrades: UpgradeLevels): number {
  return Math.min(
    GAME_CONFIG.flowMaxMultiplier,
    1 + getUpgradeEffectTotal(upgrades, "flowMaxMultiplier"),
  );
}

/** Meter points needed to reach the cap: the bar is full at the current cap. */
export function getFlowMeterLimit(cap: number): number {
  return Math.max(0, cap - 1) * FLOW_STEP;
}

export function getFlowMultiplier(meter: number, cap: number = GAME_CONFIG.flowMaxMultiplier): number {
  return Math.min(cap, 1 + Math.floor(meter / FLOW_STEP));
}

export function applyFlowInput(
  flow: WritingFlow | undefined,
  now: number,
  cap: number = GAME_CONFIG.flowMaxMultiplier,
  drainScale = 1,
): WritingFlow {
  return {
    meter: Math.min(
      getFlowMeterLimit(cap),
      getFlowMeterAt(flow, now) + GAME_CONFIG.flowGainPerInput,
    ),
    updatedAt: now,
    ...(drainScale === 1 ? {} : { drainScale }),
  };
}

export function getPerfectPhraseChance(state: Pick<GameState, "upgrades">): number {
  if ((state.upgrades["stock-phrases"] ?? 0) < 1) return 0;
  return Math.min(
    GAME_CONFIG.perfectPhraseMaxChance,
    getUpgradeEffectTotal(state.upgrades, "perfectPhraseChance"),
  );
}

// FNV-1a over the email id and the input count: stable for tests and saves.
export function getPerfectPhraseRoll(emailId: string, inputCount: number): number {
  let hash = 0x811c9dc5;
  for (const character of `${emailId}:${inputCount}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

const SENTENCE_END = /[.!?\n>]/;

/**
 * Characters needed, from `position`, to reach the end of the sentence being
 * written (or of the HTML tag, for the coded levels), capped so a single lucky
 * input cannot write half an email.
 */
export function getPerfectPhraseLength(email: CampaignEmail, position: number): number {
  const source = getEmailBuildSource(email);
  const start = Math.max(0, Math.floor(position));
  const limit = Math.min(source.length, start + GAME_CONFIG.perfectPhraseMaxCharacters);
  for (let index = start; index < limit; index += 1) {
    if (SENTENCE_END.test(source[index])) return index + 1 - start;
  }
  return limit - start;
}
