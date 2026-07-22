import type { Page } from "@playwright/test";
import { TUTORIAL_SCENE_IDS } from "../../../src/content/tutorialScenes";
import { createShortGoalFromStatistics } from "../../../src/content/shortGoals";
import { createInitialState, gameReducer } from "../../../src/game/engine";
import type { GameState } from "../../../src/game/types";
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
  return page.evaluate((saveKey) => {
    const serializedState = localStorage.getItem(saveKey);
    if (!serializedState) throw new Error("Salvataggio Playwright non trovato");
    return JSON.parse(serializedState) as GameState;
  }, STORAGE_KEYS.gameSave);
}
