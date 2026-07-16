import { MAIL_SENDER_ADDRESS } from "./emailAddresses";

export const FINAL_EMAIL_TITLE = "Scopri il prossimo passo";

export interface FinalEmailCopyContext {
  title?: string;
  opening: string;
  invitation: string;
  signature?: string;
  details?: readonly string[];
  contacts?: readonly string[];
  videoTitle?: string;
  videoCaption?: string;
  disclaimer?: string;
}

export type FinalEmailTextKey =
  | "title"
  | "greeting"
  | "intro"
  | "mainLabel"
  | "details"
  | "booking"
  | "contactsLabel"
  | "contacts"
  | "videoLabel"
  | "videoTitle"
  | "videoCaption"
  | "signoff"
  | "signature"
  | "disclaimer";

const DEFAULT_DETAILS = [
  "Una prova introduttiva per conoscere il percorso.",
  "Un ambiente guidato, aperto anche a chi parte da zero.",
  "Un gruppo pronto ad accompagnarti passo dopo passo.",
] as const;

const DEFAULT_CONTACTS = [
  MAIL_SENDER_ADDRESS,
  "Rispondi direttamente a questa email",
] as const;

const DEFAULT_VIDEO_TITLE = "Guarda il movimento in azione";
const DEFAULT_VIDEO_CAPTION = "Un assaggio video del nostro sport";
const DEFAULT_DISCLAIMER =
  "Ricevi questo messaggio perché hai mostrato interesse per le attività dell'Ordine delle Onde.";

export const FINAL_EMAIL_SIGNATURE = "Ordine delle Onde · LudoSport Genova";

interface FinalEmailTextEntry {
  key: FinalEmailTextKey;
  text: string;
}

export function buildFinalEmailTextEntries(
  firstName: string,
  context: FinalEmailCopyContext,
  level: number,
): FinalEmailTextEntry[] {
  const opening = [context.opening.trim(), context.invitation.trim()]
    .filter(Boolean)
    .join(" ");
  const title = context.title?.trim() || FINAL_EMAIL_TITLE;
  const details = context.details?.filter(Boolean) ?? DEFAULT_DETAILS;
  const contacts = context.contacts?.filter(Boolean) ?? DEFAULT_CONTACTS;
  const videoTitle = context.videoTitle?.trim() || DEFAULT_VIDEO_TITLE;
  const videoCaption = context.videoCaption?.trim() || DEFAULT_VIDEO_CAPTION;
  const disclaimer = context.disclaimer?.trim() || DEFAULT_DISCLAIMER;
  const signature = context.signature?.trim() || FINAL_EMAIL_SIGNATURE;

  const entries: FinalEmailTextEntry[] = [];

  if (level >= 3) {
    entries.push({ key: "title", text: title });
  }

  entries.push(
    { key: "greeting", text: `Ciao ${firstName},` },
    {
      key: "intro",
      text: opening || "Scopri un modo nuovo di allenarti insieme a noi.",
    },
  );

  if (level >= 4) {
    entries.push({
      key: "mainLabel",
      text: "UNISCITI A LUDOSPORT!",
    });
  }
  if (level >= 3) {
    entries.push({ key: "details", text: details.join("\n") });
  }
  if (level >= 4) {
    entries.push({
      key: "booking",
      text: "Scrivici per ricevere le informazioni aggiornate e scegliere il prossimo appuntamento.",
    });
  }
  if (level >= 5) {
    entries.push({ key: "contactsLabel", text: "CONTATTI" });
    entries.push({ key: "contacts", text: contacts.join("\n") });
  }
  if (level >= 6) {
    entries.push({ key: "videoLabel", text: "APPROFONDISCI" });
    entries.push({ key: "videoTitle", text: videoTitle });
  }
  if (level >= 7) {
    entries.push({ key: "videoCaption", text: videoCaption });
  }

  entries.push({ key: "signoff", text: "Un saluto," });
  if (level >= 2) entries.push({ key: "signature", text: signature });
  if (level >= 7) entries.push({ key: "disclaimer", text: disclaimer });
  return entries;
}

export function buildFinalEmailBody(
  firstName: string,
  context: FinalEmailCopyContext,
  level = 7,
): string {
  return buildFinalEmailTextEntries(firstName, context, level)
    .map(({ text }) => text)
    .join("\n\n");
}

