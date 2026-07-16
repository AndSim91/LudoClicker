import type { MouseEvent } from "react";
import { EMAIL_PRESENTATION_LEVELS } from "../../content/emailPresentation";
import type { CampaignEmail } from "../../game/types";

const BOOKING_EMAIL = "genova@ludosport.net";
const MAP_URL = "https://maps.app.goo.gl/T73H8XwkPgZzRFe49";
const INSTAGRAM_URL = "https://www.instagram.com/ludosport.onde";
const VIDEO_URL = "https://www.youtube.com/watch?v=bgXnYHmJP44";

interface TextSection {
  text: string;
  start: number;
}

function getTextSections(body: string): TextSection[] {
  let searchFrom = 0;
  return body.split("\n\n").map((text) => {
    const start = body.indexOf(text, searchFrom);
    searchFrom = start + text.length;
    return { text, start };
  });
}

function RevealedText({
  section,
  revealedCharacters,
  showCaret,
}: {
  section: TextSection;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  const visibleCount = Math.max(
    0,
    Math.min(section.text.length, revealedCharacters - section.start),
  );
  const visible = section.text.slice(0, visibleCount);
  const hidden = section.text.slice(visibleCount);
  const caretIsHere =
    showCaret &&
    revealedCharacters >= section.start &&
    revealedCharacters < section.start + section.text.length;

  return (
    <>
      <span>{visible}</span>
      {caretIsHere ? <i className="text-caret" /> : null}
      <span className="untyped-copy" aria-hidden="true">{hidden}</span>
    </>
  );
}

function EmailCopy({
  body,
  revealedCharacters,
  showCaret,
}: {
  body: string;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  const sections = getTextSections(body);
  const greeting = sections[0];
  const signature = sections.at(-1);
  const paragraphs = sections.slice(1, -1);

  return (
    <div className="campaign-copy">
      {greeting ? (
        <p className="campaign-greeting">
          <RevealedText
            section={greeting}
            revealedCharacters={revealedCharacters}
            showCaret={showCaret}
          />
        </p>
      ) : null}
      {paragraphs.map((section) => (
        <p key={section.start}>
          <RevealedText
            section={section}
            revealedCharacters={revealedCharacters}
            showCaret={showCaret}
          />
        </p>
      ))}
      {signature && signature !== greeting ? (
        <p className="campaign-signature">
          <RevealedText
            section={signature}
            revealedCharacters={revealedCharacters}
            showCaret={showCaret}
          />
        </p>
      ) : null}
    </div>
  );
}

function stopComposerWrite(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

export function CampaignEmailContent({
  email,
  revealedCharacters = email.body.length,
  showCaret = false,
}: {
  email: CampaignEmail;
  revealedCharacters?: number;
  showCaret?: boolean;
}) {
  const level = email.presentationLevel;
  const format = EMAIL_PRESENTATION_LEVELS[level];

  if (level <= 1) {
    const visible = email.body.slice(0, revealedCharacters);
    const hidden = email.body.slice(revealedCharacters);
    return (
      <div
        className="typed-copy"
        aria-label={`Email in formato ${format.label}`}
        data-email-presentation={level}
      >
        <span>{visible}</span>
        {showCaret ? <i className="text-caret" /> : null}
        <span className="untyped-copy" aria-hidden="true">{hidden}</span>
      </div>
    );
  }

  return (
    <div
      className={`campaign-email-document campaign-email-level-${level}`}
      aria-label={`Email in formato ${format.label}`}
      data-email-presentation={level}
    >
      {level >= 6 ? (
        <div className="campaign-brand">
          <img src="/email-assets/ludosport-genova.png" alt="LudoSport Genova" />
        </div>
      ) : null}

      <header className="campaign-title">
        {level >= 6 ? <span>ORDINE DELLE ONDE · GENOVA</span> : null}
        <h1>{email.subject}</h1>
      </header>

      <section className="campaign-card campaign-main-card">
        {level >= 6 ? (
          <strong className="campaign-section-label">UNISCITI A UNA LEZIONE DI LIGHT SABER COMBAT</strong>
        ) : null}

        {level >= 6 ? (
          <img
            className="campaign-hero-image"
            src="/email-assets/lezione-prova.jpg"
            alt="Lezione di Light Saber Combat dell'Ordine delle Onde"
          />
        ) : null}

        <EmailCopy
          body={email.body}
          revealedCharacters={revealedCharacters}
          showCaret={showCaret}
        />

        {level >= 4 ? (
          <div className="campaign-actions">
            <a href={`mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(email.subject)}`} onClick={stopComposerWrite}>
              Prenota una prova
            </a>
            <a href={MAP_URL} target="_blank" rel="noreferrer" onClick={stopComposerWrite}>
              Apri la palestra sulla mappa
            </a>
          </div>
        ) : null}

        {level >= 6 ? (
          <dl className="campaign-details">
            <div><dt>Quando</dt><dd>Alla prossima lezione disponibile</dd></div>
            <div><dt>Durata</dt><dd>Due ore, dalle 20:30 alle 22:45</dd></div>
            <div><dt>Dove</dt><dd>PalaGym Assarotti, Genova</dd></div>
            <div><dt>Cosa portare</dt><dd>Abiti comodi e scarpe da palestra</dd></div>
          </dl>
        ) : null}
      </section>

      {level >= 6 ? (
        <>
          <section className="campaign-card campaign-contact-card">
            <strong className="campaign-section-label">COME PRENOTARE</strong>
            <p>Contattaci anche il giorno stesso: risponderemo a ogni dubbio e ti aiuteremo a scegliere la data migliore.</p>
            <div className="campaign-contact-list">
              <a href={`mailto:${BOOKING_EMAIL}`} onClick={stopComposerWrite}>{BOOKING_EMAIL}</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onClick={stopComposerWrite}>@ludosport.onde</a>
              <span>320 0809640 · Andrea Ungaro</span>
            </div>
          </section>

          <section className="campaign-card campaign-video-card">
            <strong className="campaign-section-label">DA VEDERE</strong>
            <p>Uno dei combattimenti più rappresentativi del nostro sport.</p>
            <a href={VIDEO_URL} target="_blank" rel="noreferrer" onClick={stopComposerWrite}>
              <span className="campaign-video-frame">
                <img src="/email-assets/video-demo.jpg" alt="Finale del Torneo Nazionale LudoSport 2022" />
                <i aria-hidden="true">▶</i>
              </span>
              <small>Finale del Torneo Nazionale LudoSport 2022 · Guarda su YouTube</small>
            </a>
          </section>
        </>
      ) : null}

      {level >= 6 ? (
        <footer className="campaign-footer">
          <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde" />
          {level >= 7 ? (
            <p>Ricevi questo messaggio perché hai dato disponibilità a ricevere informazioni sui corsi LudoSport a Genova. Questa è una campagna simulata all'interno del gioco.</p>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
