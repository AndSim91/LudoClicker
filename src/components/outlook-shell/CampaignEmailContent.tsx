import {
  getEmailBuildLength,
  getEmailTextRevealCount,
} from "../../content/emailBuild";
import { EMAIL_PRESENTATION_LEVELS } from "../../content/emailPresentation";
import type { CampaignEmail } from "../../game/types";
import { LevelZeroProofreadText } from "./LevelZeroProofreadText";
import { FinalEmailDocument } from "./campaign-email/FinalEmailDocument";
import { HtmlEmailSourcePreview } from "./campaign-email/HtmlEmailSourcePreview";

export function CampaignEmailContent({
  email,
  revealedCharacters = getEmailBuildLength(email),
  showCaret = false,
  showHtmlEditor = false,
}: {
  email: CampaignEmail;
  revealedCharacters?: number;
  showCaret?: boolean;
  showHtmlEditor?: boolean;
}) {
  const level = email.presentationLevel;
  const format = EMAIL_PRESENTATION_LEVELS[level];
  const progressEmail = { ...email, revealedCharacters };
  const textRevealedCharacters = getEmailTextRevealCount(progressEmail);

  if (level >= 3 && showHtmlEditor) {
    return (
      <HtmlEmailSourcePreview
        email={email}
        revealedCharacters={revealedCharacters}
        showCaret={showCaret}
      />
    );
  }

  if (level >= 3) {
    return (
      <FinalEmailDocument
        email={email}
        revealedCharacters={email.body.length}
        showCaret={showCaret}
      />
    );
  }

  const visible = email.body.slice(0, textRevealedCharacters);
  return (
    <div
      className={`typed-copy typed-copy-level-${level}`}
      aria-label={`Email in formato ${format.label}`}
      data-email-presentation={level}
    >
      {level === 0 ? (
        <LevelZeroProofreadText
          text={email.body}
          typos={email.typos?.body}
          revealedCharacters={textRevealedCharacters}
          showCaret={showCaret}
        />
      ) : (
        <>
          <span>{visible}</span>
          {showCaret ? <i className="text-caret" /> : null}
        </>
      )}
    </div>
  );
}
