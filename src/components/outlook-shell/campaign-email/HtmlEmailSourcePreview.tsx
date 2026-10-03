import { useEffect, useRef } from "react";
import { getEmailBuildSource } from "../../../content/emailBuild";
import type { CampaignEmail } from "../../../game/types";

export function HtmlEmailSourcePreview({
  email,
  revealedCharacters,
  showCaret,
}: {
  email: CampaignEmail;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  const source = getEmailBuildSource(email);
  const visibleCharacters = Math.min(source.length, Math.max(0, revealedCharacters));
  const visibleSource = source.slice(0, visibleCharacters);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const codeElement = codeRef.current;
    if (codeElement) codeElement.scrollTop = codeElement.scrollHeight;
  }, [visibleSource]);

  return (
    <div
      className={`email-source-workspace email-source-workspace-level-${email.presentationLevel}`}
      aria-label="Composizione HTML dell'email"
      data-email-source-length={source.length}
      data-email-source-revealed={visibleCharacters}
    >
      <section className="email-source-preview" aria-label="Anteprima dell'email in costruzione">
        <span className="email-source-panel-label">Anteprima email</span>
        <div
          className="email-source-preview-canvas"
          dangerouslySetInnerHTML={{ __html: visibleSource }}
        />
      </section>
      <section className="email-source-code-panel" aria-label="Codice HTML in costruzione">
        <span className="email-source-panel-label">Codice HTML</span>
        <pre
          ref={codeRef}
          className="email-source-code"
          aria-label="Codice HTML scritto"
          data-email-source-code-length={visibleCharacters}
        >{visibleSource}{showCaret && visibleCharacters < source.length ? (
            <i className="email-source-code-caret" aria-hidden="true" />
          ) : null}</pre>
      </section>
    </div>
  );
}
