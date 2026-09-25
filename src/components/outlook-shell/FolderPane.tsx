import { selectContactsAwaitingEmail, selectUnreadMessages } from "../../game/selectors";
import { useGameSelector, useGameStateSlices } from "../../game/GameStateContext";
import { getEstimatedMonthlyGadgetIncome } from "../../game/gadgetIncomeEstimate";
import { getMonthlyMemberFees } from "../../game/membershipEconomy";
import { getMonthlySocialIncome } from "../../game/social";
import type { GameState } from "../../game/types";
import { Icon } from "../common/Icon";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

export type MailFolder = "inbox" | "sent";

// Same total as the title bar's "Entrate mensili".
function selectMonthlyIncome(state: GameState): number {
  return getMonthlyMemberFees(state) + getMonthlySocialIncome(state) + getEstimatedMonthlyGadgetIncome(state);
}

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
  const sent = state.statistics.emailsSent;
  const contactsAwaitingEmail = selectContactsAwaitingEmail(state);
  const activeMembers = state.school.activeMembers;
  const euros = state.school.euros;
  const monthlyIncome = useGameSelector(selectMonthlyIncome, stateOverride);
  return (
    <aside className="folder-pane">
      <div className="pane-heading"><strong>Cartelle</strong><Icon name="plus" /><Icon name="search" /></div>
      <button type="button" aria-label={`Posta in arrivo ${formatExactNumber(unread)}`} className={folder === "inbox" ? "folder active" : "folder"} onClick={() => onSelectFolder("inbox")}><Icon name="mail" /><span>Posta in arrivo</span><b title={formatExactNumber(unread)}>{formatCompactNumber(unread)}</b></button>
      <button type="button" aria-label={`Posta inviata ${formatExactNumber(sent)}`} className={folder === "sent" ? "folder active" : "folder"} onClick={() => onSelectFolder("sent")}><Icon name="send" /><span>Posta inviata</span><b title={formatExactNumber(sent)}>{sent ? formatCompactNumber(sent) : ""}</b></button>
      <div className="folder-rule" />
      <button type="button" className="resource-row resource-link" onClick={onOpenComposer}><Icon name="contact" /><span className="resource-copy"><small>Contatti</small><b title={formatExactNumber(contactsAwaitingEmail)}>{formatCompactNumber(contactsAwaitingEmail)}</b></span></button>
      <button type="button" className="resource-row resource-link" onClick={onOpenMembers}><Icon name="people" /><span className="resource-copy"><small>Scuola</small><b title={formatExactNumber(activeMembers)}>{formatCompactNumber(activeMembers)}</b></span></button>
      <div className="resource-row"><Icon name="coin" /><span className="resource-copy"><small>Disponibilità</small><b title={formatExactCurrency(euros)}>{formatCompactCurrency(euros)}</b>{monthlyIncome > 0 ? <em className="resource-delta" title={`Entrate mensili: ${formatExactCurrency(monthlyIncome)}`}>+{formatCompactCurrency(monthlyIncome)} al mese</em> : null}</span></div>
      <div className="folder-note">{state.school.name}</div>
    </aside>
  );
}
