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
}

export interface AthleteImmunityStatus {
  reasons: AthleteImmunityReason[];
  annualRollout: boolean;
  unexpectedEvents: boolean;
  message: string | null;
}

type AthleteProgress = Pick<Contact, "lastFormTrainingYear"> |
  Pick<Collaborator, "lastFormTrainingYear">;

export const ATHLETE_IMMUNITY_MESSAGES: Record<AthleteImmunityReason, string> = {
  legendary: "Non soggetto ad abbandono",
  "tournament-qualification": "Qualificato al prossimo torneo · immune",
  "recent-enrollment": "Nuova iscrizione · immune fino a Settembre",
  collaborator: "Collaboratore · immune al rinnovo annuale",
  "gym-course": "Corso in palestra · immune al rinnovo annuale",
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

  const annualRollout = reasons.length > 0;
  const unexpectedEvents = reasons.some((reason) =>
    reason === "legendary" ||
    reason === "tournament-qualification" ||
    reason === "recent-enrollment"
  );
  return {
    reasons,
    annualRollout,
    unexpectedEvents,
    message: reasons.length > 0 ? ATHLETE_IMMUNITY_MESSAGES[reasons[0]] : null,
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
