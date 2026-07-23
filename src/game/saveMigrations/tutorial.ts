import { TUTORIAL_SCENE_IDS } from "../../content/tutorialScenes";
import type { MigratableState } from "./types";

export function migrateTutorialState(state: MigratableState): MigratableState {
  if (state.version !== 46) return state;

  return {
    ...state,
    version: 47,
    // Le partite già avviate non devono ricevere retroattivamente il capitolo
    // introduttivo. Le nuove partite partono invece con un progresso vuoto.
    tutorial: {
      completedSceneIds: TUTORIAL_SCENE_IDS.filter(
        (sceneId) => sceneId !== "social-evolution",
      ),
      skippedSceneIds: [],
    },
  };
}
