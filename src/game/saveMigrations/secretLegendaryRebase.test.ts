import { expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrateSecretLegendaryRebaseState } from "./secretLegendaryRebase";

it("moves Secret Legendaries to the new base and keeps what they trained (v105)", () => {
  const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
  legacy.version = 104;
  legacy.contacts[0] = {
    ...legacy.contacts[0],
    secretLegendaryId: "lorenzo-ferrario",
    arenaBase: 1_530,
    styleBase: 1_500,
  };
  legacy.legendaryCollaborators.retainedProgress["andrea-pini"] = {
    forms: [],
    instructorForms: [],
    joinedAt: 1_000,
    arenaBase: 50,
    styleBase: 60,
  };
  const ordinary = legacy.contacts[1];

  const migrated = migrateSecretLegendaryRebaseState(legacy);

  expect(migrated.version).toBe(105);
  expect(migrated.contacts?.[0]).toMatchObject({ arenaBase: 190, styleBase: 160 });
  expect(migrated.contacts?.[1]).toEqual(ordinary);
  // Pini was not in the old catalogue: plain new base.
  expect(migrated.legendaryCollaborators?.retainedProgress["andrea-pini"])
    .toMatchObject({ arenaBase: 143, styleBase: 129 });
});
