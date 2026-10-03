import { expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import { createInitialState, gameReducer } from "./engine";
import { getMemberFee, getMonthlyMemberFees } from "./membershipEconomy";

it("raises the base fee with the record of active members, never lowering it", () => {
  expect([0, 24, 25, 49, 50, 100, 249, 250, 500, 2_000].map(getMemberFee))
    .toEqual([40, 40, 50, 50, 60, 80, 80, 120, 160, 160]);

  const grown = addAdminMembers(createInitialState(1_000, "Tester"), 60);
  expect(grown.school.peakActiveMembers).toBeGreaterThanOrEqual(60);
  const shrunk = { ...grown, school: { ...grown.school, activeMembers: 10 } };
  expect(getMonthlyMemberFees(shrunk) - getMonthlyMemberFees({ ...shrunk, school: { ...shrunk.school, activeMembers: 0 } }))
    .toBe(10 * 60);
});

it("announces the highest new fee tier once", () => {
  const initial = createInitialState(1_000, "Tester");
  const grown = { ...initial, school: { ...initial.school, peakActiveMembers: 60 } };
  const ticked = gameReducer(grown, { type: "TICK", now: 2_000 });
  const again = gameReducer(ticked, { type: "TICK", now: 3_000 });

  const announcements = again.messages.filter((message) => message.subject.startsWith("Quota mensile"));
  expect(announcements.map((message) => message.subject)).toEqual(["Quota mensile: 60 €"]);
  expect(announcements[0].preview).toContain("Prossimo scalino a 100.");
  expect(again.school.feeTiersAnnounced).toBe(2);
});
