import { describe, expect, it } from "vitest";
import { createInitialUpgradeLevels } from "./upgrades";
import { getEmailPresentationLevel } from "./emailPresentation";

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
});
