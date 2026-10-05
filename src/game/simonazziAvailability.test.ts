import { describe, expect, it } from "vitest";
import { createInitialContacts } from "./contacts";
import { getReservedLegendaryProfileIds } from "./legendaryAvailability";
import { createInitialState } from "./initialState";

describe("Andrea Simonazzi dopo la prima scuola", () => {
  const state = createInitialState(1_000);
  const reserved = (schoolCount: number, nationalTitlesCurrentSchool: number) =>
    getReservedLegendaryProfileIds({
      ...state,
      network: { ...state.network, schoolCount },
      tournaments: { ...state.tournaments, nationalTitlesCurrentSchool },
    }, 1_000).has("andrea-simonazzi");

  it("si trova solo dopo aver vinto il Nazionale della scuola", () => {
    expect(reserved(0, 0)).toBe(false);
    expect(reserved(1, 0)).toBe(true);
    expect(reserved(1, 1)).toBe(false);
  });

  it("non è tra i primi contatti di una nuova scuola", () => {
    for (let seed = 1; seed < 200; seed += 1) {
      const { contacts } = createInitialContacts(1_000, false, seed, state.legendaryCollaborators);
      expect(contacts.some((contact) => contact.specialProfileId === "andrea-simonazzi")).toBe(false);
    }
  });
});
