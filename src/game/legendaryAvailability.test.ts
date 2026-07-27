import { describe, expect, it } from "vitest";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { scheduleAdminLegendaryTrial } from "./adminFlow";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./initialState";
import { getAvailableStandardLegendaryProfiles } from "./legendaryAvailability";
import type { Contact, GameState, ScheduledTrial } from "./types";

const TRIAL_RESOLVED_AT = 2_000;
const TRIAL_EXPIRES_AT = TRIAL_RESOLVED_AT + GAME_CONFIG.dayNotificationVisibilityMs;

function stateWithOneEnrolledAndSevenFailed(): GameState {
  const initial = createInitialState(1_000, "Manager");
  const [enrolledProfile, ...failedProfiles] = SPECIAL_COLLABORATORS;
  const legendaryContacts: Contact[] = SPECIAL_COLLABORATORS.map((profile) => ({
    ...initial.contacts[0],
    id: `contact-${profile.id}`,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: `${profile.id}@example.invalid`,
    acquiredAt: 1_000,
    status: profile.id === enrolledProfile.id ? "enrolled" : "lost",
    rarity: "legendary",
    specialProfileId: profile.id,
  }));
  const failedTrials: ScheduledTrial[] = failedProfiles.map((profile, index) => ({
    id: `trial-${profile.id}`,
    contactId: `contact-${profile.id}`,
    startsAt: 1_000 + index,
    resolvesAt: TRIAL_RESOLVED_AT,
    resultSeed: index,
    status: "completed",
  }));

  return {
    ...initial,
    contacts: legendaryContacts,
    scheduledTrials: failedTrials,
    school: {
      ...initial.school,
      activeMembers: 1,
      peakActiveMembers: 1,
      fame: 1,
    },
    legendaryCollaborators: {
      ...initial.legendaryCollaborators,
      enrolledProfileIds: [enrolledProfile.id],
    },
  };
}

describe("Legendary availability after failed trials", () => {
  it("releases all seven failed profiles exactly when their day notifications expire", () => {
    const state = stateWithOneEnrolledAndSevenFailed();

    expect(getAvailableStandardLegendaryProfiles(state, TRIAL_EXPIRES_AT - 1))
      .toHaveLength(0);
    expect(getAvailableStandardLegendaryProfiles(state, TRIAL_EXPIRES_AT).map(
      (profile) => profile.id,
    )).toEqual(SPECIAL_COLLABORATORS.slice(1).map((profile) => profile.id));
    expect(getAvailableStandardLegendaryProfiles(
      { ...state, scheduledTrials: [] },
      TRIAL_EXPIRES_AT + 1,
    )).toHaveLength(7);
  });

  it("lets the Admin action schedule one of the released profiles again", () => {
    const state = stateWithOneEnrolledAndSevenFailed();

    expect(scheduleAdminLegendaryTrial(state, TRIAL_EXPIRES_AT - 1)).toBe(state);

    const scheduled = scheduleAdminLegendaryTrial(state, TRIAL_EXPIRES_AT);
    const newTrial = scheduled.scheduledTrials.at(-1)!;
    const contact = scheduled.contacts.find((candidate) => candidate.id === newTrial.contactId);

    expect(scheduled.scheduledTrials).toHaveLength(state.scheduledTrials.length + 1);
    expect(contact).toMatchObject({
      status: "trialScheduled",
      rarity: "legendary",
    });
    expect(SPECIAL_COLLABORATORS.slice(1).some(
      (profile) => profile.id === contact?.specialProfileId,
    )).toBe(true);
  });
});
