import { MAIL_SENDER_ADDRESS } from "../../content/emailAddresses";
import { selectSentEmailStatus } from "../../game/selectors";
import type { CampaignEmail, GameState } from "../../game/types";
import { formatDateTime } from "../../shared/formatters";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { Icon } from "../common/Icon";
import { CampaignEmailContent } from "./CampaignEmailContent";
import { LevelZeroProofreadText } from "./LevelZeroProofreadText";

export function SentMailDetail({ state, email }: { state: GameState; email: CampaignEmail }) {
  const contact = state.contacts.find((candidate) => candidate.id === email.contactId);
  const status = selectSentEmailStatus(state, email);
  return (
    <main className="sent-mail-detail">
      <div className="detail-toolbar"><button type="button" disabled><Icon name="trash" /> Elimina</button></div>
      <div className="sent-heading"><div><span>Stato della campagna</span><strong className={`campaign-status ${status.toLocaleLowerCase("it-IT").replaceAll(" ", "-")}`}>{status}</strong></div><time>{email.sentAt ? formatDateTime(email.sentAt) : ""}</time></div>
      <div className="sent-fields"><div><span>Da:</span><strong>{MAIL_SENDER_ADDRESS}</strong></div><div><span>A:</span><strong className={contact ? `rarity-address ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}` : undefined}>{contact?.firstName} {contact?.lastName} &lt;{contact?.email}&gt;</strong></div><div><span>Oggetto:</span><strong>{email.presentationLevel === 0 ? <LevelZeroProofreadText text={email.subject} /> : email.subject}</strong></div></div>
      <article><CampaignEmailContent email={email} /></article>
    </main>
  );
}
