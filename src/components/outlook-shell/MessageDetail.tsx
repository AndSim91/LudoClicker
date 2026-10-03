import type { InboxMessage, YearDigestCounts } from "../../game/types";
import { DIGEST_LABELS } from "../../game/yearDigest";
import { formatDateTime } from "../../shared/formatters";
import { Icon } from "../common/Icon";

function YearDigest({ counts }: { counts: YearDigestCounts }) {
  return (
    <>
      <dl className="year-digest">
        {(Object.keys(DIGEST_LABELS) as (keyof typeof DIGEST_LABELS)[]).map((key) => (
          <div key={key}>
            <dt>{DIGEST_LABELS[key]}</dt>
            <dd>{key === "members" && counts[key] > 0 ? "+" : ""}{counts[key].toLocaleString("it-IT")}</dd>
            {key === "narrative" && counts.lastNarrative ? <small>ultimo: «{counts.lastNarrative}»</small> : null}
          </div>
        ))}
      </dl>
      <p>Le notifiche di routine non arrivano più una per una: si sommano qui ogni mese. A fine anno scolastico il riepilogo si chiude e passa in Altra.</p>
    </>
  );
}

export function MessageDetail({ message }: { message: InboxMessage }) {
  const isWelcome = message.subject === "Benvenuto! Inizia da qui";
  return (
    <main className="message-detail">
      <div className="detail-toolbar"><button type="button" disabled>Rispondi</button><button type="button" disabled>Inoltra</button><button type="button" disabled><Icon name="archive" /> Archivia</button></div>
      <div className="detail-heading"><div className="sender-avatar">OO</div><div><h1>{message.subject}{(message.stackCount ?? 1) > 1 ? ` (${message.stackCount})` : ""}</h1><strong>{message.sender}</strong><span>A: Ordine delle Onde</span></div><time>{formatDateTime(message.receivedAt)}</time></div>
      <article>{message.digest ? <YearDigest counts={message.digest} /> : <p>{message.preview}</p>}{isWelcome ? <><p>Per scrivere non devi cercare i tasti giusti: qualunque pressione valida rivela il carattere successivo del messaggio già preparato.</p><p>Seleziona la bozza nell'elenco e inizia a digitare.</p></> : null}</article>
    </main>
  );
}
