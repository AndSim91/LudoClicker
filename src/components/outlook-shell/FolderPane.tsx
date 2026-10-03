import { selectContactsAwaitingEmail, selectUnreadMessages } from "../../game/selectors";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { Icon } from "../common/Icon";
import { formatCompactNumber, formatExactNumber } from "./resourceFormatting";

export type MailFolder = "inbox" | "sent";

export function FolderPane({
  state: stateOverride,
  folder,
  onSelectFolder,
  onOpenComposer,
  onOpenMembers,
}: {
  state?: GameState;
  folder: MailFolder;
  onSelectFolder: (folder: MailFolder) => void;
  onOpenComposer: () => void;
  onOpenMembers: () => void;
}) {
  const state = useGameStateSlices(
    ["contacts", "messages", "network", "school", "statistics"],
    stateOverride,
  );
  const unread = selectUnreadMessages(state);
  const contactsAwaitingEmail = selectContactsAwaitingEmail(state);
  const activeMembers = state.school.activeMembers;
  // Fase 8: funds and monthly income live in the title bar only; the sent count was noise.
  return (
    <aside className="folder-pane">
      <div className="pane-heading"><strong>Cartelle</strong><Icon name="plus" /><Icon name="search" /></div>
      <button type="button" aria-label={`Posta in arrivo ${formatExactNumber(unread)}`} className={folder === "inbox" ? "folder active" : "folder"} onClick={() => onSelectFolder("inbox")}><Icon name="mail" /><span>Posta in arrivo</span><b title={formatExactNumber(unread)}>{unread > 0 ? formatCompactNumber(unread) : ""}</b></button>
      <button type="button" className={folder === "sent" ? "folder active" : "folder"} onClick={() => onSelectFolder("sent")}><Icon name="send" /><span>Posta inviata</span><b /></button>
      <div className="folder-rule" />
      <button type="button" className="folder resource-row" aria-label={`Contatti ${formatExactNumber(contactsAwaitingEmail)}`} onClick={onOpenComposer}><Icon name="contact" /><span>Contatti</span><b title={formatExactNumber(contactsAwaitingEmail)}>{formatCompactNumber(contactsAwaitingEmail)}</b></button>
      <button type="button" className="folder resource-row" aria-label={`Iscritti ${formatExactNumber(activeMembers)}`} onClick={onOpenMembers}><Icon name="people" /><span>Iscritti</span><b title={formatExactNumber(activeMembers)}>{formatCompactNumber(activeMembers)}</b></button>
      <div className="folder-note">{state.school.name}</div>
    </aside>
  );
}
