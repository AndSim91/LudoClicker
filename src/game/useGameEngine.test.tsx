import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./engine";
import { needsAutomationHeartbeat } from "./gameScheduler";
import { loadGame, saveGame } from "./save";
import { useGameEngine } from "./useGameEngine";

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
    expect(result.current.state.acquisitionEvents[0].resolvesAt - pausedAt).toBe(15_000);

    act(() => vi.advanceTimersByTime(30_000));

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
    ).toBe(15_000);
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
        autoTeachingEnabled: true,
        assignment: "lessons",
        mastery: {
          writing: 0,
          events: 0,
          lessons: 0,
          social: 0,
          equipment: 0,
          instructor: 0,
        },
        rarity: "ultra-rare",
      }],
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
});
