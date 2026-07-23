import { describe, expect, it } from "vitest";
import { getEmailBuildLength } from "../content/emailBuild";
import { getShortGoalProgress } from "../content/shortGoals";
import { createInitialState, gameReducer } from "./engine";
import { isGameAreaUnlocked } from "./progression";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";

function completeActiveDraft(state: GameState, now: number): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail) throw new Error("Expected an active email draft");

  return gameReducer(
    {
      ...state,
      player: {
        ...state.player,
        writingPower: getEmailBuildLength(activeEmail),
      },
    },
    { type: "WRITE", now },
  );
}

function finishSendingEmail(state: GameState): GameState {
  const sendingState = state.emails.some((email) => email.status === "sending")
    ? state
    : gameReducer(state, { type: "WRITE", now: state.lastSavedAt });
  const sendingEmail = sendingState.emails.find((email) => email.status === "sending");
  if (!sendingEmail?.sendCompletesAt) throw new Error("Expected an email being sent");
  return gameReducer(sendingState, { type: "TICK", now: sendingEmail.sendCompletesAt });
}

describe("initial tutorial progression", () => {
  it("excludes the tutorial email from the three-email mission and unlocks Events only after it", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const firstDraftCompleted = completeActiveDraft(initial, 1_100);

    expect(firstDraftCompleted.emails[0].status).toBe("sending");
    expect(firstDraftCompleted.statistics.emailsSent).toBe(0);
    expect(isGameAreaUnlocked("events", firstDraftCompleted)).toBe(false);

    const tutorialCompleted = gameReducer(firstDraftCompleted, {
      type: "FINISH_TUTORIAL_SCENE",
      sceneId: "first-invitation",
      skipped: false,
    });

    expect(tutorialCompleted.tutorial.completedSceneIds).toContain("first-invitation");
    expect(tutorialCompleted.shortGoal).toMatchObject({
      definitionId: "send-emails",
      baseline: 1,
      target: 3,
      completedCount: 0,
    });
    expect(getShortGoalProgress(tutorialCompleted)).toBe(0);

    let progressed = finishSendingEmail(tutorialCompleted);
    expect(progressed.statistics.emailsSent).toBe(1);
    expect(progressed.pendingEmailOutcomes[0]).toMatchObject({
      result: "trialBooked",
      tutorialSceneId: "first-event",
      waitForTutorialEvent: true,
    });
    expect(getShortGoalProgress(progressed)).toBe(0);
    expect(isGameAreaUnlocked("events", progressed)).toBe(false);

    progressed = finishSendingEmail(completeActiveDraft(progressed, 2_000));
    expect(getShortGoalProgress(progressed)).toBe(1);
    expect(isGameAreaUnlocked("events", progressed)).toBe(false);

    progressed = finishSendingEmail(completeActiveDraft(progressed, 3_000));
    expect(progressed.statistics.emailsSent).toBe(3);
    expect(getShortGoalProgress(progressed)).toBe(2);
    expect(isGameAreaUnlocked("events", progressed)).toBe(false);

    progressed = finishSendingEmail(completeActiveDraft(progressed, 4_000));
    expect(progressed.statistics.emailsSent).toBe(4);
    expect(progressed.shortGoal).toMatchObject({
      definitionId: "book-trials",
      completedCount: 1,
    });
    expect(isGameAreaUnlocked("events", progressed)).toBe(true);
    expect(progressed.messages.some(
      (message) => message.subject === "Ufficio Eventi disponibile",
    )).toBe(true);

    expect(progressed.pendingEmailOutcomes).toHaveLength(4);
    expect(progressed.pendingEmailOutcomes.every(
      (outcome) => outcome.waitForTutorialEvent,
    )).toBe(true);
    expect(progressed.scheduledTrials).toHaveLength(0);

    const contactsBeforeSparring = progressed.contacts.length;
    const sparringStarted = gameReducer(progressed, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 5_000,
    });
    const tutorialSparring = sparringStarted.acquisitionEvents.find(
      (event) => event.tutorialSceneId === "first-event",
    );
    expect(tutorialSparring).toMatchObject({
      definitionId: "park-sparring",
      startedAt: 5_000,
      resolvesAt: 10_000,
      status: "running",
    });
    expect(tutorialSparring?.contactReward).toBeGreaterThanOrEqual(1);

    const sparringCompleted = gameReducer(sparringStarted, { type: "TICK", now: 10_000 });
    expect(sparringCompleted.contacts.length).toBeGreaterThan(contactsBeforeSparring);
    expect(sparringCompleted.scheduledTrials).toHaveLength(0);
    expect(sparringCompleted.pendingEmailOutcomes.filter(
      (outcome) => outcome.waitForTutorialEvent,
    )).toHaveLength(3);
    expect(sparringCompleted.pendingEmailOutcomes.find(
      (outcome) => outcome.tutorialSceneId === "first-event",
    )).toMatchObject({
      resolvesAt: 10_000,
      result: "trialBooked",
      waitForTutorialEvent: undefined,
    });

    const trialAppeared = gameReducer(sparringCompleted, { type: "TICK", now: 10_001 });
    expect(trialAppeared.scheduledTrials).toContainEqual(expect.objectContaining({
      status: "scheduled",
      tutorialSceneId: "first-event",
    }));
    expect(trialAppeared.statistics.trialsBooked).toBe(1);
  });

  it("keeps later park sparring runs at their normal duration", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const eventsUnlocked: GameState = {
      ...initial,
      tutorial: {
        completedSceneIds: ["first-invitation", "first-event", "first-trial"],
        skippedSceneIds: [],
      },
      shortGoal: {
        definitionId: "book-trials",
        baseline: 0,
        target: 2,
        startedAt: 1_500,
        completedCount: 1,
      },
    };

    const started = gameReducer(eventsUnlocked, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    });

    expect(started.acquisitionEvents[0]).toMatchObject({
      startedAt: 2_000,
      resolvesAt: 12_000,
      tutorialSceneId: undefined,
    });
  });

  it("does not unlock Events merely because the campaign queue is empty", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const withoutCampaignQueue: GameState = {
      ...initial,
      contacts: initial.contacts.map((contact) => ({
        ...contact,
        status: "lost" as const,
      })),
      emails: [],
    };

    expect(isGameAreaUnlocked("events", withoutCampaignQueue)).toBe(false);
  });
});
