import type { MouseEvent } from "react";
import {
  buildEmailHtmlSource,
  getFinalEmailTextSections,
  type FinalEmailTextSection,
} from "../../content/finalEmail";
import { getEmailStructureProgress, getEmailTextRevealCount } from "../../content/emailBuild";
import { EMAIL_PRESENTATION_LEVELS } from "../../content/emailPresentation";
import type { CampaignEmail } from "../../game/types";

const ORDER_EMAIL = "genova@ludosport.net";

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
  const caretIsHere =
    showCaret &&
    revealedCharacters >= section.start &&
    revealedCharacters < section.start + section.text.length;

  if (!visible && !caretIsHere) return null;

  return (
    <>
      <span>{visible}</span>
      {caretIsHere ? <i className="text-caret" /> : null}
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
  const greetingIndex = sections.length > 0 ? 0 : -1;

  return (
    <div className="campaign-copy">
      {sections.map((section, index) => {
        const className = index === greetingIndex ? "campaign-greeting" : undefined;
        return (
          <p key={section.start} className={className}>
            <RevealedText
              section={section}
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
          </p>
        );
      })}
    </div>
  );
}

function stopComposerWrite(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function FakeCta({
  children,
  variant = "primary",
}: {
  children: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={`campaign-fake-cta campaign-fake-cta-${variant}`}
      aria-label={`${children} (pulsante dimostrativo, non attivo)`}
      onClick={stopComposerWrite}
    >
      {children}
    </button>
  );
}

function EmailStructurePreview({
  level,
  progress,
}: {
  level: CampaignEmail["presentationLevel"];
  progress: number;
}) {
  const hasFrame = level === 7 || progress >= 12;
  const hasHeading = progress >= 30;
  const hasBody = progress >= 56;
  const hasSignature = progress >= 80;
  const isFinalStage = level === 7;

  return (
    <div
      className={`email-structure-preview email-structure-level-${level}`}
      role="img"
      aria-label="Struttura della mail in costruzione"
    >
      {isFinalStage ? (
        <div className="email-structure-final-canvas" aria-hidden="true">
          {hasFrame ? <div className="email-structure-final-logo" /> : null}
          {hasHeading ? <div className="email-structure-final-title" /> : null}
          {hasBody ? (
            <div className="email-structure-final-main-card">
              <span className="email-structure-final-label" />
              <span className="email-structure-final-image" />
              <span className="email-structure-final-copy" />
              <span className="email-structure-final-copy short" />
            </div>
          ) : null}
          {hasSignature ? (
            <>
              <div className="email-structure-final-card" />
              <div className="email-structure-final-card video" />
              <div className="email-structure-final-footer" />
            </>
          ) : null}
        </div>
      ) : (
        <div className="email-structure-canvas" aria-hidden="true">
          {hasFrame ? (
            <div className="email-structure-frame">
              <span className="email-structure-accent" style={{ width: `${Math.min(100, progress * 2)}%` }} />
            </div>
          ) : null}
          {hasHeading ? (
            <div className="email-structure-heading">
              <span style={{ width: `${Math.min(78, progress)}%` }} />
              <i style={{ width: `${Math.min(42, Math.max(0, progress - 20))}%` }} />
            </div>
          ) : null}
          {hasBody ? (
            <div className="email-structure-body">
              <span style={{ width: `${Math.min(94, progress + 18)}%` }} />
              <span style={{ width: `${Math.min(82, progress + 4)}%` }} />
              <span style={{ width: `${Math.min(88, progress - 2)}%` }} />
              <span style={{ width: `${Math.min(58, Math.max(18, progress - 24))}%` }} />
            </div>
          ) : null}
          {hasSignature ? (
            <div className="email-structure-signature">
              <span />
              <i />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function getVisibleTextLength(section: FinalEmailTextSection, revealedCharacters: number): number {
  return Math.max(0, Math.min(section.text.length, revealedCharacters - section.start));
}

function TypedFinalBlock({
  section,
  className,
  revealedCharacters,
  showCaret,
}: {
  section: FinalEmailTextSection | undefined;
  className?: string;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  if (!section) return null;
  const visibleLength = getVisibleTextLength(section, revealedCharacters);
  const caretIsHere =
    showCaret &&
    revealedCharacters >= section.start &&
    revealedCharacters < section.start + section.text.length;
  if (!visibleLength && !caretIsHere) return null;

  return (
    <p className={className}>
      <RevealedText section={section} revealedCharacters={revealedCharacters} showCaret={showCaret} />
    </p>
  );
}

function TypedFinalList({
  section,
  className,
  revealedCharacters,
  showCaret,
}: {
  section: FinalEmailTextSection | undefined;
  className: string;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  if (!section) return null;
  const lines = section.text.split("\n");
  return (
    <ul className={className}>
      {lines.map((line, index) => {
        const lineStart = section.start + lines
          .slice(0, index)
          .reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
        const lineSection = { ...section, text: line, start: lineStart };
        const visibleLength = getVisibleTextLength(lineSection, revealedCharacters);
        const caretIsHere =
          showCaret &&
          revealedCharacters >= lineSection.start &&
          revealedCharacters < lineSection.start + lineSection.text.length;
        if (!visibleLength && !caretIsHere) return null;
        return (
          <li key={lineSection.start}>
            <RevealedText section={lineSection} revealedCharacters={revealedCharacters} showCaret={showCaret} />
          </li>
        );
      })}
    </ul>
  );
}

function FinalEmailDocument({
  email,
  revealedCharacters,
  showCaret,
}: {
  email: CampaignEmail;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  const sections = getFinalEmailTextSections(email.body, email.presentationLevel);
  const section = (key: FinalEmailTextSection["key"]) => sections.find((candidate) => candidate.key === key);
  const htmlSource = buildEmailHtmlSource({ subject: email.subject, body: email.body });
  const signoff = section("signoff");
  const level = email.presentationLevel;
  const format = EMAIL_PRESENTATION_LEVELS[level];
  const signatureText = section("signature");
  const signoffVisible = Boolean(
    signoff && getVisibleTextLength(signoff, revealedCharacters) >= signoff.text.length,
  );

  return (
    <div
      className={`campaign-email-document campaign-email-final campaign-email-final-stage-${level}`}
      aria-label={level === 7 ? "Email finale in formato HTML" : `Email in formato ${format.label}`}
      data-email-presentation={level}
      data-html-source-length={htmlSource.length}
    >
      <div className="final-email-paper">
        <header className="final-email-header">
          {level >= 3 ? <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde" /> : <span className="final-email-header-placeholder" aria-hidden="true" />}
          <TypedFinalBlock
            section={section("title")}
            className="final-email-title"
            revealedCharacters={revealedCharacters}
            showCaret={showCaret}
          />
        </header>

        <section className="final-email-card final-email-main-card">
          <TypedFinalBlock
            section={section("mainLabel")}
            className="final-email-category"
            revealedCharacters={revealedCharacters}
            showCaret={showCaret}
          />
          {level >= 4 ? (
            <img
              className="final-email-hero"
              src="/email-assets/lezione-prova.jpg"
              alt="Light Saber Combat LudoSport"
            />
          ) : null}
          <div className="final-email-copy">
            <TypedFinalBlock
              section={section("greeting")}
              className="final-email-greeting"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            <TypedFinalBlock
              section={section("intro")}
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            {level >= 3 ? (
              <TypedFinalList
                section={section("details")}
                className="final-email-details"
                revealedCharacters={revealedCharacters}
                showCaret={showCaret}
              />
            ) : null}
            <TypedFinalBlock
              section={section("booking")}
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            {signoffVisible ? (
              <>
                <TypedFinalBlock
                  section={signoff}
                  className="final-email-signoff"
                  revealedCharacters={revealedCharacters}
                  showCaret={showCaret}
                />
                <div className="final-email-signature" aria-label="Firma Ordine delle Onde">
                  <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde" />
                  <TypedFinalBlock
                    section={signatureText}
                    className="final-email-signature-copy"
                    revealedCharacters={revealedCharacters}
                    showCaret={showCaret}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        {level >= 5 ? (
          <section className="final-email-card final-email-contact-card">
            <TypedFinalBlock
              section={section("contactsLabel")}
              className="final-email-category"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            <TypedFinalList
              section={section("contacts")}
              className="final-email-contacts"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
          </section>
        ) : null}

        {level >= 6 ? (
          <section className="final-email-card final-email-video-card">
            <TypedFinalBlock
              section={section("videoLabel")}
              className="final-email-category"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            <TypedFinalBlock
              section={section("videoTitle")}
              className="final-email-video-title"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
            <img
              className="final-email-video-image"
              src="/email-assets/video-demo.jpg"
              alt="Video dimostrativo LudoSport"
            />
            <TypedFinalBlock
              section={section("videoCaption")}
              className="final-email-video-caption"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
          </section>
        ) : null}

        {level >= 7 ? (
          <footer className="final-email-footer">
            <img src="/email-assets/ordine-onde.png" alt="LudoSport Genova" />
            <TypedFinalBlock
              section={section("disclaimer")}
              className="final-email-disclaimer"
              revealedCharacters={revealedCharacters}
              showCaret={showCaret}
            />
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function FormAndWeaponPanel() {
  return (
    <section className="campaign-forms-panel">
      <div className="campaign-panel-heading">
        <span>IL PERCORSO</span>
        <strong>Tre armi, sette Forme</strong>
      </div>
      <div className="campaign-weapon-row">
        <span className="campaign-weapon-icon">Ⅰ</span>
        <div><strong>Lama singola</strong><small>Il punto di partenza più intuitivo.</small></div>
      </div>
      <div className="campaign-weapon-row">
        <span className="campaign-weapon-icon">Ⅱ</span>
        <div><strong>Doppia lama</strong><small>Continuità, ritmo e coordinazione.</small></div>
      </div>
      <div className="campaign-weapon-row">
        <span className="campaign-weapon-icon">Ⅲ</span>
        <div><strong>Staffa</strong><small>Spazio, traiettorie e presenza.</small></div>
      </div>
      <div className="campaign-form-ribbon">
        <b>FORME 01—07</b>
        <span>Difesa · velocità · fluidità · distanza</span>
      </div>
    </section>
  );
}

function ContactPanel() {
  return (
    <section className="campaign-contact-card">
      <div className="campaign-panel-heading">
        <span>PARLIAMONE</span>
        <strong>La curiosità merita una risposta</strong>
      </div>
      <p>Scrivici anche solo per fare una domanda. Ti aiutiamo a scegliere la prima lezione senza trasformare la curiosità in un modulo da 18 pagine.</p>
      <div className="campaign-contact-list">
        <span>{ORDER_EMAIL}</span>
        <span>@ludosport.onde</span>
        <span>320 0809640 · Andrea Ungaro</span>
      </div>
    </section>
  );
}

function VideoPanel() {
  return (
    <section className="campaign-video-card">
      <div className="campaign-panel-heading">
        <span>DA VEDERE</span>
        <strong>Il movimento, prima delle parole</strong>
      </div>
      <button type="button" className="campaign-video-button" onClick={stopComposerWrite} aria-label="Video dimostrativo non attivo">
        <span className="campaign-video-frame">
          <img src="/email-assets/video-demo.jpg" alt="Finale del Torneo Nazionale LudoSport 2022" />
          <i aria-hidden="true">▶</i>
        </span>
        <small>Finale del Torneo Nazionale LudoSport 2022 · anteprima visiva</small>
      </button>
    </section>
  );
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
  const progressEmail = { ...email, revealedCharacters };
  const structureProgress = getEmailStructureProgress(progressEmail);
  const textRevealedCharacters = getEmailTextRevealCount(progressEmail);
  const progress = email.body.length === 0
    ? 0
    : Math.round((revealedCharacters / email.body.length) * 100);
  const signatureStart = email.body.indexOf("Un saluto");
  const signatureEnd = signatureStart + "Un saluto,".length;
  const signatureVisible = level >= 2 && signatureStart >= 0 && textRevealedCharacters >= signatureEnd;
  const ctaVisible = level >= 3 && progress >= 68;
  const formsVisible = level >= 4 && progress >= 42;
  const heroVisible = level >= 6 && progress >= 12;
  const detailsVisible = level >= 6 && progress >= 82;

  if (textRevealedCharacters === 0 && level >= 2) {
    return <EmailStructurePreview level={level} progress={structureProgress} />;
  }

  if (level >= 2) {
    return (
      <FinalEmailDocument
        email={email}
        revealedCharacters={textRevealedCharacters}
        showCaret={showCaret}
      />
    );
  }

  if (level <= 1) {
    const visible = email.body.slice(0, textRevealedCharacters);
    return (
      <div
        className={`typed-copy typed-copy-level-${level}`}
        aria-label={`Email in formato ${format.label}`}
        data-email-presentation={level}
      >
        <div className="typed-copy-kicker">{level === 0 ? "BOZZA NON REVISIONATA" : "TESTO REVISIONATO"}</div>
        <span>{visible}</span>
        {showCaret ? <i className="text-caret" /> : null}
      </div>
    );
  }

  return (
    <div
      className={`campaign-email-document campaign-email-level-${level}`}
      aria-label={`Email in formato ${format.label}`}
      data-email-presentation={level}
    >
          <header className="campaign-title">
            <div className="campaign-title-rule" aria-hidden="true" />
            {level >= 6 ? <span>ORDINE DELLE ONDE · GENOVA</span> : null}
            <h1>{email.subject}</h1>
            {level >= 5 ? <p>Una disciplina che si impara muovendosi.</p> : null}
          </header>

          {heroVisible ? (
            <div className="campaign-hero-wrap">
              <img
                className="campaign-hero-image"
                src="/email-assets/lezione-prova.jpg"
                alt="Lezione di Light Saber Combat dell'Ordine delle Onde"
              />
              <div className="campaign-hero-caption"><span>LIGHT SABER COMBAT</span><strong>La tecnica accende la curiosità.</strong></div>
            </div>
          ) : null}

          <section className="campaign-card campaign-main-card">
            {level >= 6 ? <strong className="campaign-section-label">UNISCITI A UNA LEZIONE DI LIGHT SABER COMBAT</strong> : null}
            <EmailCopy
              body={email.body}
              revealedCharacters={textRevealedCharacters}
              showCaret={showCaret}
            />

            {signatureVisible ? (
              <div className="campaign-order-signature">
                <img src="/email-assets/ordine-onde.png" alt="Ordine delle Onde" />
                <span>Ordine delle Onde · LudoSport Genova</span>
              </div>
            ) : null}

            {ctaVisible ? (
              <div className="campaign-actions">
                <FakeCta>Prenota una prova</FakeCta>
                <FakeCta variant="secondary">Scopri le forme</FakeCta>
              </div>
            ) : null}
          </section>

          {formsVisible ? <FormAndWeaponPanel /> : null}

          {detailsVisible ? (
            <dl className="campaign-details">
              <div><dt>QUANDO</dt><dd>Alla prossima lezione disponibile</dd></div>
              <div><dt>DURATA</dt><dd>Due ore di movimento, dalle 20:30 alle 22:45</dd></div>
              <div><dt>DOVE</dt><dd>PalaGym Assarotti, Genova</dd></div>
              <div><dt>COSA PORTARE</dt><dd>Abiti comodi, scarpe da palestra e curiosità.</dd></div>
            </dl>
          ) : null}

          {level >= 6 && progress >= 74 ? <ContactPanel /> : null}
          {level >= 7 && progress >= 88 ? <VideoPanel /> : null}

          {level >= 6 && progress >= 96 ? (
            <footer className="campaign-footer">
              <img src="/email-assets/ludosport-genova.png" alt="LudoSport Genova" />
              <p>Ricevi questo messaggio perché hai mostrato curiosità per i corsi LudoSport a Genova. Questa è una campagna simulata all'interno del gioco.</p>
            </footer>
          ) : null}
    </div>
  );
}
