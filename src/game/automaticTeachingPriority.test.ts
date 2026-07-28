import { describe, expect, it } from "vitest";
import { SECRET_LEGENDARY_IDS } from "../content/secretLegendaries";
import {
  compareAutomaticTeachingStudentPriority,
  getAutomaticTeachingRarityPriority,
  type AutomaticTeachingStudentPriority,
} from "./automaticTeachingPriority";

const BASE_PRIORITY: AutomaticTeachingStudentPriority = {
  isFavorite: false,
  departureRisk: 0,
  rarityPriority: 0,
  formPriority: 0,
  isCollaborator: false,
  acquiredAt: 1_000,
  originalOrder: 0,
};

describe("automatic teaching student priority", () => {
  it("ranks every rarity from Secret Legendary to Common", () => {
    const secretLegendaryId = SECRET_LEGENDARY_IDS[0];
    expect([
      getAutomaticTeachingRarityPriority({ rarity: "common" }),
      getAutomaticTeachingRarityPriority({ rarity: "rare" }),
      getAutomaticTeachingRarityPriority({ rarity: "ultra-rare" }),
      getAutomaticTeachingRarityPriority({ rarity: "legendary" }),
      getAutomaticTeachingRarityPriority({
        rarity: "legendary",
        specialProfileId: secretLegendaryId,
        secretLegendaryId,
      }),
    ]).toEqual([0, 1, 2, 3, 4]);
  });

  it.each<{
    name: string;
    preferred: AutomaticTeachingStudentPriority;
    other: AutomaticTeachingStudentPriority;
  }>([
    {
      name: "favorite before every later criterion",
      preferred: {
        ...BASE_PRIORITY,
        isFavorite: true,
        formPriority: 10,
        acquiredAt: 2_000,
        originalOrder: 1,
      },
      other: {
        ...BASE_PRIORITY,
        departureRisk: 1,
        rarityPriority: 4,
        isCollaborator: true,
      },
    },
    {
      name: "departure risk before rarity",
      preferred: { ...BASE_PRIORITY, departureRisk: 0.2 },
      other: { ...BASE_PRIORITY, departureRisk: 0.1, rarityPriority: 4 },
    },
    {
      name: "rarity before training progression",
      preferred: { ...BASE_PRIORITY, rarityPriority: 4, formPriority: 10 },
      other: { ...BASE_PRIORITY, rarityPriority: 3, formPriority: 0 },
    },
    {
      name: "less advanced training before collaborator status",
      preferred: { ...BASE_PRIORITY, formPriority: 0 },
      other: { ...BASE_PRIORITY, formPriority: 1, isCollaborator: true },
    },
    {
      name: "collaborator before enrollment age",
      preferred: { ...BASE_PRIORITY, isCollaborator: true, acquiredAt: 2_000 },
      other: { ...BASE_PRIORITY, acquiredAt: 1_000 },
    },
    {
      name: "older enrollment before original order",
      preferred: { ...BASE_PRIORITY, acquiredAt: 1_000, originalOrder: 1 },
      other: { ...BASE_PRIORITY, acquiredAt: 2_000, originalOrder: 0 },
    },
    {
      name: "original order as final tie breaker",
      preferred: { ...BASE_PRIORITY, originalOrder: 0 },
      other: { ...BASE_PRIORITY, originalOrder: 1 },
    },
  ])("uses $name", ({ preferred, other }) => {
    expect(compareAutomaticTeachingStudentPriority(preferred, other)).toBeLessThan(0);
    expect(compareAutomaticTeachingStudentPriority(other, preferred)).toBeGreaterThan(0);
  });
});
