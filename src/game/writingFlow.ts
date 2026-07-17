import { getEmailBuildLength } from "../content/emailBuild";
import { GAME_CONFIG } from "./config";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";

export function writeCharacters(
  state: GameState,
  amount: number,
  now: number,
  source: "manual" | "automation",
): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || activeEmail.status !== "writing" || amount <= 0) return state;
  const buildLength = getEmailBuildLength(activeEmail);
  const revealedCharacters = Math.min(
    buildLength,
    activeEmail.revealedCharacters + amount,
  );
  const charactersWritten = revealedCharacters - activeEmail.revealedCharacters;
  const completed = revealedCharacters >= buildLength;
  return {
    ...state,
    emails: state.emails.map((email) =>
      email.id === activeEmail.id
        ? {
            ...email,
            revealedCharacters,
            status: completed ? "sending" : "writing",
            sendCompletesAt: completed ? now + GAME_CONFIG.sendDelayMs : undefined,
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
}

export function write(state: GameState, now: number): GameState {
  return writeCharacters(state, state.player.writingPower, now, "manual");
}
