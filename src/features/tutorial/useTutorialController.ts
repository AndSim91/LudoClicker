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
  /** The furthest step reached in each scene: earlier objectives are only reviewed after «Indietro». */
  furthest?: Partial<Record<TutorialSceneId, number>>;
}

export function useTutorialController({
  state,
  activeView,
  equipmentOpen = false,
  reptileOpen = false,
  dispatch,
  onNavigate,
}: {
  state: GameState;
  activeView: string;
  equipmentOpen?: boolean;
  reptileOpen?: boolean;
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
  const sameGame = stepProgress.gameCreatedAt === state.createdAt;
  const stepIndexes = sameGame ? stepProgress.indexes : {};
  const furthestIndexes = sameGame ? stepProgress.furthest ?? {} : {};
  const context = useMemo<TutorialRuntimeContext>(
    () => ({ state, activeView, equipmentOpen, reptileOpen }),
    [activeView, equipmentOpen, reptileOpen, state],
  );
  const unavailableSceneIds = new Set([
    ...state.tutorial.completedSceneIds,
    ...state.tutorial.skippedSceneIds,
  ]);
  const candidateScene = TUTORIAL_SCENES.find(
    (scene) => !unavailableSceneIds.has(scene.id) && scene.canStart(context),
  ) ?? null;
  let resolvedStepIndex = candidateScene ? stepIndexes[candidateScene.id] ?? 0 : 0;
  const furthestStepIndex = candidateScene ? furthestIndexes[candidateScene.id] ?? 0 : 0;
  while (candidateScene) {
    const step = candidateScene.steps[resolvedStepIndex];
    // An objective revisited with «Indietro» waits for «Continua», even when already done.
    if (step?.kind !== "objective" || resolvedStepIndex < furthestStepIndex || !step.isComplete(context)) break;
    resolvedStepIndex += 1;
  }
  const objectiveCompletedScene = candidateScene && resolvedStepIndex >= candidateScene.steps.length
    ? candidateScene
    : null;
  const activeScene = objectiveCompletedScene ? null : candidateScene;
  const activeStep = activeScene?.steps[resolvedStepIndex] ?? null;
  const activeStepNavigation = activeStep?.navigateTo;
  /** An objective already done, shown again after «Indietro»: «✓ Fatto» and «Continua». */
  const isReviewing = activeStep?.kind === "objective" && resolvedStepIndex < furthestStepIndex;
  const storedStepIndex = candidateScene ? stepIndexes[candidateScene.id] ?? 0 : 0;

  // An objective reached stays reached: otherwise closing the sword menu by clicking
  // «Continua» would undo "Apri il menu delle spade" and loop the scene back to it.
  if (activeScene && resolvedStepIndex > storedStepIndex) {
    setStepProgress((current) => ({
      ...current,
      indexes: { ...current.indexes, [activeScene.id]: resolvedStepIndex },
    }));
  }

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
        furthest: current.gameCreatedAt === state.createdAt ? current.furthest : undefined,
      };
    });
  }, [activeScene, finishScene, onNavigate, resolvedStepIndex, state.createdAt]);

  /** «Indietro» (09/10/2026): one step back in the scene, remembering how far it had got. */
  const goBack = useCallback(() => {
    if (!activeScene || resolvedStepIndex === 0) return;
    const previousStep = activeScene.steps[resolvedStepIndex - 1];
    if (previousStep.navigateTo) onNavigate?.(previousStep.navigateTo);
    setStepProgress((current) => {
      const same = current.gameCreatedAt === state.createdAt;
      const furthest = same ? current.furthest ?? {} : {};
      return {
        gameCreatedAt: state.createdAt,
        indexes: { ...(same ? current.indexes : {}), [activeScene.id]: resolvedStepIndex - 1 },
        furthest: {
          ...furthest,
          [activeScene.id]: Math.max(furthest[activeScene.id] ?? 0, resolvedStepIndex),
        },
      };
    });
  }, [activeScene, onNavigate, resolvedStepIndex, state.createdAt]);

  return {
    context,
    activeScene,
    activeStep,
    activeStepIndex: resolvedStepIndex,
    continueScene,
    goBack,
    isReviewing,
    skipScene: () => finishScene(true),
    shouldPauseGame: Boolean(candidateScene?.pauseWhileActive || activeStep?.kind === "dialog"),
    isBlockingInput: activeStep?.kind === "dialog",
  };
}
