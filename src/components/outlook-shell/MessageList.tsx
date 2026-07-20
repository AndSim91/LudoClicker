import { useMemo, useState } from "react";
import { getInboxCategory, type InboxCategory } from "../../game/messages";
import {
  selectActiveContact,
  selectActiveEmail,
  type SentEmailStatus,
} from "../../game/selectors";
import type { CampaignEmail, Contact, GameState, InboxMessage } from "../../game/types";
import { formatTime } from "../../shared/formatters";
import { getRarityClassName } from "../../shared/rarityPresentation";
import type { MailFolder } from "./FolderPane";

function time(value: number) {
  return formatTime(value);
}

function statusClass(status: SentEmailStatus) {
  return status.toLocaleLowerCase("it-IT").replaceAll(" ", "-");
}

function getSentEmailStatus(
  contact: Contact | undefined,
  email: CampaignEmail,
): SentEmailStatus {
  if (contact?.status === "enrolled") return "Iscritto";
  if (contact?.status === "lost" || email.status === "lost") return "Perso";
  if (contact?.status === "trialScheduled" || email.status === "trialBooked") {
    return "Prova in palestra";
  }
  return "In attesa";
}

const SENT_EMAILS_PER_PAGE = 75;

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
          {(message.stackCount ?? 1) > 1 ? ` · ${message.stackCount} aggiornamenti` : ""}
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
  const [requestedSentPage, setRequestedSentPage] = useState(0);
  const activeEmail = selectActiveEmail(state);
  const activeContact = selectActiveContact(state);
  const [focusedMessages, otherMessages] = useMemo(() => {
    const focused: InboxMessage[] = [];
    const other: InboxMessage[] = [];
    for (const message of state.messages) {
      (getInboxCategory(message) === "focused" ? focused : other).push(message);
    }
    return [focused, other];
  }, [state.messages]);
  const visibleMessages = inboxCategory === "focused" ? focusedMessages : otherMessages;
  const focusedCount = focusedMessages.length + (activeEmail && activeContact ? 1 : 0);
  const sentEmails = useMemo(() => {
    const result = [] as GameState["emails"];
    for (let index = state.emails.length - 1; index >= 0; index -= 1) {
      const email = state.emails[index];
      if (email.status !== "writing" && email.status !== "sending") result.push(email);
    }
    return result;
  }, [state.emails]);
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const sentPageCount = Math.max(1, Math.ceil(sentEmails.length / SENT_EMAILS_PER_PAGE));
  const sentPage = Math.min(requestedSentPage, sentPageCount - 1);
  const visibleSentEmails = sentEmails.slice(
    sentPage * SENT_EMAILS_PER_PAGE,
    (sentPage + 1) * SENT_EMAILS_PER_PAGE,
  );

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
                <strong className={`rarity-name ${getRarityClassName(activeContact.rarity, Boolean(activeContact.secretLegendaryId))}`}>
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
                  : "Riepiloghi e cronaca vengono raccolti qui senza riempire la posta prioritaria."}
              </span>
            </div>
          ) : null}
        </>
      ) : sentEmails.length > 0 ? (
        <>
        {visibleSentEmails.map((email) => {
          const contact = contactsById.get(email.contactId);
          const status = getSentEmailStatus(contact, email);
          return (
            <button
              type="button"
              className={`message-row sent-row${selectedSentEmailId === email.id ? " selected" : ""}`}
              key={email.id}
              onClick={() => onSelectSentEmail(email.id)}
            >
              <i className="read-dot" />
              <span className="message-copy">
                <strong className={contact ? `rarity-name ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}` : undefined}>
                  {contact?.firstName} {contact?.lastName}
                </strong>
                <span>{email.subject}</span>
                <small className={`sent-status ${statusClass(status)}`}>{status}</small>
              </span>
              <time>{email.sentAt ? time(email.sentAt) : ""}</time>
            </button>
          );
        })}
        {sentPageCount > 1 ? (
          <nav className="list-pagination" aria-label="Pagine posta inviata">
            <button
              type="button"
              disabled={sentPage === 0}
              onClick={() => setRequestedSentPage((current) => Math.max(0, current - 1))}
            >
              Precedente
            </button>
            <span>Pagina {sentPage + 1} di {sentPageCount}</span>
            <button
              type="button"
              disabled={sentPage === sentPageCount - 1}
              onClick={() => setRequestedSentPage((current) => Math.min(sentPageCount - 1, current + 1))}
            >
              Successiva
            </button>
          </nav>
        ) : null}
        </>
      ) : (
        <div className="mailbox-empty">
          <strong>Nessuna mail inviata</strong>
          <span>Le campagne completate appariranno in questa cartella.</span>
        </div>
      )}
    </section>
  );
}
