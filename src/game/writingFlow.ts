import { getEmailBuildLength } from "../content/emailBuild";
import { GAME_CONFIG } from "./config";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";

export function sendEmail(state: GameState, now: number): GameState {
  const email = selectActiveEmail(state);
  if (!email || email.status !== "readyToSend") return state;

  return {
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
  };
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
  return writeCharacters(state, state.player.writingPower, now, "manual");
}
