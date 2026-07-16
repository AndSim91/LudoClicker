export const FINAL_EMAIL_TITLE =
  "Ciao! Grazie di aver provato il nostro sport al MegaCon di Genova!";

export interface FinalEmailCopyContext {
  opening: string;
  invitation: string;
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

export const FINAL_EMAIL_DETAILS = [
  "📅 Quando? Il 4, 11 o 18 Marzo",
  "⏰ A che ora? Dalle 20.30 alle 22.45",
  "🗺️ Dove? Al PalaGym Assarotti, tra Brignole e Piazza Corvetto",
  "🥋 Cosa portare? Maglietta, pantaloni comodi e scarpe da palestra",
] as const;

export const FINAL_EMAIL_CONTACTS = [
  "genova@ludosport.net",
  "@ludosport.onde",
  "320 0809640 (Andrea Ungaro)",
] as const;

export const FINAL_EMAIL_VIDEO_TITLE =
  "🎬 Uno dei combattimenti più rappresentativi del nostro sport";

export const FINAL_EMAIL_VIDEO_CAPTION =
  "Finale 3° e 4° posto del Torneo Nazionale LudoSport 2022 — Guarda su YouTube";

export const FINAL_EMAIL_SIGNATURE = "Ordine delle Onde · LudoSport Genova";

export const FINAL_EMAIL_DISCLAIMER =
  "Ti scriviamo questa mail in quanto hai dato la disponibilità a ricevere informazioni sui corsi LudoSport a Genova. Non è una newsletter e, a meno di un follow up, non riceverai altri messaggi da parte nostra.";

interface FinalEmailTextEntry {
  key: FinalEmailTextKey;
  text: string;
}

export function buildFinalEmailTextEntries(
  firstName: string,
  context: FinalEmailCopyContext,
  level: number,
): FinalEmailTextEntry[] {
  const opening = `${context.opening.trim()} ${context.invitation.trim()}`;

  const entries: FinalEmailTextEntry[] = [
    { key: "title", text: FINAL_EMAIL_TITLE },
    { key: "greeting", text: `Ciao ${firstName},` },
    {
      key: "intro",
      text: `Speriamo che la prova fatta quest'ultimo fine settimana ti sia piaciuta. ${opening} Questo è un invito a unirti a noi per una lezione vera e propria di Light Saber Combat della durata di due ore nella nostra sede Genovese.`,
    },
    { key: "mainLabel", text: "⚔️ UNISCITI AD UNA LEZIONE DI LIGHT SABER COMBAT" },
  ];

  if (level >= 3) {
    entries.push({ key: "details", text: FINAL_EMAIL_DETAILS.join("\n") });
  }
  if (level >= 4) {
    entries.push({
      key: "booking",
      text: "Ti basta contattarci per farci sapere in quale giorno vorrai partecipare, anche la mattina del giorno stesso! Rimaniamo a disposizione per qualsiasi dubbio e speriamo di rivederti presto!",
    });
  }
  if (level >= 5) {
    entries.push({ key: "contactsLabel", text: "COME PRENOTARE" });
    entries.push({ key: "contacts", text: FINAL_EMAIL_CONTACTS.join("\n") });
  }
  if (level >= 6) {
    entries.push({ key: "videoLabel", text: "DA VEDERE" });
    entries.push({ key: "videoTitle", text: FINAL_EMAIL_VIDEO_TITLE });
  }
  if (level >= 7) {
    entries.push({ key: "videoCaption", text: FINAL_EMAIL_VIDEO_CAPTION });
  }

  entries.push({ key: "signoff", text: "Un saluto," });
  if (level >= 7) entries.push({ key: "signature", text: FINAL_EMAIL_SIGNATURE });
  if (level >= 7) entries.push({ key: "disclaimer", text: FINAL_EMAIL_DISCLAIMER });
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
 * The visual mail is a projection of this source. It intentionally starts
 * with the document and CSS scaffolding so the first construction inputs are
 * structural rather than visible copy.
 */
export function buildEmailHtmlSource({ subject, body }: { subject: string; body: string }): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
    <h1>${escapeHtml(FINAL_EMAIL_TITLE)}</h1>
    <article class="card"><h2>UNISCITI AD UNA LEZIONE DI LIGHT SABER COMBAT</h2>
      <img src="/email-assets/lezione-prova.jpg" alt="Light Saber Combat LudoSport">
      <p>${escapeHtml(body)}</p>
    </article>
    <section class="card" data-section="contacts"><h2>COME PRENOTARE</h2></section>
    <section class="card" data-section="video"><h2>DA VEDERE</h2><img src="/email-assets/video-demo.jpg" alt="Combattimento LudoSport"></section>
    <footer><img src="/email-assets/ordine-onde.png" alt="Ludosport Genova"></footer>
    <p class="disclaimer">${escapeHtml(subject)}</p>
  </main>
</body>
</html>`;
}
