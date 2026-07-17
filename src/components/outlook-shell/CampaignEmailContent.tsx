import {
  getEmailBuildLength,
  getEmailStructureProgress,
  getEmailTextRevealCount,
} from "../../content/emailBuild";
import { EMAIL_PRESENTATION_LEVELS } from "../../content/emailPresentation";
import type { CampaignEmail } from "../../game/types";
import { LevelZeroProofreadText } from "./LevelZeroProofreadText";
import { EmailStructurePreview } from "./campaign-email/EmailStructurePreview";
import { FinalEmailDocument } from "./campaign-email/FinalEmailDocument";

export function CampaignEmailContent({
  email,
  revealedCharacters = getEmailBuildLength(email),
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

  if (textRevealedCharacters === 0) {
    return <EmailStructurePreview level={level} progress={structureProgress} />;
  }

  if (level >= 3) {
    return (
      <FinalEmailDocument
        email={email}
        revealedCharacters={textRevealedCharacters}
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
