import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TUTORIAL_SCENES,
  type TutorialRuntimeContext,
  type TutorialSceneId,
} from "../../content/tutorialScenes";
import type { GameAction, GameState } from "../../game/types";

interface TutorialStepProgress {
  gameCreatedAt: number;
  indexes: Partial<Record<TutorialSceneId, number>>;
}

export function useTutorialController({
  state,
  activeView,
  equipmentOpen = false,
  dispatch,
  onNavigate,
}: {
  state: GameState;
  activeView: string;
  equipmentOpen?: boolean;
  dispatch: (action: GameAction) => void;
  onNavigate?: (view: string) => void;
}) {
  const [stepProgress, setStepProgress] = useState<TutorialStepProgress>(() => ({
    gameCreatedAt: state.createdAt,
    indexes: {},
  }));
  if (stepProgress.gameCreatedAt !== state.createdAt) {
    setStepProgress({ gameCreatedAt: state.createdAt, indexes: {} });
  }
  const stepIndexes = stepProgress.gameCreatedAt === state.createdAt
    ? stepProgress.indexes
    : {};
  const context = useMemo<TutorialRuntimeContext>(
    () => ({ state, activeView, equipmentOpen }),
    [activeView, equipmentOpen, state],
  );
  const unavailableSceneIds = new Set([
    ...state.tutorial.completedSceneIds,
    ...state.tutorial.skippedSceneIds,
  ]);
  const candidateScene = TUTORIAL_SCENES.find(
    (scene) => !unavailableSceneIds.has(scene.id) && scene.canStart(context),
  ) ?? null;
  let resolvedStepIndex = candidateScene ? stepIndexes[candidateScene.id] ?? 0 : 0;
  while (candidateScene) {
    const step = candidateScene.steps[resolvedStepIndex];
    if (step?.kind !== "objective" || !step.isComplete(context)) break;
    resolvedStepIndex += 1;
  }
  const objectiveCompletedScene = candidateScene && resolvedStepIndex >= candidateScene.steps.length
    ? candidateScene
    : null;
  const activeScene = objectiveCompletedScene ? null : candidateScene;
  const activeStep = activeScene?.steps[resolvedStepIndex] ?? null;
  const activeStepNavigation = activeStep?.navigateTo;

  useEffect(() => {
    if (!activeStepNavigation || activeStepNavigation === activeView) return;
    onNavigate?.(activeStepNavigation);
  }, [activeStepNavigation, activeView, onNavigate]);

  useEffect(() => {
    if (!objectiveCompletedScene) return;
    dispatch({
      type: "FINISH_TUTORIAL_SCENE",
      sceneId: objectiveCompletedScene.id,
      skipped: false,
    });
  }, [dispatch, objectiveCompletedScene]);

  const finishScene = useCallback((skipped: boolean) => {
    if (!candidateScene) return;
    dispatch({
      type: "FINISH_TUTORIAL_SCENE",
      sceneId: candidateScene.id,
      skipped,
    });
  }, [candidateScene, dispatch]);

  const continueScene = useCallback(() => {
    if (!activeScene) return;
    if (resolvedStepIndex >= activeScene.steps.length - 1) {
      finishScene(false);
      return;
    }
    const nextStep = activeScene.steps[resolvedStepIndex + 1];
    if (nextStep.navigateTo) onNavigate?.(nextStep.navigateTo);
    setStepProgress((current) => {
      const currentIndexes = current.gameCreatedAt === state.createdAt
        ? current.indexes
        : {};
      return {
        gameCreatedAt: state.createdAt,
        indexes: {
          ...currentIndexes,
          [activeScene.id]: resolvedStepIndex + 1,
        },
      };
    });
  }, [activeScene, finishScene, onNavigate, resolvedStepIndex, state.createdAt]);

  return {
    context,
    activeScene,
    activeStep,
    activeStepIndex: resolvedStepIndex,
    continueScene,
    skipScene: () => finishScene(true),
    shouldPauseGame: Boolean(candidateScene?.pauseWhileActive || activeStep?.kind === "dialog"),
    isBlockingInput: activeStep?.kind === "dialog",
  };
}
