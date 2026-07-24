import { describe, expect, it } from "vitest";
import {
  COLLABORATOR_MASTERY_LEVELS,
  COLLABORATOR_MASTERY_XP_PER_SECOND,
  getCollaboratorMasteryDefinition,
  getCollaboratorMasteryMultiplier,
  getCollaboratorMasteryProgress,
} from "./mastery";

describe("collaborator mastery", () => {
  it("exposes the five Italian grades with personal bonuses up to 100%", () => {
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.name)).toEqual([
      "Novizio",
      "Iniziato",
      "Accademico",
      "Cavaliere",
      "Maestro",
    ]);
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.minimumXp)).toEqual([
      0,
      60,
      360,
      2_160,
      5_760,
    ]);
    expect(COLLABORATOR_MASTERY_LEVELS.map((level) => level.multiplier)).toEqual([
      0,
      0.2,
      0.4,
      0.65,
      1,
    ]);
    expect(COLLABORATOR_MASTERY_XP_PER_SECOND).toBe(1);
  });

  it("clamps the maximum grade and reports progress to the next grade", () => {
    expect(getCollaboratorMasteryDefinition(0).name).toBe("Novizio");
    expect(getCollaboratorMasteryDefinition(360).name).toBe("Accademico");
    expect(getCollaboratorMasteryDefinition(5_760).name).toBe("Maestro");
    expect(getCollaboratorMasteryDefinition(50_000).name).toBe("Maestro");
    expect(getCollaboratorMasteryMultiplier(5_760)).toBeCloseTo(2);
    expect(getCollaboratorMasteryProgress(210)).toMatchObject({
      currentXp: 210,
      nextXp: 360,
      progress: 50,
      definition: { name: "Iniziato" },
    });
    expect(getCollaboratorMasteryProgress(5_760).progress).toBe(100);
  });
});
