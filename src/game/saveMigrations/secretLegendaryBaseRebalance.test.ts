import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrateSecretLegendaryBaseRebalanceState } from "./secretLegendaryBaseRebalance";

const REBALANCES = [
  { id: "marco-palena", previous: [75, 90], next: [140 / (1.4 * 1.15), 155 / (1.4 * 1.15)] },
  { id: "lorenzo-todaro", previous: [80, 80], next: [151 / (1.5 * 1.15), 151 / (1.5 * 1.15)] },
  { id: "daniele-panizza", previous: [81, 62], next: [155 / (1.4 * 1.15), 140 / (1.4 * 1.15)] },
  { id: "sara-magnifico", previous: [58, 87], next: [130 / (1.5 * 1.15), 165 / (1.5 * 1.15)] },
  { id: "daniele-maggi", previous: [150, 150], next: [140, 140] },
  { id: "pietro-scarica", previous: [92, 94], next: [220 / (1.5 * 1.3), 230 / (1.5 * 1.3)] },
  { id: "piero-dipalo", previous: [169, 169], next: [200, 210] },
  { id: "simone-pedrazzi", previous: [122, 145], next: [200, 225] },
] as const;

describe("Secret Legendary base rebalance save migration", () => {
  it("updates all tournament profiles while preserving earned base gains", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 69;
    legacy.contacts = REBALANCES.map(({ id, previous }, index) => ({
      ...legacy.contacts[index % legacy.contacts.length],
      id: `secret-${index}`,
      specialProfileId: id,
      secretLegendaryId: id,
      arenaBase: previous[0] + index + 1,
      styleBase: previous[1] + index + 2,
    }));
    legacy.legendaryCollaborators.retainedProgress["simone-pedrazzi"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 126,
      styleBase: 151,
    };
    legacy.legendaryCollaborators.retainedProgress["francesco-d-addosio"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 1_203,
      styleBase: 1_204,
    };

    const migrated = migrateSecretLegendaryBaseRebalanceState(legacy);

    expect(migrated.version).toBe(70);
    REBALANCES.forEach(({ next }, index) => {
      expect(migrated.contacts?.[index].arenaBase).toBeCloseTo(next[0] + index + 1);
      expect(migrated.contacts?.[index].styleBase).toBeCloseTo(next[1] + index + 2);
    });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["simone-pedrazzi"],
    ).toMatchObject({ arenaBase: 204, styleBase: 231 });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["francesco-d-addosio"],
    ).toMatchObject({ arenaBase: 1_203, styleBase: 1_204 });
  });

  it("does not run twice", () => {
    const current = { ...createInitialState(1_000), version: 70 };

    expect(migrateSecretLegendaryBaseRebalanceState(current)).toBe(current);
  });
});
