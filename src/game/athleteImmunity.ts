import { getSchoolYear } from "./calendar";
import { GAME_CONFIG } from "./config";
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
  /** School size: from 500 Iscritti a course no longer saves, it lowers the risk. Unset = protected. */
  activeMembers?: number;
  /** The agonist course is Corso Agonisti (stats) rather than Arena Tecnica. */
  agonistCourseGrantsStats?: boolean;
}

/**
 * Corso dell'anno (Andrea, 14/10/2026): below 500 Iscritti a course started in the
 * school year saves from the yearly departures; from 500 on it takes away a share
 * of the risk left after the Forma: Forma, Corso X or Corso Y 50%, Arena Tecnica 75%,
 * Corso Agonisti 90% (`GAME_CONFIG.courseDepartureReduction`).
 */
export const COURSE_IMMUNITY_MEMBER_LIMIT = 500;

export interface AthleteImmunityStatus {
  reasons: AthleteImmunityReason[];
  annualRollout: boolean;
  /** Share of the yearly risk the course of the year takes away (0 when it saves or there is none). */
  courseRiskReduction: number;
  unexpectedEvents: boolean;
  message: string | null;
}

type AthleteProgress = Pick<Contact, "lastFormTrainingYear" | "lastAgonistCourseYear"> |
  Pick<Collaborator, "lastFormTrainingYear" | "lastAgonistCourseYear">;

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
  athlete: Pick<Contact, "id" | "rarity" | "enrolledMonth" | "lastFormTrainingYear" | "lastAgonistCourseYear">,
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
  const schoolYear = getSchoolYear(context.currentMonth);
  const agonistThisYear = progress.lastAgonistCourseYear === schoolYear;
  if (progress.lastFormTrainingYear === schoolYear || agonistThisYear) {
    reasons.push("gym-course");
  }

  const courseOnly = (context.activeMembers ?? 0) >= COURSE_IMMUNITY_MEMBER_LIMIT;
  const annualRollout = reasons.some((reason) => !(courseOnly && reason === "gym-course"));
  const reductions = GAME_CONFIG.courseDepartureReduction;
  // ponytail: Arena Tecnica or Corso Agonisti by today's upgrades, not by the day of the course.
  const courseRiskReduction = annualRollout || !reasons.includes("gym-course")
    ? 0
    : agonistThisYear
    ? (context.agonistCourseGrantsStats ? reductions.agonist : reductions.arenaTecnica)
    : reductions.form;
  const unexpectedEvents = reasons.some((reason) =>
    reason === "legendary" ||
    reason === "tournament-qualification" ||
    reason === "recent-enrollment"
  );
  return {
    reasons,
    annualRollout,
    courseRiskReduction,
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

/** Risk reduction (Chat di Gruppo) with the course of the year on top: the two multiply. */
export function getYearlyRiskReduction(status: AthleteImmunityStatus, riskReduction = 0): number {
  return status.courseRiskReduction > 0
    ? 1 - (1 - riskReduction) * (1 - status.courseRiskReduction)
    : riskReduction;
}
