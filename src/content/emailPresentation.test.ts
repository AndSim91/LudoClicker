import { describe, expect, it } from "vitest";
import { createInitialUpgradeLevels } from "./upgrades";
import {
  chooseEmailPresentationLevel,
  getEmailPresentationLevel,
  getEmailPresentationMix,
} from "./emailPresentation";

describe("email presentation progression", () => {
  it("follows the eight email quality milestones", () => {
    const upgrades = createInitialUpgradeLevels();
    expect(getEmailPresentationLevel(upgrades)).toBe(0);

    upgrades["spell-check"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(1);

    upgrades["professional-email"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(2);

    upgrades["personalized-invite"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(3);

    upgrades["call-to-action"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(4);

    upgrades["email-layout"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(5);

    upgrades["winning-advertising"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(6);

    upgrades["marketing-course"] = 1;
    expect(getEmailPresentationLevel(upgrades)).toBe(7);
  });

  it("moves 20% of generated emails to the new catalog for every purchased level", () => {
    const upgrades = createInitialUpgradeLevels();
    upgrades["spell-check"] = 1;

    expect(getEmailPresentationMix(upgrades)).toEqual({
      previousLevel: 0,
      newLevel: 1,
      purchasedLevels: 1,
      previousCatalogShare: 0.8,
      newCatalogShare: 0.2,
    });
    expect(chooseEmailPresentationLevel(upgrades, 0.19)).toBe(1);
    expect(chooseEmailPresentationLevel(upgrades, 0.2)).toBe(0);

    upgrades["spell-check"] = 4;
    expect(chooseEmailPresentationLevel(upgrades, 0.79)).toBe(1);
    expect(chooseEmailPresentationLevel(upgrades, 0.8)).toBe(0);

    upgrades["spell-check"] = 5;
    expect(chooseEmailPresentationLevel(upgrades, 0.99)).toBe(1);

    upgrades["professional-email"] = 1;
    expect(getEmailPresentationMix(upgrades)).toMatchObject({
      previousLevel: 1,
      newLevel: 2,
      previousCatalogShare: 0.8,
      newCatalogShare: 0.2,
    });
  });
});
