import { getEmailBuildLength } from "../content/emailBuild";
import { GAME_CONFIG } from "./config";
import { startNextCampaign } from "./emailFlow";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";
import {
  applyFlowInput,
  getFlowCap,
  getFlowMultiplier,
  getPerfectPhraseChance,
  getPerfectPhraseLength,
  getPerfectPhraseRoll,
} from "./writingRhythm";

export function sendEmail(state: GameState, now: number): GameState {
  const email = selectActiveEmail(state);
  if (!email || email.status !== "readyToSend") return state;

  // Posta in uscita: l'invio non blocca, la bozza successiva si apre subito.
  return startNextCampaign({
    ...state,
    emails: state.emails.map((candidate) =>
      candidate.id === email.id
        ? {
            ...candidate,
            status: "sending",
            sendCompletesAt: now + GAME_CONFIG.sendDelayMs,
          }
        : candidate,
    ),
  }, now);
}

export function writeCharacters(
  state: GameState,
  amount: number,
  now: number,
  source: "manual" | "automation",
): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || amount <= 0) return state;
  if (activeEmail.status === "readyToSend") {
    return source === "manual" || state.automation.autoSendEmails
      ? sendEmail(state, now)
      : state;
  }
  if (activeEmail.status !== "writing") return state;
  const buildLength = getEmailBuildLength(activeEmail);
  const revealedCharacters = Math.min(
    buildLength,
    activeEmail.revealedCharacters + amount,
  );
  const charactersWritten = revealedCharacters - activeEmail.revealedCharacters;
  const completed = revealedCharacters >= buildLength;
  const nextState: GameState = {
    ...state,
    emails: state.emails.map((email) =>
      email.id === activeEmail.id
        ? {
            ...email,
            revealedCharacters,
            status: completed ? "readyToSend" : "writing",
            sendCompletesAt: undefined,
          }
        : email,
    ),
    statistics: {
      ...state.statistics,
      inputs: state.statistics.inputs + (source === "manual" ? 1 : 0),
      automatedCharacters: state.statistics.automatedCharacters +
        (source === "automation" ? charactersWritten : 0),
    },
  };
  return completed && state.automation.autoSendEmails
    ? sendEmail(nextState, now)
    : nextState;
}

export function write(state: GameState, now: number): GameState {
  // Locked Flusso (cap ×1): plain one-step writing, nothing stored.
  const flowCap = getFlowCap(state.upgrades);
  const flow = flowCap > 1 ? applyFlowInput(
    state.player.flow,
    now,
    flowCap,
  ) : undefined;
  let amount = state.player.writingPower * (flow ? getFlowMultiplier(flow.meter, flowCap) : 1);
  let perfectPhrase = false;

  const email = selectActiveEmail(state);
  if (email?.status === "writing") {
    const roll = getPerfectPhraseRoll(email.id, state.statistics.inputs);
    if (roll < getPerfectPhraseChance(state)) {
      const phrase = getPerfectPhraseLength(email, email.revealedCharacters + amount);
      perfectPhrase = phrase > 0;
      amount += phrase;
    }
  }

  const written = writeCharacters(state, amount, now, "manual");
  // No draft to work on: the input is lost and the rhythm is not rewarded.
  if (written === state) return state;
  return {
    ...written,
    player: {
      ...written.player,
      ...(flow ? { flow } : {}),
      perfectPhrases: (written.player.perfectPhrases ?? 0) + (perfectPhrase ? 1 : 0),
    },
  };
}
