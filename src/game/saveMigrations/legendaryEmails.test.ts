import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import type { Contact, GameState } from "../types";
import { migrateLegendaryEmailState } from "./legendaryEmails";

describe("Legendary email save migration", () => {
  it("updates ordinary and Secret Legendaries without changing other contacts", () => {
    const current = createInitialState(1_000);
    const ordinary = current.contacts[0];
    const standardLegendary: Contact = {
      ...current.contacts[1],
      id: "eva-parodi",
      firstName: "Eva",
      lastName: "Parodi",
      email: "eva.parodi@cmail.com",
      rarity: "legendary",
      specialProfileId: "eva-parodi",
    };
    const secretLegendary: Contact = {
      ...current.contacts[2],
      id: "francesco-d-addosio",
      firstName: "Francesco",
      lastName: "D'Addosio",
      email: "francesco-d-addosio@chronicles.ludosport",
      rarity: "legendary",
      specialProfileId: "francesco-d-addosio",
      secretLegendaryId: "francesco-d-addosio",
    };
    const legacy = {
      ...current,
      version: 76,
      contacts: [ordinary, standardLegendary, secretLegendary],
    };

    const migrated = migrateLegendaryEmailState(legacy) as GameState;

    expect(migrated.version).toBe(77);
    expect(migrated.contacts.map((contact) => contact.email)).toEqual([
      ordinary.email,
      "eva.parodi@ludosport.net",
      "francesco.daddosio@ludosport.net",
    ]);
  });

  it("is idempotent after version 77", () => {
    const current = createInitialState(1_000);

    expect(migrateLegendaryEmailState(current)).toBe(current);
  });
});
