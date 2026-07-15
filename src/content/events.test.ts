import { describe, expect, it } from "vitest";
import { ACQUISITION_EVENTS, getUnlockedAcquisitionEvents } from "./events";

describe("acquisition event progression", () => {
  it("starts with only sparring and flyering", () => {
    expect(getUnlockedAcquisitionEvents(0).map((event) => event.id)).toEqual([
      "park-sparring",
      "organized-flyering",
    ]);
  });

  it("distributes events across all five potential tiers", () => {
    const tiers = ACQUISITION_EVENTS.reduce<Record<string, number>>((totals, event) => ({
      ...totals,
      [event.potential]: (totals[event.potential] ?? 0) + 1,
    }), {});

    expect(tiers).toEqual({
      "Molto bassa": 2,
      Bassa: 2,
      Media: 2,
      Alta: 3,
      Altissima: 3,
    });
  });

  it("keeps the highest potential events rare and late", () => {
    expect(
      ACQUISITION_EVENTS
        .filter((event) => event.potential === "Altissima")
        .map((event) => event.unlockMembers),
    ).toEqual([180, 250, 350]);
  });

  it("keeps only sparring free", () => {
    expect(ACQUISITION_EVENTS.filter((event) => event.cost === 0).map((event) => event.id))
      .toEqual(["park-sparring"]);
  });

  it("scales sword requirements up to national events", () => {
    const requirements = ACQUISITION_EVENTS.map((event) => event.requiredSwords);

    expect(requirements).toEqual([2, 2, 4, 6, 8, 10, 12, 16, 20, 24, 30, 36]);
    expect(requirements.at(-1)).toBeGreaterThan(16);
  });
});
