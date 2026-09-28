import type { EmailPresentationLevel } from "../game/types";
import { EMAIL_CATALOG } from "./emailCatalog";
import {
  COURTEOUS_LINES,
  DRAFT_LINES,
  INFO_DETAILS,
  MARKETING_BOOKINGS,
  MARKETING_CALLS,
  MARKETING_HOOKS,
  MARKETING_SUBJECTS,
  POSTSCRIPTS,
  PUNCHY_DETAILS,
  WARM_BOOKINGS,
  WARM_CALLS,
  WARM_HOOKS,
  pickPhrase,
  pickPhrases,
} from "./emailPhrases";
import { buildFinalEmailBody } from "./finalEmail";
import { addLevelZeroTypos, type TypoRange } from "./levelZeroTypos";

export { EMAIL_CATALOG };

/*
 * How an email grows with the Creatività catalogs (levels 0–7). The text comes
 * from two places only: the catalog (one idea per email, emailCatalog.ts) and
 * the phrase bank (emailPhrases.ts). `expansion` is the number of points (0–5)
 * bought in the upgrade of the email's level: each point adds one phrase.
 */

export interface EmailTemplate {
  id: string;
  subject: string;
  body: (
    firstName: string,
    senderName: string,
    presentationLevel?: EmailPresentationLevel,
    orderName?: string,
    city?: string,
    expansion?: number,
  ) => string;
}

export interface ResolvedEmailTemplateCopy {
  subject: string;
  body: string;
  /** Level 0 only: where the generated spelling errors are, for the underline. */
  typos?: { subject: TypoRange[]; body: TypoRange[] };
}

export interface EmailCatalogEntry {
  id: string;
  /** Joke subject of the draft (levels 0–1). */
  draftSubject: string;
  /** Correct draft text of levels 0–1; level 0 errors are generated. */
  draft: string;
  /** Subject of the professional catalogs (level 2 onward). */
  subject: string;
  opening: string;
  invitation: string;
}

export const MAX_EMAIL_EXPANSION = 5;

const DEFAULT_ORDER_NAME = "Ordine delle Onde";
const DEFAULT_CITY = "Genova";
// Level 0 keeps only the start of the draft: at least this many characters.
const LEVEL_ZERO_MIN_CHARACTERS = 70;
// Base bullets of the HTML catalogs, before the Creatività points add more.
const BASE_DETAILS = 3;

export function formatEmailSignature(
  senderName: string,
  orderName = DEFAULT_ORDER_NAME,
  city = DEFAULT_CITY,
): string {
  const player = senderName.trim();
  const location = city.trim();
  const escapedCity = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizedOrder = orderName
    .trim()
    .replace(new RegExp(`\\s*[\\-–—]\\s*${escapedCity}$`, "iu"), "")
    .trim();
  const school = [normalizedOrder, location].filter(Boolean).join(" - ");
  return [player, school].filter(Boolean).join(", ");
}

export function capitalize(value: string) {
  return value ? `${value[0].toLocaleUpperCase("it-IT")}${value.slice(1)}` : value;
}