export interface FinalEmailTextSection {
  key: FinalEmailTextKey;
  text: string;
  start: number;
}

export function getFinalEmailTextSections(
  body: string,
  level: number,
): FinalEmailTextSection[] {
  const keys = buildFinalEmailTextEntries("", { opening: "", invitation: "" }, level)
    .map(({ key }) => key);
  let searchFrom = 0;
  return body.split("\n\n").map((text, index) => {
    const start = body.indexOf(text, searchFrom);
    searchFrom = start + text.length;
    return { key: keys[index] ?? "intro", text, start };
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textSection(sections: FinalEmailTextSection[], key: FinalEmailTextKey): string {
  return sections.find((section) => section.key === key)?.text ?? "";
}

function renderParagraph(className: string, text: string): string {
  return text ? `<p class="${className}">${escapeHtml(text)}</p>` : "";
}

function renderList(className: string, text: string): string {
  if (!text) return "";
  const items = text
    .split("\n")
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return `<ul class="${className}">${items}</ul>`;
}

/**
 * This is the actual document being written for presentation levels 3–7.
 * The preview consumes a prefix of this string, so CSS, tags, attributes and
 * copy become visible only after their source characters have been written.
 */
export function buildEmailHtmlSource({
  subject,
  body,
  presentationLevel = 7,
}: {
  subject: string;
  body: string;
  presentationLevel?: number;
}): string {
  if (presentationLevel <= 2) return body;

  const sections = getFinalEmailTextSections(body, presentationLevel);
  const title = textSection(sections, "title") || subject || FINAL_EMAIL_TITLE;
  const details = textSection(sections, "details");
  const contacts = textSection(sections, "contacts");

  return `<!doctype html>
<style data-email-source>
  .source-mail { width: 100%; max-width: 600px; margin: 0 auto; background: #fff; }
  .source-mail img { display: block; max-width: 100%; height: auto; }
</style>
<div class="campaign-email-document campaign-email-final campaign-email-final-stage-${presentationLevel}" aria-label="Email HTML in costruzione">
  <div class="final-email-paper">
    <header class="final-email-header">
      <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde">
      ${renderParagraph("final-email-title", title)}
    </header>
    <section class="final-email-card final-email-main-card">
      ${renderParagraph("final-email-category", textSection(sections, "mainLabel"))}
      ${presentationLevel >= 4 ? '<img class="final-email-hero" src="/email-assets/lezione-prova.jpg" alt="Attività LudoSport">' : ""}
      <div class="final-email-copy">
        ${renderParagraph("final-email-greeting", textSection(sections, "greeting"))}
        ${renderParagraph("final-email-intro", textSection(sections, "intro"))}
        ${presentationLevel >= 3 ? renderList("final-email-details", details) : ""}
        ${renderParagraph("final-email-booking", textSection(sections, "booking"))}
        ${renderParagraph("final-email-signoff", textSection(sections, "signoff"))}
        ${presentationLevel >= 2 ? `
        <div class="final-email-signature" aria-label="Firma Ordine delle Onde">
          <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde">
          ${renderParagraph("final-email-signature-copy", textSection(sections, "signature"))}
        </div>` : ""}
      </div>
    </section>
    ${presentationLevel >= 5 ? `
    <section class="final-email-card final-email-contact-card">
      ${renderParagraph("final-email-category", textSection(sections, "contactsLabel"))}
      ${renderList("final-email-contacts", contacts)}
    </section>` : ""}
    ${presentationLevel >= 6 ? `
    <section class="final-email-card final-email-video-card">
      ${renderParagraph("final-email-category", textSection(sections, "videoLabel"))}
      ${renderParagraph("final-email-video-title", textSection(sections, "videoTitle"))}
      <img class="final-email-video-image" src="/email-assets/video-demo.jpg" alt="Video dimostrativo LudoSport">
      ${renderParagraph("final-email-video-caption", textSection(sections, "videoCaption"))}
    </section>` : ""}
    ${presentationLevel >= 7 ? `
    <footer class="final-email-footer">
      <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde">
      ${renderParagraph("final-email-disclaimer", textSection(sections, "disclaimer"))}
    </footer>` : ""}
  </div>
</div>`;
}
