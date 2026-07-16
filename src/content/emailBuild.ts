import type { CampaignEmail } from "../game/types";

export const EMAIL_STRUCTURE_INPUTS = 12;

function getStructureInputBudget(bodyLength: number): number {
  return Math.min(EMAIL_STRUCTURE_INPUTS, Math.max(1, bodyLength));
}

export function getEmailStructureProgress(email: CampaignEmail): number {
  if (email.body.length === 0) return 0;
  if (email.presentationLevel <= 1) return 100;
  const budget = getStructureInputBudget(email.body.length);
  return Math.min(100, Math.round((Math.min(email.revealedCharacters, budget) / budget) * 100));
}

export function getEmailTextRevealCount(email: CampaignEmail): number {
  if (email.body.length === 0) return 0;
  if (email.presentationLevel <= 1) {
    return Math.min(email.body.length, Math.max(0, email.revealedCharacters));
  }
  const budget = getStructureInputBudget(email.body.length);
  if (email.revealedCharacters <= budget) return 0;

  const textInputBudget = email.body.length - budget;
  if (textInputBudget <= 0) return email.body.length;

  const textInputs = email.revealedCharacters - budget;
  return Math.min(
    email.body.length,
    Math.round((textInputs / textInputBudget) * email.body.length),
  );
}
