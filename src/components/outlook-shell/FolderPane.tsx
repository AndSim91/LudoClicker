import { selectContactsAwaitingEmail, selectUnreadMessages } from "../../game/selectors";
import type { GameState } from "../../game/types";
import { Icon } from "../common/Icon";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

export type MailFolder = "inbox" | "sent";

export function FolderPane({
  state,
  folder,
  onSelectFolder,
  onOpenComposer,
  onOpenMembers,
}: {
  state: GameState;
  folder: MailFolder;
  onSelectFolder: (folder: MailFolder) => void;
  onOpenComposer: () => void;
  onOpenMembers: () => void;
}) {
  const unread = selectUnreadMessages(state);
  const sent = state.statistics.emailsSent;
  const contactsAwaitingEmail = selectContactsAwaitingEmail(state);
  const activeMembers = state.school.activeMembers;
  const euros = state.school.euros;
  return (
    <aside className="folder-pane">
      <div className="pane-heading"><strong>Cartelle</strong><Icon name="plus" /><Icon name="search" /></div>
      <button type="button" aria-label={`Posta in arrivo ${formatExactNumber(unread)}`} className={folder === "inbox" ? "folder active" : "folder"} onClick={() => onSelectFolder("inbox")}><Icon name="mail" /><span>Posta in arrivo</span><b title={formatExactNumber(unread)}>{formatCompactNumber(unread)}</b></button>
      <button type="button" aria-label={`Posta inviata ${formatExactNumber(sent)}`} className={folder === "sent" ? "folder active" : "folder"} onClick={() => onSelectFolder("sent")}><Icon name="send" /><span>Posta inviata</span><b title={formatExactNumber(sent)}>{sent ? formatCompactNumber(sent) : ""}</b></button>
      <div className="folder-rule" />
      <button type="button" className="resource-row resource-link" onClick={onOpenComposer}><Icon name="contact" /><span>Contatti</span><b title={formatExactNumber(contactsAwaitingEmail)}>{formatCompactNumber(contactsAwaitingEmail)}</b></button>
      <button type="button" className="resource-row resource-link" onClick={onOpenMembers}><Icon name="people" /><span>Iscritti</span><b title={formatExactNumber(activeMembers)}>{formatCompactNumber(activeMembers)}</b></button>
      <div className="resource-row"><Icon name="coin" /><span>Disponibilità</span><b title={formatExactCurrency(euros)}>{formatCompactCurrency(euros)}</b></div>
      <div className="folder-note">{state.school.name}</div>
    </aside>
  );
}
