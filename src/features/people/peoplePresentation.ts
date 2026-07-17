import { getFormDefinition } from "../../content/forms";
import { getMemberAnnualDepartureChance } from "../../game/formulas";
import type { FormId, PersonRarity } from "../../game/types";

export function formatFormPath(forms: FormId[]): string {
  if (forms.length === 0) return "Da iniziare · Forma 1";
  const latest = getFormDefinition(forms.at(-1)!);
  return `${latest?.title ?? forms.at(-1)}${latest?.branch ? ` · ${latest.branch}` : ""}`;
}

export function getMemberDepartureRiskLabel(
  forms: FormId[],
  rarity: PersonRarity,
  foundedSchools: number,
): string {
  const annualDepartureChance = getMemberAnnualDepartureChance(forms, rarity, foundedSchools);
  if (annualDepartureChance >= 2 / 3) return "Rischio alto";
  if (annualDepartureChance >= 1 / 3) return "Rischio medio";
  return "Rischio basso";
}
