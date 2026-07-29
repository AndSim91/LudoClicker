import { describe, expect, it } from "vitest";
import { getBaseExpectedEventContacts } from "../game/eventRewards";
import { ACQUISITION_EVENTS, getUnlockedAcquisitionEvents } from "./events";

describe("acquisition event progression", () => {
  it("starts with only free flyering and sea kata", () => {
    expect(getUnlockedAcquisitionEvents(0).map((event) => event.id)).toEqual([
      "park-sparring",
      "kata-sea-waves",
    ]);
  });

  it("uses the agreed early progression and costs", () => {
    expect(ACQUISITION_EVENTS.slice(0, 4).map((event) => [
      event.id,
      event.unlockMembers,
      event.cost,
    ])).toEqual([
      ["park-sparring", 0, 0],
      ["kata-sea-waves", 0, 100],
      ["organized-flyering", 5, 500],
      ["public-demo", 5, 1_000],
    ]);
  });

  it("distributes events across all five potential tiers", () => {
    const tiers = ACQUISITION_EVENTS.reduce<Record<string, number>>((totals, event) => ({
      ...totals,
      [event.potential]: (totals[event.potential] ?? 0) + 1,
    }), {});

    expect(tiers).toEqual({
      "Molto bassa": 3,
      Bassa: 3,
      Media: 2,
      Alta: 3,
      Altissima: 4,
    });
  });

  it("keeps the highest potential events rare and late", () => {
    expect(
      ACQUISITION_EVENTS
        .filter((event) => event.potential === "Altissima")
        .map((event) => event.unlockMembers),
    ).toEqual([180, 250, 350, 500]);
  });

  it("keeps only flyering free", () => {
    expect(ACQUISITION_EVENTS.filter((event) => event.cost === 0).map((event) => event.id))
      .toEqual(["park-sparring"]);
  });

  it("uses the agreed member, sword, and wear requirements", () => {
    expect(ACQUISITION_EVENTS.map((event) => event.requiredMembers)).toEqual([
      0, 1, 2, 2, 4, 4, 6, 8, 10, 15, 20, 25, 40, 50, 1_000,
    ]);
    expect(ACQUISITION_EVENTS.map((event) => event.requiredSwords)).toEqual([
      0, 1, 2, 4, 4, 6, 8, 10, 12, 20, 20, 30, 50, 100, 1_000,
    ]);
    expect(ACQUISITION_EVENTS.map((event) => event.wearAdded)).toEqual([
      0, 10, 20, 30, 40, 50, 75, 100, 150, 200, 250, 500, 750, 1_000, 10_000,
    ]);
  });

  it("uses the agreed weighted contact distributions", () => {
    expect(ACQUISITION_EVENTS.map((event) =>
      event.contactOutcomes.reduce((total, outcome) => total + outcome.weight, 0)
    )).toEqual(Array.from({ length: ACQUISITION_EVENTS.length }, () => 100));
    expect(ACQUISITION_EVENTS.map(getBaseExpectedEventContacts)).toEqual([
      0.33,
      0.5,
      1,
      1.5,
      1.5,
      2,
      2.5,
      3,
      5,
      7.5,
      10,
      13,
      15,
      20,
      50,
    ]);
    expect(ACQUISITION_EVENTS.map((event) => [
      Math.min(...event.contactOutcomes.map((outcome) => outcome.min)),
      Math.max(...event.contactOutcomes.map((outcome) => outcome.max)),
    ])).toEqual([
      [0, 1],
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [3, 7],
      [5, 10],
      [7, 13],
      [9, 17],
      [10, 20],
      [15, 25],
      [40, 60],
    ]);
  });

  it("standardizes normal events to ten seconds and configures every cooldown", () => {
    expect(ACQUISITION_EVENTS.every((event) => event.durationMs === 10_000)).toBe(true);
    expect(ACQUISITION_EVENTS.map((event) => event.cooldown)).toEqual([
      { kind: "realtime", durationMs: 5_000 },
      { kind: "realtime", durationMs: 10_000 },
      { kind: "realtime", durationMs: 15_000 },
      { kind: "realtime", durationMs: 30_000 },
      { kind: "calendar", months: 1 },
      { kind: "calendar", months: 1 },
      { kind: "calendar", months: 3 },
      { kind: "calendar", months: 4 },
      { kind: "calendar", months: 6 },
      { kind: "calendar", months: 12 },
      { kind: "calendar", months: 18 },
      { kind: "calendar", months: 24 },
      { kind: "calendar", months: 30 },
      { kind: "calendar", months: 36 },
      { kind: "calendar", months: 120 },
    ]);
  });
});
