import type { InboxMessage } from "../../game/types";
import { Icon } from "../common/Icon";

export function MessageDetail({ message }: { message: InboxMessage }) {
  const isWelcome = message.subject === "Benvenuto! Inizia da qui";
  return (
    <main className="message-detail">
      <div className="detail-toolbar"><button type="button" disabled>Rispondi</button><button type="button" disabled>Inoltra</button><button type="button" disabled><Icon name="archive" /> Archivia</button></div>
      <div className="detail-heading"><div className="sender-avatar">OO</div><div><h1>{message.subject}{(message.stackCount ?? 1) > 1 ? ` (${message.stackCount})` : ""}</h1><strong>{message.sender}</strong><span>A: Ordine delle Onde</span></div><time>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(message.receivedAt)}</time></div>
      <article><p>{message.preview}</p>{isWelcome ? <><p>Per scrivere non devi cercare i tasti giusti: qualunque pressione valida rivela il carattere successivo del messaggio già preparato.</p><p>Seleziona la bozza nell'elenco e inizia a digitare.</p></> : null}</article>
    </main>
  );
}
