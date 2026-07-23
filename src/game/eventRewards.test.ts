import { describe, expect, it } from "vitest";
import { getAcquisitionEventDefinition } from "../content/events";
import { createInitialState } from "./engine";
import {
  getExpectedEventContacts,
  rollEventContactReward,
} from "./eventRewards";

describe("event contact rewards", () => {
  const sparring = getAcquisitionEventDefinition("park-sparring")!;

  it("applies declared contact and attendance percentages once", () => {
    const initial = createInitialState(1_000);
    const contactsImproved = {
      ...initial,
      upgrades: { ...initial.upgrades, "prepared-presentation": 1 },
    };
    const attendanceImproved = {
      ...initial,
      upgrades: { ...initial.upgrades, "coordinated-demo": 1 },
    };

    expect(getExpectedEventContacts(initial, sparring)).toBeCloseTo(0.6);
    expect(getExpectedEventContacts(contactsImproved, sparring)).toBeCloseTo(0.66);
    expect(getExpectedEventContacts(attendanceImproved, sparring)).toBeCloseTo(0.72);
  });

  it("does not penalize contact rewards for worn equipment", () => {
    const initial = createInitialState(1_000);
    const worn = { ...initial, equipment: { ...initial.equipment, wear: 99 } };

    expect(getExpectedEventContacts(worn, sparring)).toBe(
      getExpectedEventContacts(initial, sparring),
    );
  });

  it("can add an independent bonus contact to a zero base result", () => {
    const initial = createInitialState(1_000);
    const improved = {
      ...initial,
      upgrades: { ...initial.upgrades, "prepared-presentation": 5 },
    };
    const rescued = Array.from({ length: 1_000 }, (_, randomSeed) =>
      rollEventContactReward({ ...improved, randomSeed }, sparring)
    ).find((reward) => reward.baseAmount === 0 && reward.bonusAmount > 0);

    expect(rescued).toMatchObject({ baseAmount: 0, bonusAmount: 1, amount: 1 });
  });
});
