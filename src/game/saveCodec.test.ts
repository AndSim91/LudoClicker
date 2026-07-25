import { describe, expect, it } from "vitest";
import {
  decodeStoredSave,
  encodeStoredSave,
  STORED_SAVE_PREFIX,
} from "./saveCodec";

describe("stored save codec", () => {
  it("keeps reading the legacy plain JSON format", () => {
    const legacy = { version: 1, profile: { displayName: "Legacy" } };

    expect(decodeStoredSave(JSON.stringify(legacy))).toEqual(legacy);
  });

  it("round-trips a payload larger than the typical localStorage quota", () => {
    const payload = {
      contacts: Array.from({ length: 10_000 }, (_, index) => ({
        id: "contact-" + index,
        firstName: "Iscritto",
        lastName: "Grande roster " + index,
        email: "iscritto-" + index + "@example.invalid",
        source: "event",
        acquiredAt: 1_800_000_000_000 + index,
        status: "enrolled",
        rarity: "common",
        forms: ["form-1", "form-2", "form-3-long"],
        arenaBase: 10,
        styleBase: 10,
        tournamentExperience: 100,
      })),
    };
    const plain = JSON.stringify(payload);
    const encoded = encodeStoredSave(payload);
    const decoded = decodeStoredSave(encoded) as typeof payload;

    expect(plain.length * 2).toBeGreaterThan(5 * 1_024 * 1_024);
    expect(encoded.startsWith(STORED_SAVE_PREFIX)).toBe(true);
    expect(encoded.length).toBeLessThan(plain.length / 4);
    expect(decoded.contacts).toHaveLength(payload.contacts.length);
    expect(decoded.contacts[0]).toEqual(payload.contacts[0]);
    expect(decoded.contacts.at(-1)).toEqual(payload.contacts.at(-1));
  });
});
