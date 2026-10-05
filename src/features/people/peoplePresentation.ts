import { getFormDefinition, getVisibleForms } from "../../content/forms";
import { getMemberAnnualDepartureChance } from "../../game/formulas";
import type { FormId, PersonRarity } from "../../game/types";
import type { TrainingOption } from "./TrainingOptionPicker";

export function formatFormPath(forms: FormId[], courseXUnlocked = true): string {
  const visibleForms = getVisibleForms(forms, courseXUnlocked);
  if (visibleForms.length === 0) return "Da iniziare · Forma 1";
  const latest = getFormDefinition(visibleForms.at(-1)!);
  return latest?.longName ?? visibleForms.at(-1)!;
}

export function getMemberDepartureRiskLabel(
  forms: FormId[],
  rarity: PersonRarity,
  foundedSchools: number,
  riskReduction = 0,
): string {
  const annualDepartureChance = getMemberAnnualDepartureChance(forms, rarity, foundedSchools, riskReduction);
  if (annualDepartureChance >= 0.5) return "Rischio di abbandono alto";
  if (annualDepartureChance >= 0.15) return "Rischio di abbandono medio";
  if (annualDepartureChance > 0) return "Rischio di abbandono basso";
  return "Nessun rischio";
}

/** La prima Forma non coperta in scuola, altrimenti la prima della lista. */
export function getDefaultTrainingOption<T extends TrainingOption>(options: readonly T[]): T | undefined {
  return options.find((option) => option.coverage === "uncovered") ?? options[0];
}
