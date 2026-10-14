import { getSchoolYear } from "./calendar";
import type { Collaborator, Contact, TournamentState } from "./types";

export type AthleteImmunityReason =
  | "legendary"
  | "tournament-qualification"
  | "recent-enrollment"
  | "collaborator"
  | "gym-course";

export type AthleteDepartureContext =
  | "annual-rollout"
  | "unexpected-event"
  | "data-reconciliation"
  | "manual-cancellation";

export interface AthleteImmunityContext {
  currentMonth: number;
  tournamentQualification?: TournamentState["qualification"];
  /** School size: from 500 Iscritti a course no longer saves, it halves the risk. Unset = protected. */
  activeMembers?: number;
}

/**
 * Corso dell'anno (Andrea, 14/10/2026): below 500 Iscritti a course started in the
 * school year saves from the yearly departures; from 500 on it halves the risk left
 * after the Forma (and Chat di Gruppo).
 */
export const COURSE_IMMUNITY_MEMBER_LIMIT = 500;
export const COURSE_DEPARTURE_FACTOR = 0.5;

export interface AthleteImmunityStatus {
  reasons: AthleteImmunityReason[];
  annualRollout: boolean;
  /** The course of the year halves the yearly risk instead of cancelling it. */
  courseHalvesRisk: boolean;
  unexpectedEvents: boolean;
  message: string | null;
}

type AthleteProgress = Pick<Contact, "lastFormTrainingYear"> |
  Pick<Collaborator, "lastFormTrainingYear">;

export const ATHLETE_IMMUNITY_MESSAGES: Record<AthleteImmunityReason, string> = {
  legendary: "",
  "tournament-qualification": "Qualificato al prossimo torneo",
  "recent-enrollment": "Nuova iscrizione",
  collaborator: "Collaboratore",
  "gym-course": "Corso in palestra",
};

function hasRecentEnrollmentImmunity(enrolledMonth: number, currentMonth: number): boolean {
  const normalizedCurrentMonth = Math.max(1, Math.floor(currentMonth));
  const monthOfYear = ((normalizedCurrentMonth - 1) % 12) + 1;
  if (monthOfYear >= 9) return false;

  const currentYearStartMonth = normalizedCurrentMonth - monthOfYear + 1;
  const normalizedEnrolledMonth = Math.max(1, Math.floor(enrolledMonth));
  return normalizedEnrolledMonth >= currentYearStartMonth &&
    normalizedEnrolledMonth <= normalizedCurrentMonth;
}

export function getAthleteImmunityStatus(
  context: AthleteImmunityContext,
  athlete: Pick<Contact, "id" | "rarity" | "enrolledMonth" | "lastFormTrainingYear">,
  progress: AthleteProgress = athlete,
  isCollaborator = false,
): AthleteImmunityStatus {
  const reasons: AthleteImmunityReason[] = [];
  if (athlete.rarity === "legendary") reasons.push("legendary");
  if (context.tournamentQualification?.contactIds.includes(athlete.id)) {
    reasons.push("tournament-qualification");
  }
  if (hasRecentEnrollmentImmunity(
    athlete.enrolledMonth ?? context.currentMonth,
    context.currentMonth,
  )) {
    reasons.push("recent-enrollment");
  }
  if (isCollaborator) reasons.push("collaborator");
  if (progress.lastFormTrainingYear === getSchoolYear(context.currentMonth)) {
    reasons.push("gym-course");
  }

  const courseOnly = (context.activeMembers ?? 0) >= COURSE_IMMUNITY_MEMBER_LIMIT;
  const annualRollout = reasons.some((reason) => !(courseOnly && reason === "gym-course"));
  const courseHalvesRisk = !annualRollout && reasons.includes("gym-course");
  const unexpectedEvents = reasons.some((reason) =>
    reason === "legendary" ||
    reason === "tournament-qualification" ||
    reason === "recent-enrollment"
  );
  return {
    reasons,
    annualRollout,
    courseHalvesRisk,
    unexpectedEvents,
    message: annualRollout ? ATHLETE_IMMUNITY_MESSAGES[reasons[0]] : null,
  };
}

export function isAthleteImmuneFromDeparture(
  status: AthleteImmunityStatus,
  context: AthleteDepartureContext,
): boolean {
  if (context === "manual-cancellation") return false;
  if (context === "annual-rollout") return status.annualRollout;
  if (context === "unexpected-event") return status.unexpectedEvents;
  return status.reasons.some((reason) =>
    reason === "legendary" || reason === "tournament-qualification"
  );
}

/** Risk reduction (Chat di Gruppo) with the course of the year on top, when it only halves the risk. */
export function getYearlyRiskReduction(status: AthleteImmunityStatus, riskReduction = 0): number {
  return status.courseHalvesRisk ? 1 - (1 - riskReduction) * COURSE_DEPARTURE_FACTOR : riskReduction;
}
