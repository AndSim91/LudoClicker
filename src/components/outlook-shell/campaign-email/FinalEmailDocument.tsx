import {
  buildEmailHtmlSource,
  getFinalEmailTextSections,
  type FinalEmailTextSection,
} from "../../../content/finalEmail";
import { EMAIL_PRESENTATION_LEVELS } from "../../../content/emailPresentation";
import type { CampaignEmail } from "../../../game/types";
import { RevealedText } from "./RevealedText";

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

export function FinalEmailDocument({
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
