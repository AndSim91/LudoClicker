import { MAIL_SENDER_ADDRESS } from "../../content/emailAddresses";
import { getEmailBuildLength } from "../../content/emailBuild";
import { useGameSelector } from "../../game/GameStateContext";
import { getSendingEmails } from "../../game/runtimeIndexes";
import {
  selectActiveContact,
  selectActiveEmail,
  selectRecentEmailsPerMinute,
} from "../../game/selectors";
import type { GameState } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { Icon } from "../common/Icon";
import { WritingFlowMeter } from "./WritingFlowMeter";
import { CampaignEmailContent } from "./CampaignEmailContent";
import { LevelZeroProofreadText } from "./LevelZeroProofreadText";

/** Sopra questo ritmo la bozza smette di animarsi e mostra il conteggio. */
export const EMAIL_RUSH_PER_MINUTE = 30;

export function Composer({
  state: stateOverride,
  onWrite,
  onSend,
  onAutomaticSendingChange,
}: {
  state?: GameState;
  onWrite: () => void;
  onSend: () => void;
  onAutomaticSendingChange: (enabled: boolean) => void;
}) {
  const selection = useGameSelector(
    (state) => ({
      email: selectActiveEmail(state),
      contact: selectActiveContact(state),
      writingPower: state.player.writingPower,
      automaticSending: state.automation.autoSendEmails,
      sending: getSendingEmails(state.emails).length > 0,
      rushRate: state.collaborators.some((collaborator) => collaborator.assignment === "writing")
        ? selectRecentEmailsPerMinute(state)
        : 0,
    }),
    stateOverride,
    (left, right) =>
      left.email === right.email &&
      left.contact === right.contact &&
      left.writingPower === right.writingPower &&
      left.automaticSending === right.automaticSending &&
      left.sending === right.sending &&
      left.rushRate === right.rushRate,
  );
  const { email, contact } = selection;
  if (!email || !contact) {
    return (
      <main className="empty-composer">
        <Icon name="mail" />
        <h1>Nessuna bozza disponibile</h1>
        <p>Hai utilizzato tutti i contatti disponibili. Le prossime fonti arrivano dalle attività esterne.</p>
      </main>
    );
  }
  const buildLength = getEmailBuildLength(email);
  const rush = selection.rushRate >= EMAIL_RUSH_PER_MINUTE;
  const displayedRevealedCharacters = Math.floor(email.revealedCharacters);
  const displayedWritingPower = Math.round(selection.writingPower);
  const readyToSend = email.status === "readyToSend";
  const progressPercent = Math.min(100, (email.revealedCharacters / Math.max(1, buildLength)) * 100);
  const bodyLabel = readyToSend
    ? "Corpo del messaggio. Email completata. Premi Invia per spedirla."
    : "Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere.";
  return (
    <main className="composer" data-email-status={email.status}>
      <div className="composer-tabs"><button className="active" type="button">Messaggio</button><button type="button">Inserisci</button><button type="button">Opzioni</button><button type="button">Formato testo</button><span /><button type="button" disabled={!readyToSend} onClick={onSend}><Icon name="send" /> Invia</button><button type="button" disabled><Icon name="attach" /> Allega</button></div>
      <div className="format-bar"><select aria-label="Tipo di carattere" defaultValue="Segoe UI"><option>Segoe UI</option></select><select aria-label="Dimensione carattere" defaultValue="11"><option>11</option></select><b>G</b><i>I</i><u>S</u><span>☷</span><span>≡</span><span>↗</span></div>
      <div
        className="mail-fields"
        data-tutorial-region="composer-header"
        data-tutorial-target="true"
      >
        <div><span>Da:</span><strong>{MAIL_SENDER_ADDRESS}</strong></div>
        <div><span>A:</span><mark
          className={`rarity-address ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}
          data-tutorial-region="composer-recipient"
          data-tutorial-target="true"
        >{contact.firstName} {contact.lastName} &lt;{contact.email}&gt;</mark></div>
        <div><span>Oggetto:</span><strong>{email.presentationLevel === 0 ? <LevelZeroProofreadText text={email.subject} typos={email.typos?.subject} /> : email.subject}</strong></div>
      </div>
      <div
        className="mail-body"
        data-tutorial-region="composer-body"
        data-tutorial-target="true"
        role="button"
        tabIndex={0}
        aria-label={bodyLabel}
        onClick={onWrite}
      >
        {rush ? (
          <div className="composer-rush">
            <Icon name="send" />
            <span>La Redazione sta scrivendo</span>
            <strong>{selection.rushRate.toLocaleString("it-IT")} email/min</strong>
          </div>
        ) : (
          <CampaignEmailContent
            email={email}
            revealedCharacters={email.revealedCharacters}
            showCaret={email.status === "writing"}
            showHtmlEditor
          />
        )}
        {selection.sending && !rush ? <div className="sending-toast"><Icon name="send" /> Invio in corso…</div> : null}
      </div>
      <div className="composer-status">
        {/* Decorative: the exact count stays in the text on the right. */}
        <span className="composer-progress" aria-hidden="true" style={{ width: `${progressPercent}%` }} />
        <label className="composer-auto-send-toggle">
          <span>Invio automatico</span>
          <input
            type="checkbox"
            checked={selection.automaticSending}
            onChange={(event) => onAutomaticSendingChange(event.currentTarget.checked)}
          />
        </label>
        <em>{readyToSend
            ? "Email completa · premi Invia per spedirla"
            : "Digitazione in corso…"}</em>
        <WritingFlowMeter state={stateOverride} />
        <span className="composer-status-count">{displayedRevealedCharacters} / {buildLength} caratteri · {displayedWritingPower} per input</span>
      </div>
    </main>
  );
}
