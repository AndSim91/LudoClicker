import { describe, expect, it } from "vitest";
import { getEmailBuildLength } from "../content/emailBuild";
import { createInitialUpgradeLevels } from "../content/upgrades";
import {
  processAutomaticEquipmentRepair,
  processAutomation,
  type AutomationFlowDependencies,
} from "./automationFlow";
import { startNextCampaign } from "./emailFlow";
import { createInitialState } from "./initialState";
import { getEmailBookingChance, getEnrollmentChance } from "./formulas";
import { nextRandom } from "./random";
import { resolveTrial } from "./trialFlow";
import type { Collaborator, GameState, ScheduledTrial } from "./types";

const automationDependencies: AutomationFlowDependencies = {
  addMessage: (state) => state,
  writeCharacters: (state) => state,
  startFormTraining: (state) => state,
  startAgonistCourse: (state) => state,
};

function findFailedTrialWithSuccessfulRetry(state: GameState): number {
  const enrollmentChance = getEnrollmentChance(state, "common");
  for (let seed = 0; seed < 100_000; seed += 1) {
    const [enrollmentRoll, retrySeed] = nextRandom(seed);
    const [retryRoll] = nextRandom(retrySeed);
    if (enrollmentRoll >= enrollmentChance && retryRoll < 0.25) return seed;
  }
  throw new Error("No deterministic retry seed found");
}

describe("upgrade revamp mechanics", () => {
  it("applies Campi intelligenti only when a new email is created", () => {
    const initial = createInitialState(1_000, "", false);
    const emptyInbox = {
      ...initial,
      emails: [],
      contacts: initial.contacts.map((contact, index) => ({
        ...contact,
        status: index === 0 ? "available" as const : "lost" as const,
      })),
    };
    const existing = startNextCampaign(emptyInbox, 2_000);
    expect(existing.emails[0].revealedCharacters).toBe(0);

    const upgradedExisting = startNextCampaign({
      ...existing,
      upgrades: { ...existing.upgrades, "smart-fields": 5 },
    }, 3_000);
    expect(upgradedExisting.emails[0].revealedCharacters).toBe(0);

    const upgradedNew = startNextCampaign({
      ...emptyInbox,
      upgrades: { ...emptyInbox.upgrades, "smart-fields": 5 },
    }, 3_000);
    expect(upgradedNew.emails[0].revealedCharacters).toBe(
      Math.floor(getEmailBuildLength(upgradedNew.emails[0]) * 0.25),
    );
  });

  it("moves every rarity linearly from its booking base to the approved cap", () => {
    const initial = createInitialState(1_000, "", false);
    const maximumCreativity = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "spell-check": 5,
        "professional-email": 5,
        "personalized-invite": 5,
        "call-to-action": 5,
        "email-layout": 5,
        "winning-advertising": 5,
        "marketing-course": 5,
      },
    };

    expect(getEmailBookingChance(maximumCreativity, "common")).toBe(0.85);
    expect(getEmailBookingChance(maximumCreativity, "rare")).toBe(0.9);
    expect(getEmailBookingChance(maximumCreativity, "ultra-rare")).toBe(0.95);
    expect(getEmailBookingChance(maximumCreativity, "legendary")).toBe(1);

    const specialized = {
      ...initial,
      school: { ...initial.school, specialization: "accoglienza" as const },
    };
    expect(getEmailBookingChance(specialized, "common")).toBeCloseTo(0.445);
  });

  it("recovers one ordinary failed trial once and requires a new email", () => {
    const initial = createInitialState(1_000, "", false);
    const contact = {
      ...initial.contacts[0],
      status: "trialScheduled" as const,
    };
    const state: GameState = {
      ...initial,
      school: { ...initial.school, fame: 1 },
      emails: [],
      contacts: [contact],
      upgrades: { ...initial.upgrades, "memorable-experience": 5 },
      equipment: { ...initial.equipment, availableSwords: 5 },
    };
    const seed = findFailedTrialWithSuccessfulRetry(state);
    const firstTrial: ScheduledTrial = {
      id: "retry-trial-1",
      contactId: contact.id,
      startsAt: 1_000,
      resolvesAt: 2_000,
      resultSeed: seed,
      status: "scheduled",
      equipmentUsed: 1,
    };
    const recovered = resolveTrial(
      { ...state, scheduledTrials: [firstTrial] },
      firstTrial,
      2_000,
      1,
    );

    expect(recovered.contacts[0]).toMatchObject({
      status: "available",
      trialRetryUsed: true,
    });
    expect(recovered.statistics.contactsLost).toBe(state.statistics.contactsLost);
    const rewritten = startNextCampaign(recovered, 3_000);
    expect(rewritten.contacts[0].status).toBe("writing");
    expect(rewritten.emails).toHaveLength(1);

    const secondTrial: ScheduledTrial = {
      ...firstTrial,
      id: "retry-trial-2",
      startsAt: 4_000,
      resolvesAt: 5_000,
    };
    const secondAttempt = resolveTrial({
      ...recovered,
      contacts: [{ ...recovered.contacts[0], status: "trialScheduled" }],
      scheduledTrials: [...recovered.scheduledTrials, secondTrial],
      equipment: { ...recovered.equipment, availableSwords: 5 },
    }, secondTrial, 5_000, 1);
    expect(secondAttempt.contacts[0].status).toBe("lost");
    expect(secondAttempt.statistics.contactsLost).toBe(
      recovered.statistics.contactsLost + 1,
    );
  });

  it("fills Banco da lavoro over time, clamps it with sword capacity and spends it first", () => {
    const initial = createInitialState(1_000, "", false);
    const equipmentCollaborator: Collaborator = {
      id: "workbench-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Banco",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: "equipment",
      rarity: "ultra-rare",
    };
    let state: GameState = {
      ...initial,
      collaborators: [equipmentCollaborator],
      upgrades: { ...createInitialUpgradeLevels(), "organized-rack": 5 },
      automation: { ...initial.automation, lastProcessedAt: 1_000 },
    };

    expect(state.automation.equipmentPreparedWork).toBe(0);
    for (let tick = 1; tick <= 200; tick += 1) {
      state = processAutomation(
        state,
        1_000 + tick * 1_000,
        1,
        automationDependencies,
      );
      state = processAutomaticEquipmentRepair(state);
    }
    expect(state.automation.equipmentPreparedWork).toBe(60);

    state = processAutomation({
      ...state,
      equipment: { ...state.equipment, totalSwords: 2, availableSwords: 2 },
    }, 202_000, 1, automationDependencies);
    expect(state.automation.equipmentPreparedWork).toBe(20);

    const damaged: GameState = {
      ...state,
      school: { ...state.school, euros: 15 },
      equipment: {
        ...state.equipment,
        totalSwords: 6,
        availableSwords: 6,
        wear: 10,
      },
      automation: {
        ...state.automation,
        equipmentPreparedWork: 60,
        equipmentBuffer: 0,
      },
    };
    const generated = processAutomation(
      damaged,
      203_000,
      1,
      automationDependencies,
    );
    const repaired = processAutomaticEquipmentRepair(generated);
    expect(repaired.equipment.wear).toBe(0);
    expect(repaired.school.euros).toBe(0);
    expect(repaired.automation.equipmentPreparedWork).toBeGreaterThan(49);
    expect(repaired.automation.equipmentPreparedWork).toBeLessThan(51);
  });
});
