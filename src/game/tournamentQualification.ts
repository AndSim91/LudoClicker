import type { TournamentLevel } from "./types";

export type QualificationDestination = Exclude<
  TournamentLevel,
  "school" | "chronicles"
>;

export type QualificationSlotCount = 6 | 12;

const TWELVE_SLOT_MEMBER_THRESHOLD: Record<QualificationDestination, number> = {
  academy: 100,
  national: 300,
  champions: 501,
};

/**
 * Returns the total positions in the source tournament ranking that advance
 * to the destination level. The caller captures activeMembers when the source
 * tournament completes, so later membership changes do not rewrite the result.
 */
export function getQualificationSlotCount(
  destination: QualificationDestination,
  activeMembers: number,
): QualificationSlotCount {
  return activeMembers >= TWELVE_SLOT_MEMBER_THRESHOLD[destination] ? 12 : 6;
}

export function getQualificationDisciplineSlotCount(
  slotCount: QualificationSlotCount,
): 3 | 6 {
  return slotCount === 12 ? 6 : 3;
}
