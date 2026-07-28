import { describe, expect, it } from "vitest";
import type { GameState, UpgradeId } from "../game/types";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  createInitialUpgradeLevels,
  getAgonistCourseMaximumStatGain,
  getAnnualFormTrainingLimit,
  getCreativityProgress,
  getEquipmentPreparedWorkMaximum,
  getEquipmentSwordRepairWork,
  getFirstIncompleteUpgradePrerequisite,
  getPagoSportAllCourseSpeedBonus,
  getPagoSportTechnicianSpeedBonus,
  getQualifyingCourseCostMultiplier,
  getSISTechnicianCourseSpeedBonus,
  getTrialDurationMs,
  getUpgradeCost,
  getUpgradeEffectTotal,
} from "./upgrades";

function levelsWith(values: Partial<Record<UpgradeId, number>>) {
  return { ...createInitialUpgradeLevels(), ...values };
}

function definitionsFor(category: (typeof UPGRADE_CATEGORIES)[number]["id"]) {
  return UPGRADE_DEFINITIONS.filter(
    (definition) =>
      definition.category === category &&
      !definition.hidden &&
      !definition.extension,
  );
}

function costsFor(category: (typeof UPGRADE_CATEGORIES)[number]["id"]) {
  return Object.fromEntries(definitionsFor(category).map((definition) => [
    definition.id,
    Array.from(
      { length: definition.maxLevel },
      (_, level) => getUpgradeCost(definition, level),
    ),
  ]));
}

describe("upgrade catalog", () => {
  it("contains eight public branches of seven upgrades plus the secret row", () => {
    expect(UPGRADE_CATEGORIES.map((category) => category.id)).toEqual([
      "speed",
      "writing",
      "charisma",
      "welcome",
      "equipment",
      "gadget",
      "instructors",
      "organization",
      "secrets",
    ]);
    for (const category of UPGRADE_CATEGORIES) {
      if (category.id === "secrets") continue;
      expect(definitionsFor(category.id), category.id).toHaveLength(7);
    }
    expect(definitionsFor("secrets").map((definition) => definition.id)).toEqual([
      "project-x",
      "divine-touch",
    ]);
  });

  it("uses the approved costs for Scrittura, Creatività, Carisma and Accoglienza", () => {
    expect(costsFor("speed")).toEqual({
      "comfortable-keyboard": [50, 100, 200, 400, 800],
      "quick-phrases": [150, 300, 600, 1_200, 2_400],
      "automatic-signature": [300, 600, 1_200, 2_400, 4_800],
      "smart-fields": [600, 1_200, 2_400, 4_800, 9_600],
      "social-content-synthesis": [2_500, 5_000, 10_000, 20_000, 40_000],
      "instant-review": [2_500, 5_000, 10_000, 20_000, 40_000],
      "mail-merge": [25_000, 50_000, 100_000, 200_000, 400_000],
    });
    expect(costsFor("writing")).toEqual({
      "spell-check": [50, 100, 200, 400, 800],
      "professional-email": [100, 200, 400, 800, 1_600],
      "personalized-invite": [150, 300, 600, 1_200, 2_400],
      "call-to-action": [300, 600, 1_200, 2_400, 4_800],
      "email-layout": [600, 1_200, 2_400, 4_800, 9_600],
      "winning-advertising": [5_000, 10_000, 20_000, 40_000, 80_000],
      "marketing-course": [10_000, 25_000, 50_000, 100_000, 200_000],
    });
    expect(costsFor("charisma")).toEqual({
      "prepared-presentation": [50, 100, 200, 400, 800],
      "qr-cards": [100, 200, 400, 800, 1_600],
      "coordinated-demo": [150, 300, 600, 1_200, 2_400],
      "recognizable-stand": [300, 600, 1_200, 2_400, 4_800],
      "demo-set": [600, 1_200, 2_400, 4_800, 9_600],
      "difficult-questions": [5_000, 10_000, 20_000, 40_000, 80_000],
      "not-that-thing": [10_000, 25_000, 50_000, 100_000, 200_000],
    });
    expect(costsFor("welcome")).toEqual({
      "welcome-procedure": [50, 100, 200, 400, 800],
      "clear-material": [150, 300, 600, 1_200, 2_400],
      "tested-intro": [300, 600, 1_200, 2_400, 4_800],
      "prepared-room": [600, 1_200, 2_400, 4_800, 9_600],
      "dedicated-helper": [2_500, 5_000, 10_000, 20_000, 40_000],
      "order-welcome": [5_000, 10_000, 20_000, 40_000, 80_000],
      "memorable-experience": [10_000, 25_000, 50_000, 100_000, 200_000],
    });
  });

  it("uses the approved costs for Attrezzatura and Organizzazione", () => {
    expect(costsFor("equipment")).toEqual({
      "pre-event-check": [100, 200, 400, 800, 1_600],
      "maintenance-kit": [250, 500, 1_000, 2_000, 4_000],
      "organized-rack": [500, 750, 1_000, 1_500, 2_500],
      "essential-parts": [1_000, 2_000, 4_000, 8_000, 16_000],
      checklist: [2_500, 5_000, 10_000, 20_000, 40_000],
      "equipment-register": [5_000, 10_000, 20_000, 40_000, 80_000],
      "all-fixed": [10_000, 25_000, 50_000, 100_000, 200_000],
    });
    expect(costsFor("organization")).toEqual({
      "shared-calendar": [500, 1_000, 2_000, 4_000, 8_000],
      "collaborator-shifts": [2_500, 5_000, 10_000, 20_000, 40_000],
      "standard-procedures": [5_000, 10_000, 20_000, 40_000, 80_000],
      "registration-form": [5_000, 10_000, 20_000, 40_000, 80_000],
      "operational-priorities": [25_000],
      "order-secretariat": [10_000, 25_000, 50_000, 100_000, 200_000],
      "multi-site-coordination": [25_000, 50_000, 100_000, 200_000, 400_000],
    });
  });

  it("keeps Gadget prices unchanged and removes network surcharges from Gadget and Teaching", () => {
    expect(costsFor("gadget")).toEqual({
      "gadget-showcase": [2_500, 5_000, 10_000, 25_000, 50_000],
      "gadget-online-store": [
        5_000, 10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 800_000,
        1_600_000,
      ],
      "gadget-design-tools": [5_000, 10_000, 20_000, 40_000, 80_000],
      "gadget-revision-lab": [5_000, 10_000, 20_000, 40_000, 80_000],
      "gadget-order-management": [10_000, 20_000, 40_000, 80_000, 160_000],
      "gadget-sales-training": [15_000, 30_000, 60_000, 120_000, 240_000],
      "gadget-cross-selling": [25_000, 50_000, 100_000, 200_000, 400_000],
    });
    expect(costsFor("instructors")).toEqual({
      "technical-arena": [1_000, 2_000, 5_000, 7_500],
      "instructor-versatility": [2_000, 4_000],
      "sis-accreditation": [5_000, 10_000, 20_000, 40_000],
      "cost-of-service": [2_500, 5_000, 10_000, 25_000, 50_000],
      "promiscuous-instructor": [10_000, 25_000, 50_000, 100_000, 200_000, 400_000],
      "athletic-preparation": [25_000, 50_000, 100_000, 200_000, 400_000],
      pagosport: [100_000, 200_000, 400_000],
    });
    const gadget = definitionsFor("gadget")[0];
    const teaching = definitionsFor("instructors")[0];
    const writing = definitionsFor("speed")[0];
    expect(getUpgradeCost(gadget, 0, 2)).toBe(getUpgradeCost(gadget, 0));
    expect(getUpgradeCost(teaching, 0, 2)).toBe(getUpgradeCost(teaching, 0));
    expect(getUpgradeCost(writing, 0, 2)).toBe(65);
  });
});

