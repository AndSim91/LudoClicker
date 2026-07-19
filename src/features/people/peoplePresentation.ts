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
  if (annualDepartureChance >= 0.5) return "Rischio abbandono - alto";
  if (annualDepartureChance >= 0.15) return "Rischio abbandono - medio";
  if (annualDepartureChance > 0) return "Rischio abbandono - basso";
  return "Nessun rischio";
}