function lowerFirst(value: string) {
  return value ? `${value[0].toLocaleLowerCase("it-IT")}${value.slice(1)}` : value;
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

interface CopyContext {
  firstName: string;
  senderName: string;
  orderName: string;
  city: string;
  expansion: number;
}

function fill(text: string, context: CopyContext): string {
  return text
    .replaceAll("{{firstName}}", context.firstName)
    .replaceAll("{{senderName}}", context.senderName)
    .replaceAll("{{orderName}}", context.orderName)
    .replaceAll("{{city}}", context.city);
}

function levelZeroCopy(entry: EmailCatalogEntry, index: number, context: CopyContext): ResolvedEmailTemplateCopy {
  const sentences = splitSentences(fill(entry.draft, context));
  let nucleus = "";
  for (const sentence of sentences) {
    nucleus = nucleus ? `${nucleus} ${sentence}` : sentence;
    if (nucleus.length >= LEVEL_ZERO_MIN_CHARACTERS) break;
  }
  const protectedWords = [...context.firstName.split(/\s+/), ...context.senderName.split(/\s+/)];
  const subject = addLevelZeroTypos(fill(entry.draftSubject, context), `${entry.id}:subject`, {
    protectedWords,
    minimum: 1,
  });
  const body = addLevelZeroTypos(`Ciao ${context.firstName},\n${nucleus}`, `${entry.id}:body:${index}`, {
    protectedWords,
  });
  return {
    subject: subject.text,
    body: body.text,
    typos: { subject: subject.ranges, body: body.ranges },
  };
}

function levelOneCopy(entry: EmailCatalogEntry, index: number, context: CopyContext): ResolvedEmailTemplateCopy {
  const draft = fill(entry.draft, context);
  const lines = pickPhrases(DRAFT_LINES, index, context.expansion, draft);
  return {
    subject: fill(entry.draftSubject, context),
    body: `Ciao ${context.firstName},\n${[draft, ...lines].join(" ")}`,
  };
}

function catalogCopy(
  entry: EmailCatalogEntry,
  index: number,
  level: EmailPresentationLevel,
  context: CopyContext,
): ResolvedEmailTemplateCopy {
  const marketing = level >= 5;
  const opening = fill(entry.opening, context);
  const invitation = fill(entry.invitation, context);
  const signature = formatEmailSignature(context.senderName, context.orderName, context.city);

  if (level === 2) {
    const lines = pickPhrases(COURTEOUS_LINES, index, context.expansion, `${opening} ${invitation}`);
    return {
      subject: entry.subject,
      body: buildFinalEmailBody(context.firstName, {
        opening,
        invitation: [invitation, ...lines].join(" "),
        signature,
      }, level),
    };
  }

  // Levels 3–7: a hook opens the intro, details grow with the points.
  const hook = fill(pickPhrase(marketing ? MARKETING_HOOKS : WARM_HOOKS, index), context);
  const details = pickPhrases(
    marketing ? PUNCHY_DETAILS : INFO_DETAILS,
    index,
    BASE_DETAILS + context.expansion,
  );
  const subject = level >= 6
    ? fill(pickPhrase(MARKETING_SUBJECTS, index), context)
    : `${context.firstName}, ${lowerFirst(entry.subject)}`;
  return {
    subject,
    body: buildFinalEmailBody(context.firstName, {
      title: entry.subject,
      opening: `${hook} ${capitalize(opening)}`,
      invitation,
      details,
      mainLabel: pickPhrase(marketing ? MARKETING_CALLS : WARM_CALLS, index),
      booking: pickPhrase(marketing ? MARKETING_BOOKINGS : WARM_BOOKINGS, index),
      postscript: pickPhrase(POSTSCRIPTS, index),
      signature,
    }, level),
  };
}

function buildEmailCopy(
  index: number,
  level: EmailPresentationLevel,
  context: CopyContext,
): ResolvedEmailTemplateCopy {
  const entry = EMAIL_CATALOG[index];
  const clamped = { ...context, expansion: Math.min(MAX_EMAIL_EXPANSION, Math.max(0, Math.floor(context.expansion))) };
  if (level === 0) return levelZeroCopy(entry, index, clamped);
  if (level === 1) return levelOneCopy(entry, index, clamped);
  return catalogCopy(entry, index, level, clamped);
}

export const EMAIL_TEMPLATES: EmailTemplate[] = EMAIL_CATALOG.map((entry, index) => ({
  id: entry.id,
  subject: entry.subject,
  body: (
    firstName,
    senderName,
    presentationLevel = 0,
    orderName = DEFAULT_ORDER_NAME,
    city = DEFAULT_CITY,
    expansion = MAX_EMAIL_EXPANSION,
  ) => buildEmailCopy(index, presentationLevel, { firstName, senderName, orderName, city, expansion }).body,
}));

export function resolveEmailTemplateCopy(
  template: EmailTemplate,
  firstName: string,
  senderName: string,
  presentationLevel: EmailPresentationLevel,
  orderName = DEFAULT_ORDER_NAME,
  city = DEFAULT_CITY,
  expansion = MAX_EMAIL_EXPANSION,
): ResolvedEmailTemplateCopy {
  const index = Math.max(0, EMAIL_CATALOG.findIndex((entry) => entry.id === template.id));
  return buildEmailCopy(index, presentationLevel, { firstName, senderName, orderName, city, expansion });
}
