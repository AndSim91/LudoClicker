import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEmailBuildLength } from "../content/emailBuild";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { needsAutomationHeartbeat } from "./gameScheduler";
import { loadGame, saveGame } from "./save";
import { useGameEngine } from "./useGameEngine";
import { STORAGE_KEYS } from "../shared/storageKeys";

describe("useGameEngine pause", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    saveGame(createInitialState(1_000, "Andrea Ungaro"), 1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("keeps the game clock and every remaining duration frozen", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => vi.advanceTimersByTime(250));
    act(() => result.current.togglePause());

    const pausedAt = result.current.state.automation.lastProcessedAt;
    const remainingMonthMs = result.current.state.school.nextFeeAt - pausedAt;
    expect(result.current.isPaused).toBe(true);

    act(() => result.current.dispatch({
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: result.current.getGameNow(),
    }));
    expect(result.current.state.acquisitionEvents[0].resolvesAt - pausedAt).toBe(10_000);

    act(() => vi.advanceTimersByTime(GAME_CONFIG.saveIntervalMs));

    expect(result.current.getGameNow()).toBe(pausedAt);
    expect(result.current.state.automation.lastProcessedAt).toBe(pausedAt);
    expect(result.current.state.school.nextFeeAt - pausedAt).toBe(remainingMonthMs);
    expect(result.current.state.acquisitionEvents[0].status).toBe("running");
    const reloadedWhilePaused = loadGame(Date.now());
    expect(
      reloadedWhilePaused.school.nextFeeAt -
      reloadedWhilePaused.automation.lastProcessedAt,
    ).toBe(remainingMonthMs);

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
    expect(
      result.current.state.school.nextFeeAt -
      result.current.state.automation.lastProcessedAt,
    ).toBe(remainingMonthMs);
    expect(
      result.current.state.acquisitionEvents[0].resolvesAt -
      result.current.state.automation.lastProcessedAt,
    ).toBe(10_000);
  });

  it("does not turn a tutorial pause into a manual pause when pressing resume", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => result.current.setTutorialPaused(true));
    expect(result.current.isPaused).toBe(true);

    act(() => result.current.togglePause());
    act(() => result.current.setTutorialPaused(false));
    expect(result.current.isPaused).toBe(false);
  });

  it("keeps a pause chosen before the tutorial until the player resumes", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => result.current.togglePause());
    act(() => result.current.setTutorialPaused(true));
    act(() => result.current.setTutorialPaused(false));
    expect(result.current.isPaused).toBe(true);

    act(() => result.current.togglePause());
    expect(result.current.isPaused).toBe(false);
  });

  it("waits for the final send input while tutorial time stays frozen", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => result.current.setTutorialPaused(true));
    const pausedAt = result.current.getGameNow();
    const writingInputs = getEmailBuildLength(result.current.state.emails[0]);

    act(() => {
      result.current.dispatch({
        type: "SET_AUTOMATIC_EMAIL_SENDING",
        enabled: false,
        now: result.current.getGameNow(),
      });
    });

    act(() => {
      for (let input = 0; input < writingInputs; input += 1) {
        result.current.dispatch({ type: "WRITE", now: result.current.getGameNow() });
      }
    });

    expect(result.current.getGameNow()).toBe(pausedAt);
    expect(result.current.state.emails[0].status).toBe("readyToSend");
    expect(result.current.state.statistics.emailsSent).toBe(0);

    act(() => {
      result.current.dispatch({ type: "SEND_EMAIL", now: result.current.getGameNow() });
    });

    expect(result.current.state.emails[0].status).toBe("sending");

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.getGameNow()).toBe(pausedAt);
    expect(result.current.state.statistics.emailsSent).toBe(0);

    act(() => result.current.setTutorialPaused(false));
    expect(result.current.isPaused).toBe(false);

    act(() => vi.advanceTimersByTime(GAME_CONFIG.sendDelayMs - 1));
    expect(result.current.state.statistics.emailsSent).toBe(0);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.state.statistics.emailsSent).toBe(1);
  });

  it("does not update an idle game before its nearest deadline", () => {
    const { result } = renderHook(() => useGameEngine());
    const initialState = result.current.state;
    expect(needsAutomationHeartbeat(initialState)).toBe(false);

    act(() => vi.advanceTimersByTime(59_999));
    expect(result.current.state).toBe(initialState);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.state).not.toBe(initialState);
    expect(result.current.state.school.currentMonth).toBe(
      initialState.school.currentMonth + 1,
    );
  });

  it("autosaves the latest game state every minute", () => {
    const { result } = renderHook(() => useGameEngine());

    expect(result.current.saveStatus.phase).toBe("saved");

    act(() => result.current.dispatch({
      type: "UPDATE_PROFILE_NAME",
      displayName: "Legend",
    }));
    expect(result.current.saveStatus.phase).toBe("pending");

    act(() => vi.advanceTimersByTime(59_999));
    const beforeInterval = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.gameSave)!,
    );
    expect(beforeInterval.profile.displayName).toBe("Andrea Ungaro");
    expect(beforeInterval.lastSavedAt).toBe(1_000);

    act(() => vi.advanceTimersByTime(1));
    act(() => vi.advanceTimersByTime(1));
    const afterInterval = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.gameSave)!,
    );
    expect(afterInterval.profile.displayName).toBe("Legend");
    expect(afterInterval.lastSavedAt).toBe(61_000);
    expect(result.current.saveStatus).toMatchObject({
      phase: "saved",
      lastSavedAt: 61_000,
    });
  });

  it("saves immediately on request and when the page is hidden", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => result.current.dispatch({
      type: "UPDATE_PROFILE_NAME",
      displayName: "Salvataggio manuale",
    }));
    act(() => result.current.saveNow());

    let stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.gameSave)!);
    expect(stored.profile.displayName).toBe("Salvataggio manuale");
    expect(result.current.saveStatus.phase).toBe("saved");

    act(() => result.current.dispatch({
      type: "UPDATE_PROFILE_NAME",
      displayName: "Salvataggio in uscita",
    }));
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));

    stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.gameSave)!);
    expect(stored.profile.displayName).toBe("Salvataggio in uscita");
    expect(result.current.saveStatus.phase).toBe("saved");
  });

  it("reports a storage failure without pretending the game is saved", () => {
    const { result } = renderHook(() => useGameEngine());
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Storage unavailable");
      });

    act(() => result.current.dispatch({
      type: "UPDATE_PROFILE_NAME",
      displayName: "Modifica non salvata",
    }));
    act(() => result.current.saveNow());

    expect(result.current.saveStatus.phase).toBe("error");
    setItemSpy.mockRestore();
  });

  it("uses a one-second heartbeat while continuous automation is active", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    saveGame({
      ...initial,
      school: { ...initial.school, activeMembers: 1 },
      contacts: initial.contacts.map((contact) => ({
        ...contact,
        status: "enrolled" as const,
        enrolledMonth: initial.school.currentMonth,
      })),
      collaborators: [{
        id: "writer-1",
        contactId: initial.contacts[0].id,
        displayName: "Writer Test",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        assignment: "instructor",
        mastery: {
          writing: 0,
          events: 0,
          equipment: 0,
          instructor: 0,
        },
        rarity: "ultra-rare",
      }],
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
    }, 1_000);
    const { result } = renderHook(() => useGameEngine());
    const initialState = result.current.state;
    expect(needsAutomationHeartbeat(initialState)).toBe(true);

    act(() => vi.advanceTimersByTime(999));
    expect(result.current.state).toBe(initialState);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.state).not.toBe(initialState);
    expect(result.current.state.automation.lastProcessedAt).toBe(2_000);
  });

  it("does not postpone collaborator writing while manual inputs keep changing state", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    saveGame({
      ...initial,
      collaborators: [{
        id: "writer-1",
        contactId: initial.contacts[0].id,
        displayName: "Writer Test",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        assignment: "writing",
        mastery: {
          writing: 0,
          events: 0,
          equipment: 0,
          instructor: 0,
        },
        rarity: "ultra-rare",
      }],
    }, 1_000);
    const { result } = renderHook(() => useGameEngine());

    for (let input = 0; input < 9; input += 1) {
      act(() => vi.advanceTimersByTime(100));
      act(() => result.current.dispatch({ type: "WRITE", now: Date.now() }));
    }

    expect(result.current.state.statistics.inputs).toBe(9);
    expect(result.current.state.statistics.automatedCharacters).toBe(0);

    act(() => vi.advanceTimersByTime(100));

    expect(result.current.state.statistics.inputs).toBe(9);
    expect(result.current.state.statistics.automatedCharacters).toBe(5);
    expect(result.current.state.emails[0].revealedCharacters).toBe(14);
  });
});