describe("branch effects", () => {
  it("applies the approved Scrittura totals", () => {
    const maximum = levelsWith({
      "comfortable-keyboard": 5,
      "quick-phrases": 5,
      "automatic-signature": 5,
      "smart-fields": 5,
      "social-content-synthesis": 5,
      "instant-review": 5,
      "mail-merge": 5,
    });
    expect(getUpgradeEffectTotal(maximum, "writingPower")).toBe(3);
    expect(getUpgradeEffectTotal(maximum, "editorialAutomationMultiplier")).toBe(1.25);
    expect(getUpgradeEffectTotal(maximum, "emailInitialProgress")).toBe(0.25);
    expect(getUpgradeEffectTotal(maximum, "socialCopyShare")).toBe(0.25);
  });

  it("reaches 35 Creativity points and the approved Event totals", () => {
    const maximum = Object.fromEntries(
      UPGRADE_DEFINITIONS.map((definition) => [definition.id, definition.maxLevel]),
    ) as ReturnType<typeof createInitialUpgradeLevels>;
    expect(getCreativityProgress(maximum)).toBe(1);
    expect(getUpgradeEffectTotal(maximum, "eventContactsMultiplier")).toBeCloseTo(1.1);
    expect(getUpgradeEffectTotal(maximum, "eventAttendanceMultiplier")).toBeCloseTo(0.9);
    expect(getUpgradeEffectTotal(maximum, "enrollmentProgress")).toBeCloseTo(1);
    expect(getUpgradeEffectTotal(maximum, "failedTrialRetryChance")).toBe(0.25);
    expect(getTrialDurationMs(maximum, 30_000)).toBe(25_000);
  });

  it("scales Banco da lavoro from 2% to 10% of all sword capacity", () => {
    const equipment = {
      totalSwords: 6,
      availableSwords: 6,
      damagedSwords: 0,
      wear: 0,
    };
    const maximums = [1, 2, 3, 4, 5].map((level) =>
      getEquipmentPreparedWorkMaximum({
        equipment,
        upgrades: levelsWith({ "organized-rack": level }),
      } as Pick<GameState, "equipment" | "upgrades">)
    );
    expect(maximums).toEqual([12, 24, 36, 48, 60]);
    expect(getEquipmentPreparedWorkMaximum({
      equipment: { ...equipment, totalSwords: 10 },
      upgrades: levelsWith({ "organized-rack": 5 }),
    } as Pick<GameState, "equipment" | "upgrades">)).toBe(100);
  });

  it("caps equipment wear reduction, repair speed and sword work at the approved values", () => {
    const maximum = levelsWith({
      "pre-event-check": 5,
      checklist: 5,
      "all-fixed": 5,
      "maintenance-kit": 5,
      "equipment-register": 5,
      "essential-parts": 5,
    });
    expect(getUpgradeEffectTotal(maximum, "equipmentWearReduction")).toBeCloseTo(0.5);
    expect(getUpgradeEffectTotal(maximum, "equipmentAutomationMultiplier")).toBe(1);
    expect(getEquipmentSwordRepairWork(maximum)).toBe(75);
  });
});

