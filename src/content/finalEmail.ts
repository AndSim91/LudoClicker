import { MAIL_SENDER_ADDRESS } from "./emailAddresses";

export const FINAL_EMAIL_TITLE = "Scopri il prossimo passo";

export interface FinalEmailCopyContext {
  title?: string;
  opening: string;
  invitation: string;
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
const DEFAULT_VIDEO_CAPTION = "Un assaggio del percorso, oltre le parole.";
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

  const entries: FinalEmailTextEntry[] = [
    { key: "title", text: title },
    { key: "greeting", text: `Ciao ${firstName},` },
    {
      key: "intro",
      text: opening || "Scopri un modo nuovo di allenarti insieme a noi.",
    },
    { key: "mainLabel", text: "IL PROSSIMO PASSO" },
  ];

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
  if (level >= 7) entries.push({ key: "signature", text: FINAL_EMAIL_SIGNATURE });
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

/**
 * The visual mail is a projection of this source. It starts with the document
 * and CSS scaffolding so the first construction inputs are structural rather
 * than visible copy.
 */
export function buildEmailHtmlSource({ subject, body }: { subject: string; body: string }): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; }
    .mail { width: 100%; max-width: 600px; margin: 0 auto; background: #fff; }
    .card { border: 0.5px solid #c0c0c0; border-radius: 10px; background: #fcfcfc; }
    img { display: block; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <main class="mail">
    <header><img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde"></header>
    <h1>${escapeHtml(subject || FINAL_EMAIL_TITLE)}</h1>
    <article class="card"><h2>IL PROSSIMO PASSO</h2>
      <img src="/email-assets/lezione-prova.jpg" alt="Attività LudoSport">
      <p>${escapeHtml(body)}</p>
    </article>
    <section class="card" data-section="contacts"><h2>CONTATTI</h2></section>
    <section class="card" data-section="video"><h2>APPROFONDISCI</h2><img src="/email-assets/video-demo.jpg" alt="Attività LudoSport"></section>
    <footer><img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde"></footer>
  </main>
</body>
</html>`;
}
