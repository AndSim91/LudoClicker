import { useState } from "react";
import { getInboxCategory, type InboxCategory } from "../../game/messages";
import {
  selectActiveContact,
  selectActiveEmail,
  selectSentEmailStatus,
} from "../../game/selectors";
import type { GameState, InboxMessage } from "../../game/types";
import type { MailFolder } from "./FolderPane";

function time(value: number) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function statusClass(status: ReturnType<typeof selectSentEmailStatus>) {
  return status.toLocaleLowerCase("it-IT").replaceAll(" ", "-");
}

function InboxRow({
  message,
  selected,
  onSelect,
}: {
  message: InboxMessage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`message-row ${message.unread ? "unread" : "read"}${selected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <i className={message.unread ? "unread-dot" : "read-dot"} />
      <span className="message-copy">
        <strong>{message.sender}</strong>
        <span>
          {message.subject}
          {(message.stackCount ?? 1) > 1 ? ` · ${message.stackCount} notifiche` : ""}
        </span>
        <small>{message.preview}</small>
      </span>
      <time>{time(message.receivedAt)}</time>
    </button>
  );
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
  const [inboxCategory, setInboxCategory] = useState<InboxCategory>("focused");
  const activeEmail = selectActiveEmail(state);
  const activeContact = selectActiveContact(state);
  const focusedMessages = state.messages.filter(
    (message) => getInboxCategory(message) === "focused",
  );
  const otherMessages = state.messages.filter(
    (message) => getInboxCategory(message) === "other",
  );
  const visibleMessages = inboxCategory === "focused" ? focusedMessages : otherMessages;
  const focusedCount = focusedMessages.length + (activeEmail && activeContact ? 1 : 0);
  const sentEmails = state.emails
    .filter((email) => email.status !== "writing" && email.status !== "sending")
    .slice()
    .reverse();

  const selectInboxCategory = (category: InboxCategory) => {
    setInboxCategory(category);
    onSelectMessage(null);
  };

  return (
    <section
      className="message-list"
      aria-label={folder === "inbox" ? "Posta in arrivo" : "Posta inviata"}
    >
      <div
        className="list-tabs"
        role={folder === "inbox" ? "tablist" : undefined}
        aria-label={folder === "inbox" ? "Priorità posta in arrivo" : undefined}
      >
        {folder === "inbox" ? (
          <>
            <button
              className={inboxCategory === "focused" ? "active" : undefined}
              type="button"
              role="tab"
              aria-selected={inboxCategory === "focused"}
              onClick={() => selectInboxCategory("focused")}
            >
              Evidenziata ({focusedCount})
            </button>
            <button
              className={inboxCategory === "other" ? "active" : undefined}
              type="button"
              role="tab"
              aria-selected={inboxCategory === "other"}
              onClick={() => selectInboxCategory("other")}
            >
              Altra ({otherMessages.length})
            </button>
          </>
        ) : <button className="active" type="button">Tutte</button>}
        <span>{folder === "inbox" ? "Per priorità" : "Per data⌄"}</span>
      </div>
      <div className="date-label">Oggi</div>
      {folder === "inbox" ? (
        <>
          {inboxCategory === "focused" && activeEmail && activeContact ? (
            <button
              type="button"
              className={selectedMessageId === null ? "message-row selected" : "message-row"}
              onClick={() => onSelectMessage(null)}
            >
              <i className="unread-dot" />
              <span className="message-copy">
                <strong className={`rarity-name rarity-${activeContact.rarity}`}>
                  Bozza per {activeContact.firstName} {activeContact.lastName}
                </strong>
                <span>{activeEmail.subject}</span>
                <small>{activeEmail.status === "sending" ? "Invio in corso…" : "Digitazione in corso…"}</small>
              </span>
              <time>{time(activeEmail.createdAt)}</time>
            </button>
          ) : null}
          {visibleMessages.map((message) => (
            <InboxRow
              message={message}
              selected={selectedMessageId === message.id}
              onSelect={() => onSelectMessage(message.id)}
              key={message.id}
            />
          ))}
          {visibleMessages.length === 0 && !(inboxCategory === "focused" && activeEmail && activeContact) ? (
            <div className="mailbox-empty">
              <strong>
                {inboxCategory === "focused"
                  ? "Nessun messaggio prioritario"
                  : "Nessuna notifica secondaria"}
              </strong>
              <span>
                {inboxCategory === "focused"
                  ? "Bozze e aggiornamenti operativi compariranno qui."
                  : "Traguardi, cronaca e riepiloghi compariranno qui."}
              </span>
            </div>
          ) : null}
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
              <span className="message-copy">
                <strong className={contact ? `rarity-name rarity-${contact.rarity}` : undefined}>
                  {contact?.firstName} {contact?.lastName}
                </strong>
                <span>{email.subject}</span>
                <small className={`sent-status ${statusClass(status)}`}>{status}</small>
              </span>
              <time>{email.sentAt ? time(email.sentAt) : ""}</time>
            </button>
          );
        })
      ) : (
        <div className="mailbox-empty">
          <strong>Nessuna mail inviata</strong>
          <span>Le campagne completate appariranno in questa cartella.</span>
        </div>
      )}
    </section>
  );
}
