import type { CampaignEmail } from "../game/types";
import { buildEmailHtmlSource } from "./finalEmail";

export const EMAIL_STRUCTURE_INPUTS = 12;

export function getEmailBuildSource(email: CampaignEmail): string {
  if (email.presentationLevel <= 2) return email.body;
  return buildEmailHtmlSource({
    subject: email.subject,
    body: email.body,
    presentationLevel: email.presentationLevel,
  });
}

export function getEmailBuildLength(email: CampaignEmail): number {
  return getEmailBuildSource(email).length;
}

export function getEmailStructureProgress(email: CampaignEmail): number {
  const sourceLength = getEmailBuildLength(email);
  if (sourceLength === 0) return 0;
  if (email.presentationLevel <= 2) return 100;
  return Math.min(100, Math.round((email.revealedCharacters / sourceLength) * 100));
}

export function getEmailTextRevealCount(email: CampaignEmail): number {
  if (email.presentationLevel <= 2) {
    return Math.min(email.body.length, Math.max(0, email.revealedCharacters));
  }
  return Math.min(getEmailBuildLength(email), Math.max(0, email.revealedCharacters));
}
