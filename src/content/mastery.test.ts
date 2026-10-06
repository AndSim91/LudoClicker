import { describe, expect, it } from "vitest";
import {
  COLLABORATOR_MASTERY_LEVELS,
  COLLABORATOR_MASTERY_XP_PER_SECOND,
  getCollaboratorMasteryDefinition,
  getCollaboratorMasteryMultiplier,
  getCollaboratorMasteryProgress,
} from "./mastery";

describe("collaborator mastery", () => {
  it("exposes the six Italian grades with personal bonuses up to 500%", () => {
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.name)).toEqual([
      "Novizio",
      "Iniziato",
      "Accademico",
      "Cavaliere",
      "Maestro",
      "Leggenda",
    ]);
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.minimumXp)).toEqual([
      0,
      300,
      600,
      1_800,
      3_600,
      7_200,
    ]);
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.multiplier)).toEqual([
      0,
      0.25,
      0.5,
      1,
      2,
      5,
    ]);
    // Eventi: duration, cost and wear of the automatic events (06/10).
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.eventMultiplier)).toEqual([
      1,
      0.9,
      0.75,
      0.6,
      0.4,
      0.25,
    ]);
    expect(COLLABORATOR_MASTERY_XP_PER_SECOND).toBe(1);
  });

  it("clamps the maximum grade and reports progress to the next grade", () => {
    expect(getCollaboratorMasteryDefinition(0).name).toBe("Novizio");
    expect(getCollaboratorMasteryDefinition(600).name).toBe("Accademico");
    expect(getCollaboratorMasteryDefinition(3_600).name).toBe("Maestro");
    expect(getCollaboratorMasteryDefinition(7_200).name).toBe("Leggenda");
    expect(getCollaboratorMasteryDefinition(50_000).name).toBe("Leggenda");
    expect(getCollaboratorMasteryMultiplier(3_600)).toBeCloseTo(3);
    expect(getCollaboratorMasteryProgress(450)).toMatchObject({
      currentXp: 450,
      nextXp: 600,
      progress: 50,
      definition: { name: "Iniziato" },
    });
    expect(getCollaboratorMasteryProgress(7_200).progress).toBe(100);
  });
});
