import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import {
  getSocialUnlockRequirementLabel,
  hasSocialMemberRequirement,
  isCollaboratorAreaVisible,
  isOfficialSwordSupplierVisible,
  unlockSocialIfEligible,
} from "./unlocks";

describe("game unlock rules", () => {
  it("uses one shared member requirement for Social logic and labels", () => {
    expect(GAME_CONFIG.socialUnlockMembers).toBe(15);
    expect(hasSocialMemberRequirement(GAME_CONFIG.socialUnlockMembers - 1)).toBe(false);
    expect(hasSocialMemberRequirement(GAME_CONFIG.socialUnlockMembers)).toBe(true);
    expect(getSocialUnlockRequirementLabel()).toBe("15 iscritti");
  });

  it("starts Social with one Follower per active member and initializes them only once", () => {
    const initial = createInitialState(1_000);
    const eligible = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: GAME_CONFIG.socialUnlockMembers,
      },
    };

    const unlocked = unlockSocialIfEligible(eligible);
    expect(unlocked.unlocks.social).toBe(true);
    expect(unlocked.school.followers).toBe(GAME_CONFIG.socialUnlockMembers);

    const withMoreFollowers = {
      ...unlocked,
      school: { ...unlocked.school, followers: GAME_CONFIG.socialUnlockMembers + 10 },
    };
    expect(unlockSocialIfEligible(withMoreFollowers)).toBe(withMoreFollowers);
  });

  it("keeps collaborator visibility tied to actual collaborator progression", () => {
    const initial = createInitialState(1_000);
    expect(isCollaboratorAreaVisible(initial)).toBe(false);
    expect(isCollaboratorAreaVisible({
      ...initial,
      unlocks: { ...initial.unlocks, collaborators: true },
    })).toBe(true);
  });

  it("derives supplier visibility from the centralized fame requirement", () => {
    const initial = createInitialState(1_000);
    expect(isOfficialSwordSupplierVisible(initial)).toBe(false);
    expect(isOfficialSwordSupplierVisible({
      ...initial,
      school: {
        ...initial.school,
        peakActiveMembers: GAME_CONFIG.officialSwordSupplierUnlockMembers,
      },
    })).toBe(true);
  });
});