describe("Teaching branch", () => {
  it("uses the agreed seven-step order and keeps Intensità agonistica as an extension", () => {
    expect(definitionsFor("instructors").map((definition) => definition.id)).toEqual([
      "technical-arena",
      "instructor-versatility",
      "sis-accreditation",
      "cost-of-service",
      "promiscuous-instructor",
      "athletic-preparation",
      "pagosport",
    ]);
    const intensity = UPGRADE_DEFINITIONS.find(
      (definition) => definition.id === "agonist-course-intensity",
    )!;
    expect(intensity.extension).toBe(true);
    expect(intensity.requiredUpgradeLevels).toEqual({ pagosport: 3 });
    expect(Array.from({ length: intensity.maxLevel }, (_, level) =>
      getUpgradeCost(intensity, level)
    )).toEqual([100_000, 200_000, 400_000, 800_000]);
  });

  it("applies SIS speed, course discounts, group teaching and PagoSport cumulatively", () => {
    const levels = levelsWith({
      "sis-accreditation": 4,
      "cost-of-service": 5,
      "promiscuous-instructor": 6,
      pagosport: 3,
    });
    expect(getSISTechnicianCourseSpeedBonus(levels)).toBeCloseTo(0.3);
    expect(getQualifyingCourseCostMultiplier(levels)).toBe(0.75);
    expect(getAnnualFormTrainingLimit(levels)).toBe(3);
    expect(getPagoSportTechnicianSpeedBonus(levels)).toBe(0.5);
    expect(getPagoSportAllCourseSpeedBonus(levels)).toBe(0.5);
  });

  it("raises Corso Agonisti from +1/+1 to at most +5/+5", () => {
    expect(getAgonistCourseMaximumStatGain(createInitialUpgradeLevels())).toBe(1);
    expect(getAgonistCourseMaximumStatGain(
      levelsWith({ "agonist-course-intensity": 4 }),
    )).toBe(5);
  });
});

describe("prerequisites and secret paths", () => {
  it("keeps the approved partial Scrittura gates", () => {
    const quick = UPGRADE_DEFINITIONS.find((definition) => definition.id === "quick-phrases")!;
    const merge = UPGRADE_DEFINITIONS.find((definition) => definition.id === "mail-merge")!;
    expect(getFirstIncompleteUpgradePrerequisite(
      levelsWith({ "comfortable-keyboard": 1 }),
      quick,
    )?.id).toBe("comfortable-keyboard");
    expect(getFirstIncompleteUpgradePrerequisite(
      levelsWith({
        "comfortable-keyboard": 2,
        "social-content-synthesis": 3,
        "instant-review": 2,
      }),
      merge,
    )?.id).toBe("instant-review");
  });

  it("stores Corso X and ToccoDiGilo only in the secret row with their hints", () => {
    const secrets = definitionsFor("secrets");
    expect(secrets.map((definition) => definition.title)).toEqual(["Corso X", "ToccoDiGilo"]);
    expect(secrets.map((definition) => definition.secretHint)).toEqual([
      "Vincere il torneo più superbo dell'anno è solo l'inizio",
      "Esistono forze più grandi di quanto avresti mai potuto immaginare",
    ]);
  });
});
