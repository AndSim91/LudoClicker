import { FIRST_COLLABORATOR_TUTORIAL_SCENE_ID } from "../../content/tutorialScenes";
import type { MigratableState } from "./types";

export function migrateFirstCollaboratorTutorialState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 72) return state;

  const completedSceneIds = state.tutorial?.completedSceneIds ?? [];
  const skippedSceneIds = state.tutorial?.skippedSceneIds ?? [];
  const sceneAlreadyFinished = completedSceneIds.includes(
    FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
  ) || skippedSceneIds.includes(FIRST_COLLABORATOR_TUTORIAL_SCENE_ID);

  return {
    ...state,
    version: 73,
    tutorial: {
      completedSceneIds: [...completedSceneIds],
      skippedSceneIds: sceneAlreadyFinished
        ? [...skippedSceneIds]
        : [...skippedSceneIds, FIRST_COLLABORATOR_TUTORIAL_SCENE_ID],
    },
  };
}
