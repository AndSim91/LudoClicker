import type { CampaignEmail } from "../../../game/types";

export function EmailStructurePreview({
  level,
  progress,
}: {
  level: CampaignEmail["presentationLevel"];
  progress: number;
}) {
  const hasFrame = progress >= 12;
  const hasHeading = progress >= 30;
  const hasBody = progress >= 56;
  const hasSignature = progress >= 80;

  return (
    <div
      className={`email-structure-preview email-structure-level-${level}`}
      role="img"
      aria-label="Struttura della mail in costruzione"
    >
      <div className="email-structure-canvas" aria-hidden="true">
        {hasFrame ? (
          <div className="email-structure-frame">
            <span
              className="email-structure-accent"
              style={{ width: `${Math.min(100, progress * 2)}%` }}
            />
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
    </div>
  );
}
