import { normalizeEmailLocalPart } from "./prospectDirectory";

export const MAIL_SENDER_ADDRESS = "genova@ludosport.net";
export const LEGENDARY_EMAIL_DOMAIN = "ludosport.net";

export function createLegendaryEmailAddress(firstName: string, lastName: string): string {
  const localPart = normalizeEmailLocalPart(firstName, lastName)
    .replace(/['’]/g, "");
  return `${localPart}@${LEGENDARY_EMAIL_DOMAIN}`;
}
