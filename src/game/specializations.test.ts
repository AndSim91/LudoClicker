import { describe, expect, it } from "vitest";
import { getEmailBuildLength } from "../content/emailBuild";
import { addAdminMembers } from "./adminFlow";
import { startNextCampaign } from "./emailFlow";
import { startAcquisitionEvent } from "./eventFlow";
import { getMemberAnnualDepartureChance } from "./formulas";
import { createInitialState } from "./initialState";
import type { GameState, SchoolSpecialization } from "./types";
import { applyFlowInput, getFlowMeterAt } from "./writingRhythm";

function school(specialization: SchoolSpecialization, state = createInitialState(1_000, "", false)): GameState {
  return { ...state, school: { ...state.school, specialization } };
}

describe("school specializations", () => {
  it("Redazione starts new emails at 20% and keeps the Flusso longer", () => {
    const inbox = (state: GameState) => ({
      ...state,
      emails: [],
      contacts: state.contacts.map((contact, index) => ({ ...contact, status: index === 0 ? "available" as const : "lost" as const })),
    });
    const email = startNextCampaign(inbox(school("redazione")), 2_000).emails[0];
    expect(email.revealedCharacters).toBe(Math.floor(getEmailBuildLength(email) * 0.2));
    expect(startNextCampaign(inbox(school("generale")), 2_000).emails[0].revealedCharacters).toBe(0);

    let plain = applyFlowInput(undefined, 0, 5);
    let steady = applyFlowInput(undefined, 0, 5, 0.5);
    for (let input = 0; input < 20; input += 1) {
      plain = applyFlowInput(plain, 0, 5);
      steady = applyFlowInput(steady, 0, 5, 0.5);
    }
    expect(getFlowMeterAt(steady, 1_000)).toBeGreaterThan(getFlowMeterAt(plain, 1_000));
  });

  it("Eventi runs the same event twice at once, never three times", () => {
    const start = (state: GameState, times: number) => {
      let next = state;
      for (let time = 0; time < times; time += 1) next = startAcquisitionEvent(next, "park-sparring", 2_000 + time);
      return next.acquisitionEvents.filter((event) => event.status === "running").length;
    };
    const base = addAdminMembers(createInitialState(1_000, "", false), 20);
    const ready = { ...base, school: { ...base.school, euros: 10_000 }, equipment: { ...base.equipment, totalSwords: 40 } };
    expect(start(school("generale", ready), 3)).toBe(1);
    expect(start(school("eventi", ready), 3)).toBe(2);
  });

  it("Accoglienza lowers the yearly departures by a quarter", () => {
    expect(getMemberAnnualDepartureChance([], "common", 0, "accoglienza")).toBeCloseTo(0.6);
    expect(getMemberAnnualDepartureChance([], "common", 0, "generale")).toBeCloseTo(0.8);
  });
});
