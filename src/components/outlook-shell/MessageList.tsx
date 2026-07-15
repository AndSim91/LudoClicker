import {
  selectActiveContact,
  selectActiveEmail,
  selectSentEmailStatus,
} from "../../game/selectors";
import type { GameState } from "../../game/types";
import type { MailFolder } from "./FolderPane";

function time(value: number) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function statusClass(status: ReturnType<typeof selectSentEmailStatus>) {
  return status.toLocaleLowerCase("it-IT").replaceAll(" ", "-");
}

export function MessageList({
  state,
  folder,
  selectedMessageId,
  selectedSentEmailId,
  onSelectMessage,
  onSelectSentEmail,
}: {
  state: GameState;
  folder: MailFolder;
  selectedMessageId: string | null;
  selectedSentEmailId: string | null;
  onSelectMessage: (id: string | null) => void;
  onSelectSentEmail: (id: string) => void;
}) {
  const activeEmail = selectActiveEmail(state);
  const activeContact = selectActiveContact(state);
  const sentEmails = state.emails
    .filter((email) => email.status !== "writing" && email.status !== "sending")
    .slice()
    .reverse();
  return (
    <section className="message-list" aria-label={folder === "inbox" ? "Posta in arrivo" : "Posta inviata"}>
      <div className="list-tabs">
        <button className="active" type="button">{folder === "inbox" ? "Evidenziata" : "Tutte"}</button>
        {folder === "inbox" ? <button type="button">Altra</button> : null}
        <span>Per data⌄</span>
      </div>
      <div className="date-label">Oggi</div>
      {folder === "inbox" ? (
        <>
          {activeEmail && activeContact ? (
            <button
              type="button"
              className={selectedMessageId === null ? "message-row selected" : "message-row"}
              onClick={() => onSelectMessage(null)}
            >
              <i className="unread-dot" />
              <span className="message-copy"><strong className={`rarity-name rarity-${activeContact.rarity}`}>Bozza per {activeContact.firstName} {activeContact.lastName}</strong><span>{activeEmail.subject}</span><small>{activeEmail.status === "sending" ? "Invio in corso…" : "Digitazione in corso…"}</small></span>
              <time>{time(activeEmail.createdAt)}</time>
            </button>
          ) : null}
          {state.messages.map((message) => (
            <button
              type="button"
              className={`message-row ${message.unread ? "unread" : "read"}${selectedMessageId === message.id ? " selected" : ""}`}
              key={message.id}
              onClick={() => onSelectMessage(message.id)}
            >
              <i className={message.unread ? "unread-dot" : "read-dot"} />
              <span className="message-copy"><strong>{message.sender}</strong><span>{message.subject}{(message.stackCount ?? 1) > 1 ? ` · ${message.stackCount} notifiche` : ""}</span><small>{message.preview}</small></span>
              <time>{time(message.receivedAt)}</time>
            </button>
          ))}
        </>
      ) : sentEmails.length > 0 ? (
        sentEmails.map((email) => {
          const contact = state.contacts.find((candidate) => candidate.id === email.contactId);
          const status = selectSentEmailStatus(state, email);
          return (
            <button
              type="button"
              className={`message-row sent-row${selectedSentEmailId === email.id ? " selected" : ""}`}
              key={email.id}
              onClick={() => onSelectSentEmail(email.id)}
            >
              <i className="read-dot" />
              <span className="message-copy"><strong className={contact ? `rarity-name rarity-${contact.rarity}` : undefined}>{contact?.firstName} {contact?.lastName}</strong><span>{email.subject}</span><small className={`sent-status ${statusClass(status)}`}>{status}</small></span>
              <time>{email.sentAt ? time(email.sentAt) : ""}</time>
            </button>
          );
        })
      ) : (
        <div className="mailbox-empty"><strong>Nessuna mail inviata</strong><span>Le campagne completate appariranno in questa cartella.</span></div>
      )}
    </section>
  );
}
