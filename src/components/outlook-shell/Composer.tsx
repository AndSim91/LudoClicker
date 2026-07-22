import { MAIL_SENDER_ADDRESS } from "../../content/emailAddresses";
import { getEmailBuildLength } from "../../content/emailBuild";
import { selectActiveContact, selectActiveEmail } from "../../game/selectors";
import type { GameState } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { Icon } from "../common/Icon";
import { CampaignEmailContent } from "./CampaignEmailContent";
import { LevelZeroProofreadText } from "./LevelZeroProofreadText";

export function Composer({
  state,
  onWrite,
  onAutomaticSendingChange,
}: {
  state: GameState;
  onWrite: () => void;
  onAutomaticSendingChange: (enabled: boolean) => void;
}) {
  const email = selectActiveEmail(state);
  const contact = selectActiveContact(state);
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
  const displayedRevealedCharacters = Math.floor(email.revealedCharacters);
  const displayedWritingPower = Math.round(state.player.writingPower);
  const readyToSend = email.status === "readyToSend";
  const bodyLabel = readyToSend
    ? "Corpo del messaggio. Mail completata. Premi un tasto o fai clic per inviare."
    : "Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere.";
  return (
    <main className="composer">
      <div className="composer-tabs"><button className="active" type="button">Messaggio</button><button type="button">Inserisci</button><button type="button">Opzioni</button><button type="button">Formato testo</button><span /><button type="button" disabled={!readyToSend} onClick={onWrite}><Icon name="send" /> Invia</button><button type="button" disabled><Icon name="attach" /> Allega</button></div>
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
        <div><span>Oggetto:</span><strong>{email.presentationLevel === 0 ? <LevelZeroProofreadText text={email.subject} /> : email.subject}</strong></div>
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
        <CampaignEmailContent
          email={email}
          revealedCharacters={email.revealedCharacters}
          showCaret={email.status === "writing"}
          showHtmlEditor
        />
        {email.status === "sending" ? <div className="sending-toast"><Icon name="send" /> Invio in corso…</div> : null}
      </div>
      <div className="composer-status">
        <label className="composer-auto-send-toggle">
          <span>Invio automatico</span>
          <input
            type="checkbox"
            checked={state.automation.autoSendEmails}
            onChange={(event) => onAutomaticSendingChange(event.currentTarget.checked)}
          />
        </label>
        <em>{email.status === "sending"
          ? "Invio in corso…"
          : readyToSend
            ? "Mail completa · premi un tasto o fai clic per inviare"
            : "Digitazione in corso…"}</em>
        <span className="composer-status-count">{displayedRevealedCharacters} / {buildLength} caratteri · {displayedWritingPower} per input</span>
      </div>
    </main>
  );
}
