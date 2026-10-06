import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import {
  getSocialUnlockRequirementLabel,
  hasSocialCollaboratorRequirement,
  isCollaboratorAreaVisible,
  isOfficialSwordSupplierVisible,
  unlockSocialIfEligible,
} from "./unlocks";
import type { GameState } from "./types";
import { recruitCollaborator } from "./collaboratorFlow";

describe("game unlock rules", () => {
  it("opens Social with the 15th collaborator, label included", () => {
    expect(GAME_CONFIG.socialUnlockCollaborators).toBe(15);
    expect(hasSocialCollaboratorRequirement(14)).toBe(false);
    expect(hasSocialCollaboratorRequirement(15)).toBe(true);
    expect(getSocialUnlockRequirementLabel()).toBe("15 collaboratori");
  });

  it("starts Social with one Follower per Fame point and initializes them only once", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 15 }, (_, index) => ({ id: `c${index}` })) as GameState["collaborators"];
    const eligible = {
      ...initial,
      collaborators,
      school: { ...initial.school, activeMembers: 5, fame: 47 },
    };

    expect(unlockSocialIfEligible({ ...eligible, collaborators: collaborators.slice(1) }, 2_000).unlocks.social).toBe(false);
    const unlocked = unlockSocialIfEligible(eligible, 2_000);
    expect(unlocked.unlocks.social).toBe(true);
    expect(unlocked.school.followers).toBe(47);
    expect(unlocked.messages.filter((message) => message.subject === "La Redazione diventa Social")).toHaveLength(1);

    const withMoreFollowers = {
      ...unlocked,
      school: { ...unlocked.school, followers: 57 },
    };
    expect(unlockSocialIfEligible(withMoreFollowers, 3_000)).toBe(withMoreFollowers);
  });

  it("opens Social when the 15th collaborator is recruited", () => {
    const initial = createInitialState(1_000);
    const team = Array.from({ length: 14 }, (_, index) => ({ id: `c${index}`, contactId: `x${index}` })) as GameState["collaborators"];
    const contact = { ...initial.contacts[0], rarity: "legendary" as const };
    const recruited = recruitCollaborator({ ...initial, collaborators: team }, contact, 2_000);
    expect(recruited.collaborators).toHaveLength(15);
    expect(recruited.unlocks.social).toBe(true);
  });

  it("keeps collaborator visibility tied to actual collaborator progression", () => {
    const initial = createInitialState(1_000);
    expect(isCollaboratorAreaVisible(initial)).toBe(false);
    expect(isCollaboratorAreaVisible({
      ...initial,
      unlocks: { ...initial.unlocks, collaborators: true },
    })).toBe(true);
  });

  it("opens the sword supplier only with the Fornitore ufficiale upgrade", () => {
    const initial = createInitialState(1_000);
    expect(isOfficialSwordSupplierVisible(initial)).toBe(false);
    expect(isOfficialSwordSupplierVisible({
      ...initial,
      school: { ...initial.school, peakActiveMembers: 500 },
    })).toBe(false);
    expect(isOfficialSwordSupplierVisible({
      ...initial,
      upgrades: { ...initial.upgrades, "official-supplier": 1 },
    })).toBe(true);
  });
});
