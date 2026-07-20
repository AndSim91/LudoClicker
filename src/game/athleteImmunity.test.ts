import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import {
  getAthleteImmunityStatus,
  isAthleteImmuneFromDeparture,
} from "./athleteImmunity";

describe("athlete immunity", () => {
  it("protects January-August enrollments from every departure until September", () => {
    const athlete = {
      ...createInitialState(1_000).contacts[0],
      enrolledMonth: 13,
    };
    const protectedStatus = getAthleteImmunityStatus({ currentMonth: 18 }, athlete);
    const septemberStatus = getAthleteImmunityStatus({ currentMonth: 21 }, athlete);

    expect(protectedStatus.reasons).toEqual(["recent-enrollment"]);
    expect(protectedStatus.message).toBe("Nuova iscrizione · immune fino a Settembre");
    expect(isAthleteImmuneFromDeparture(protectedStatus, "annual-rollout")).toBe(true);
    expect(isAthleteImmuneFromDeparture(protectedStatus, "unexpected-event")).toBe(true);
    expect(septemberStatus.reasons).toEqual([]);
  });

  it("protects a qualified athlete only while present in the current qualification", () => {
    const athlete = {
      ...createInitialState(1_000).contacts[0],
      enrolledMonth: 9,
    };
    const qualified = getAthleteImmunityStatus({
      currentMonth: 21,
      tournamentQualification: {
        level: "champions",
        season: 1,
        contactIds: [athlete.id],
      },
    }, athlete);
    const noLongerQualified = getAthleteImmunityStatus({
      currentMonth: 21,
      tournamentQualification: {
        level: "champions",
        season: 1,
        contactIds: [],
      },
    }, athlete);

    expect(qualified.reasons).toEqual(["tournament-qualification"]);
    expect(qualified.message).toBe("Qualificato al prossimo torneo · immune");
    expect(isAthleteImmuneFromDeparture(qualified, "annual-rollout")).toBe(true);
    expect(isAthleteImmuneFromDeparture(qualified, "unexpected-event")).toBe(true);
    expect(noLongerQualified.reasons).toEqual([]);
  });

  it("limits gym-course protection to the annual rollout", () => {
    const athlete = {
      ...createInitialState(1_000).contacts[0],
      enrolledMonth: 9,
      lastFormTrainingYear: 2,
    };
    const status = getAthleteImmunityStatus({ currentMonth: 21 }, athlete);

    expect(status.reasons).toEqual(["gym-course"]);
    expect(status.message).toBe("Corso in palestra · immune al rinnovo annuale");
    expect(isAthleteImmuneFromDeparture(status, "annual-rollout")).toBe(true);
    expect(isAthleteImmuneFromDeparture(status, "unexpected-event")).toBe(false);
  });
});
