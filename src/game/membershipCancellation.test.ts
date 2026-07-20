import { describe, expect, it } from "vitest";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { createAcquiredContacts } from "./contacts";
import { createInitialState } from "./initialState";
import { cancelMemberEnrollment } from "./membershipFlow";
import { scheduleSecretLegendaryTrial } from "./tournamentFlow";
import type { Collaborator, Contact, SecretLegendaryId } from "./types";

function cancellableState() {
  const initial = createInitialState(1_000, "", false);
  return {
    ...initial,
    upgrades: { ...initial.upgrades, "no-hard-feelings": 1 },
  };
}

describe("Nessun Rancore", () => {
  it("removes an ordinary member from the school without reducing Fame or history", () => {
    const initial = cancellableState();
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const state = {
      ...initial,
      contacts: [member, ...initial.contacts.slice(1)],
      school: { ...initial.school, activeMembers: 1, historicMembers: 7 },
    };

    const cancelled = cancelMemberEnrollment(state, member.id);

    expect(cancelled.contacts.find((contact) => contact.id === member.id)?.status).toBe("departed");
    expect(cancelled.school.activeMembers).toBe(0);
    expect(cancelled.school.historicMembers).toBe(7);
    expect(cancelled.statistics.membersDeparted).toBe(1);
  });

  it("retains all earned Legendary progress and allows a normal re-encounter", () => {
    const initial = cancellableState();
    const member: Contact = {
      ...initial.contacts[0],
      firstName: "Eva",
      lastName: "Parodi",
      status: "enrolled",
      rarity: "legendary",
      specialProfileId: "eva-parodi",
      forms: ["form-1", "course-x"],
      arenaBase: 91,
      styleBase: 87,
      tournamentExperience: 6,
      agonistCourseCompletions: 3,
    };
    const collaborator: Collaborator = {
      id: "eva-collaborator",
      contactId: member.id,
      displayName: "Eva Parodi",
      joinedAt: 500,
      forms: [...member.forms],
      instructorForms: ["form-1"],
      formBranchPreferences: [],
      autoTeachingEnabled: true,
      assignment: "instructor",
      mastery: { writing: 10, events: 20, lessons: 30, social: 40, equipment: 50, instructor: 60 },
      rarity: "legendary",
      specialProfileId: "eva-parodi",
    };
    const student = {
      ...initial.contacts[1],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 2_000,
        instructorId: collaborator.id,
      },
    };
    const state = {
      ...initial,
      contacts: [member, student, ...initial.contacts.slice(2)],
      collaborators: [collaborator],
      school: { ...initial.school, activeMembers: 2, historicMembers: 12 },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: ["eva-parodi" as const],
        enrolledProfileIds: ["eva-parodi" as const],
      },
      tournaments: {
        ...initial.tournaments,
        qualification: { level: "academy" as const, season: 1, contactIds: [member.id] },
        immuneContactIds: [member.id],
      },
    };

    const cancelled = cancelMemberEnrollment(state, member.id);
    const retained = cancelled.legendaryCollaborators.retainedProgress["eva-parodi"];
    expect(cancelled.collaborators).toEqual([]);
    expect(cancelled.contacts.find((contact) => contact.id === student.id)?.training).toBeUndefined();
    expect(cancelled.tournaments.qualification).toBeUndefined();
    expect(retained).toMatchObject({
      forms: ["form-1", "course-x"],
      instructorForms: ["form-1"],
      joinedAt: 500,
      mastery: collaborator.mastery,
      arenaBase: 91,
      styleBase: 87,
      tournamentExperience: 6,
      agonistCourseCompletions: 3,
    });

    const allOtherLegendaryIds = SPECIAL_COLLABORATORS
      .map((profile) => profile.id)
      .filter((id) => id !== "eva-parodi");
    const acquired = createAcquiredContacts({
      ...cancelled,
      legendaryCollaborators: {
        ...cancelled.legendaryCollaborators,
        enrolledProfileIds: allOtherLegendaryIds,
      },
    }, 1, "event", 5_000, { forcedRarity: "legendary" });
    expect(acquired.contacts[0]).toMatchObject({
      id: member.id,
      specialProfileId: "eva-parodi",
      status: "available",
      forms: ["form-1", "course-x"],
      arenaBase: 91,
      styleBase: 87,
      tournamentExperience: 6,
      agonistCourseCompletions: 3,
    });
  });

  it("returns a cancelled Secret Legendary to the tournament path", () => {
    const initial = cancellableState();
    const secretId: SecretLegendaryId = "marco-palena";
    const member: Contact = {
      ...initial.contacts[0],
      status: "enrolled",
      rarity: "legendary",
      specialProfileId: secretId,
      secretLegendaryId: secretId,
      forms: ["form-1", "course-x"],
      arenaBase: 120,
      styleBase: 110,
    };
    const state = {
      ...initial,
      contacts: [member, ...initial.contacts.slice(1)],
      school: { ...initial.school, activeMembers: 1, historicMembers: 20 },
      network: {
        ...initial.network,
        secretLegendaries: {
          ...initial.network.secretLegendaries,
          [secretId]: {
            ...initial.network.secretLegendaries[secretId],
            status: "enrolled" as const,
            enrolledContactId: member.id,
          },
        },
      },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: [secretId],
        enrolledProfileIds: [secretId],
      },
    };

    const cancelled = cancelMemberEnrollment(state, member.id);
    expect(cancelled.network.secretLegendaries[secretId]).toMatchObject({
      status: "external",
      enrolledContactId: undefined,
    });

    const scheduled = scheduleSecretLegendaryTrial(cancelled, secretId, 5_000);
    expect(scheduled.contacts.find((contact) => contact.id === member.id)).toMatchObject({
      status: "trialScheduled",
      arenaBase: 120,
      styleBase: 110,
    });
  });
});
