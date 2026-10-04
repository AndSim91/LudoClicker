import type { Page } from "@playwright/test";
import { TUTORIAL_SCENE_IDS } from "../../../src/content/tutorialScenes";
import { createShortGoalFromStatistics } from "../../../src/content/shortGoals";
import { createInitialState, gameReducer } from "../../../src/game/engine";
import { decodeStoredSave } from "../../../src/game/saveCodec";
import type { GameState, TournamentParticipant, TournamentResult } from "../../../src/game/types";
import { STORAGE_KEYS } from "../../../src/shared/storageKeys";

export const E2E_PLAYER_NAME = "Giulia Playwright";

const SAVE_INSTALL_MARKER = "incremental-sport.e2e-save-installed";

export function createProgressedGameSave(now = Date.now()): GameState {
  let state = createInitialState(now, E2E_PLAYER_NAME, false);
  state = gameReducer(state, { type: "ADMIN_ADD_MEMBERS", amount: 20 });
  state = gameReducer(state, { type: "ADMIN_ADD_EUROS", amount: 5_000 });

  return {
    ...state,
    lastSavedAt: now,
    school: {
      ...state.school,
      euros: 5_000,
    },
    shortGoal: createShortGoalFromStatistics(state.statistics, 1, now),
    tutorial: {
      completedSceneIds: [],
      skippedSceneIds: [...TUTORIAL_SCENE_IDS],
    },
    // Like the tutorial: the moments reached while preparing the save are already seen.
    moments: { seen: state.moments.seen, queue: [] },
    automation: {
      ...state.automation,
      autoSendEmails: false,
      lastProcessedAt: now,
    },
  };
}

export async function installGameSave(page: Page, state: GameState): Promise<void> {
  await page.addInitScript(
    ({ marker, saveKey, serializedState }) => {
      if (sessionStorage.getItem(marker)) return;
      localStorage.clear();
      localStorage.setItem(saveKey, serializedState);
      sessionStorage.setItem(marker, "true");
    },
    {
      marker: SAVE_INSTALL_MARKER,
      saveKey: STORAGE_KEYS.gameSave,
      serializedState: JSON.stringify(state),
    },
  );
}

export async function readStoredGameSave(page: Page): Promise<GameState> {
  const serializedState = await page.evaluate((saveKey) => {
    const serializedState = localStorage.getItem(saveKey);
    if (!serializedState) throw new Error("Salvataggio Playwright non trovato");
    return serializedState;
  }, STORAGE_KEYS.gameSave);
  return decodeStoredSave(serializedState) as GameState;
}

/** A Nazionale whose Arena final had one of our athletes, for «Guarda la finale» (4.3). */
export function createOwnedFinalResult(completedAt: number): TournamentResult {
  const participant = (id: string, firstName: string, lastName: string, owned: boolean): TournamentParticipant => ({
    id,
    ...(owned ? { ownedContactId: `contact-${id}` } : {}),
    firstName,
    lastName,
    schoolName: owned ? "Ordine delle Onde" : "Ordine di Minerva",
    city: owned ? "Genova" : "Roma",
    rarity: owned ? "rare" : "common",
    numericForms: 6,
    experience: 2,
    arenaBase: 400,
    styleBase: 380,
    arenaPreparation: 1_844,
    stylePreparation: 1_811,
    condition: 0.92,
  });
  return {
    id: "national-final-e2e",
    level: "national",
    season: 1,
    completedAt,
    participants: [participant("a", "Niccolò", "Efrati", true), participant("b", "Giulia", "Moretti", false)],
    matches: [{
      id: "match-final-0-7",
      stage: "final",
      participantAId: "a",
      participantBId: "b",
      arenaScoreA: 2,
      arenaScoreB: 1,
      styleScoreA: 7.45,
      styleScoreB: 6.38,
      styleDetailA: {
        sheets: [
          [2, 2.5, 2.5, 0, 0, 2.5, 0, 1, 0],
          [2, 2.5, 2.5, 0, 0, 2, 0, 1, 0],
          [2.5, 2.5, 2.5, 0, 0, 2, 0, 1, 0],
          [2.5, 2.5, 2.5, 0, 0, 2, 0, 0, 0],
        ],
        technique: "Sync di Spalle",
      },
      stylePenaltyB: "declaration",
      winnerId: "a",
    }],
    groupStandings: [],
    arenaRanking: ["a", "b"],
    styleRanking: ["a", "b"],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}
