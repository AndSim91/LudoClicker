import { describe, expect, it } from "vitest";
import { getBaseExpectedEventContacts } from "../game/eventRewards";
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

  it("uses the agreed weighted contact distributions", () => {
    expect(ACQUISITION_EVENTS.map((event) =>
      event.contactOutcomes.reduce((total, outcome) => total + outcome.weight, 0)
    )).toEqual(Array.from({ length: ACQUISITION_EVENTS.length }, () => 100));
    expect(ACQUISITION_EVENTS.map(getBaseExpectedEventContacts)).toEqual([
      0.6,
      0.73,
      1.35,
      1.56,
      2.41,
      3,
      4,
      6,
      8,
      12,
      16,
      25,
    ]);
    expect(ACQUISITION_EVENTS.map((event) => [
      Math.min(...event.contactOutcomes.map((outcome) => outcome.min)),
      Math.max(...event.contactOutcomes.map((outcome) => outcome.max)),
    ])).toEqual([
      [0, 2],
      [0, 2],
      [0, 3],
      [1, 3],
      [1, 5],
      [1, 5],
      [2, 10],
      [3, 15],
      [4, 20],
      [5, 25],
      [10, 30],
      [10, 40],
    ]);
  });

  it("standardizes normal events to ten seconds and configures every cooldown", () => {
    expect(ACQUISITION_EVENTS.every((event) => event.durationMs === 10_000)).toBe(true);
    expect(ACQUISITION_EVENTS.map((event) => event.cooldown)).toEqual([
      { kind: "realtime", durationMs: 5_000 },
      { kind: "realtime", durationMs: 10_000 },
      { kind: "realtime", durationMs: 30_000 },
      { kind: "calendar", months: 1 },
      { kind: "calendar", months: 3 },
      { kind: "calendar", months: 3 },
      { kind: "calendar", months: 6 },
      { kind: "calendar", months: 6 },
      { kind: "calendar", months: 12 },
      { kind: "calendar", months: 12 },
      { kind: "calendar", months: 24 },
      { kind: "calendar", months: 24 },
    ]);
  });
});
