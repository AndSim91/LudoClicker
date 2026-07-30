import { createInitialEmailMission } from "../content/shortGoals";
import type { TutorialSceneId } from "../content/tutorialScenes";
import type { GameState } from "./types";

export const FIRST_EVENT_TUTORIAL_SCENE_ID = "first-event" as const;

export function isTutorialScenePending(state: GameState, sceneId: string): boolean {
  return !state.tutorial.completedSceneIds.includes(sceneId) &&
    !state.tutorial.skippedSceneIds.includes(sceneId);
}

export function isTutorialSceneFinished(state: GameState, sceneId: string): boolean {
  return state.tutorial.completedSceneIds.includes(sceneId) ||
    state.tutorial.skippedSceneIds.includes(sceneId);
}

export function triggerTutorialScene(
  state: GameState,
  sceneId: TutorialSceneId,
): GameState {
  if (
    isTutorialSceneFinished(state, sceneId) ||
    state.tutorial.triggeredSceneIds?.includes(sceneId)
  ) return state;

  return {
    ...state,
    tutorial: {
      ...state.tutorial,
      triggeredSceneIds: [...(state.tutorial.triggeredSceneIds ?? []), sceneId],
    },
  };
}

export function finishTutorialScene(
  state: GameState,
  sceneId: string,
  skipped: boolean,
): GameState {
  const targetKey = skipped ? "skippedSceneIds" : "completedSceneIds";
  if (state.tutorial[targetKey].includes(sceneId)) return state;

  const startsInitialEmailMission =
    sceneId === "first-invitation" &&
    state.shortGoal.definitionId === "send-emails" &&
    state.shortGoal.completedCount === 0;
  const emailsCommittedBeforeMission = state.statistics.emailsSent +
    state.emails.filter((email) =>
      email.status === "readyToSend" || email.status === "sending",
    ).length;
  const releasesTutorialEmails = sceneId === FIRST_EVENT_TUTORIAL_SCENE_ID;
  const tutorialFinishedAt = state.automation.lastProcessedAt;
  const completedSceneIds = skipped
    ? state.tutorial.completedSceneIds
    : [...state.tutorial.completedSceneIds, sceneId];
  const skippedSceneIds = skipped
    ? [...state.tutorial.skippedSceneIds, sceneId]
    : state.tutorial.skippedSceneIds;

  return {
    ...state,
    tutorial: {
      ...state.tutorial,
      completedSceneIds,
      skippedSceneIds,
      triggeredSceneIds: state.tutorial.triggeredSceneIds?.filter(
        (triggeredSceneId) => triggeredSceneId !== sceneId,
      ),
    },
    shortGoal: startsInitialEmailMission
      ? createInitialEmailMission(
          emailsCommittedBeforeMission,
          state.automation.lastProcessedAt,
        )
      : state.shortGoal,
    pendingEmailOutcomes: releasesTutorialEmails
      ? state.pendingEmailOutcomes.map((outcome) => {
          if (!outcome.waitForTutorialEvent) return outcome;
          const sentAt = state.emails.find((email) => email.id === outcome.emailId)?.sentAt ??
            tutorialFinishedAt;
          const originalResponseDelay = Math.max(1, outcome.resolvesAt - sentAt);
          return {
            ...outcome,
            resolvesAt: tutorialFinishedAt + originalResponseDelay,
            tutorialSceneId: undefined,
            waitForTutorialEvent: undefined,
          };
        })
      : state.pendingEmailOutcomes,
  };
}
