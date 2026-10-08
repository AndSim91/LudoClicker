import type { AnnualReport } from "../../game/types";

/** School year 0 is January–July of the first calendar year (08/10). */
export function describeSchoolYear(report: Pick<AnnualReport, "schoolYear">): string {
  return report.schoolYear === 0 ? "del primo anno (gennaio–luglio)" : `dell'anno scolastico ${report.schoolYear}`;
}

export const CONTACT_SOURCE_LABELS: Record<string, string> = {
  tutorial: "Prime prove",
  sparring: "Sparring",
  event: "Eventi",
  social: "Social",
  collaborator: "Collaboratori",
  tournament: "Tornei",
};
