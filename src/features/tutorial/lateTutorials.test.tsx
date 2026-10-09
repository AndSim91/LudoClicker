import { act, renderHook, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it } from "vitest";
import { LATE_TUTORIAL_SCENE_IDS, TUTORIAL_SCENE_IDS } from "../../content/tutorialScenes";
import { gameReducer } from "../../game/engine";
import { createInitialState } from "../../game/initialState";
import type { GameAction, GameState } from "../../game/types";
import { useTutorialController } from "./useTutorialController";

const EARLY_SCENES = TUTORIAL_SCENE_IDS.filter(
  (id) => !(LATE_TUTORIAL_SCENE_IDS as readonly string[]).includes(id),
);

/** A game past the first hour: every early scene done. */
function startedGame(change: (state: GameState) => GameState): GameState {
  const state = createInitialState(1_000, "Andrea Ungaro");
  return change({ ...state, tutorial: { completedSceneIds: [...EARLY_SCENES], skippedSceneIds: [] } });
}

function useHarness(initial: GameState) {
  const [state, setState] = useState(initial);
  const [activeView, setActiveView] = useState("mail");
  const [reptileOpen, setReptileOpen] = useState(false);
  const dispatch = useCallback((action: GameAction) => setState((current) => gameReducer(current, action)), []);
  const tutorial = useTutorialController({ state, activeView, reptileOpen, dispatch, onNavigate: setActiveView });
  return { state, setState, tutorial, setActiveView, setReptileOpen };
}

describe("tutorials of the second half (05/10)", () => {
  it("shows the first tournament results on Tornei › Risultati once the player opens Tornei", async () => {
    const game = startedGame((state) => ({
      ...state,
      tournaments: { ...state.tournaments, results: [{ id: "school-1", level: "school" } as GameState["tournaments"]["results"][number]] },
    }));
    const { result } = renderHook(() => useHarness(game));
    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("first-tournament"));
    expect(result.current.tutorial.activeStep?.kind).toBe("objective");

    act(() => result.current.setActiveView("tournaments"));
    await waitFor(() => expect(result.current.tutorial.activeStep?.id).toBe("watch-the-final"));
    expect(result.current.tutorial.activeStep?.tournamentTab).toBe("results");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);
  });

  it("plays the Network first and then the Reptile when one Nazionale opens both", async () => {
    const game = startedGame((state) => ({
      ...state,
      tournaments: {
        ...state.tournaments,
        nationalTitlesCurrentSchool: 1,
        reptile: { ...state.tournaments.reptile, unlocked: true },
      },
    }));
    const { result } = renderHook(() => useHarness(game));
    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("network-introduction"));

    act(() => result.current.tutorial.skipScene());
    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("reptile-introduction"));
    // 10/10/2026: M.A.K.I. introduces herself at the Consiglio; here Tornei, then Open › Reptile.
    expect(result.current.tutorial.activeStep?.id).toBe("national-legacy");
    act(() => result.current.setActiveView("tournaments"));
    await waitFor(() => expect(result.current.tutorial.activeStep?.id).toBe("open-reptile"));
    act(() => result.current.setReptileOpen(true));
    await waitFor(() => expect(result.current.tutorial.activeStep?.id).toBe("reptile-tournament"));
  });

  it("brings in M.A.K.I. after the Consiglio and points at the Accademico", async () => {
    const game = startedGame((state) => ({
      ...state,
      collaboratorManagement: { ...state.collaboratorManagement, aggregateViewUnlocked: true },
    }));
    const { result } = renderHook(() => useHarness(game));
    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("academy-goal"));
    expect(result.current.tutorial.activeStep?.id).toBe("council-born");
    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("maki-signal");
    act(() => result.current.tutorial.continueScene());
    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("open-tournaments");
    act(() => result.current.setActiveView("tournaments"));
    await waitFor(() => expect(result.current.tutorial.activeStep?.id).toBe("next-stop-academy"));
  });

  it("does not announce the Accademico once it is won", () => {
    const game = startedGame((state) => ({
      ...state,
      collaboratorManagement: { ...state.collaboratorManagement, aggregateViewUnlocked: true },
      tournaments: { ...state.tournaments, academyTitlesCurrentSchool: 1 },
    }));
    const { result } = renderHook(() => useHarness(game));
    expect(result.current.tutorial.activeScene?.id).not.toBe("academy-goal");
  });

  it("does not introduce the Network again in a school founded later", () => {
    const game = startedGame((state) => ({
      ...state,
      network: { ...state.network, schoolCount: 1 },
      tournaments: { ...state.tournaments, nationalTitlesCurrentSchool: 1 },
    }));
    const { result } = renderHook(() => useHarness(game));
    expect(result.current.tutorial.activeScene).toBeNull();
  });
});
