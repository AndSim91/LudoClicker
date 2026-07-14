import { MAIL_SENDER_ADDRESS } from "../../content/emailAddresses";
import { selectActiveContact, selectActiveEmail, selectEmailProgress } from "../../game/selectors";
import type { GameState } from "../../game/types";
import { Icon } from "../common/Icon";

export function Composer({ state, onWrite }: { state: GameState; onWrite: () => void }) {
  const email = selectActiveEmail(state);
  const contact = selectActiveContact(state);
  if (!email || !contact) {
    return (
      <main className="empty-composer">
        <Icon name="mail" />
        <h1>Nessuna bozza disponibile</h1>
        <p>Hai utilizzato tutti i contatti del tutorial. Le prossime fonti si attiveranno dal Calendario.</p>
      </main>
    );
  }
  const visible = email.body.slice(0, email.revealedCharacters);
  const hidden = email.body.slice(email.revealedCharacters);
  const progress = selectEmailProgress(email);
  return (
    <main className="composer">
      <div className="composer-tabs"><button className="active" type="button">Messaggio</button><button type="button">Inserisci</button><button type="button">Opzioni</button><button type="button">Formato testo</button><span /><button type="button" disabled><Icon name="send" /> Invia</button><button type="button" disabled><Icon name="attach" /> Allega</button></div>
      <div className="format-bar"><select aria-label="Tipo di carattere" defaultValue="Segoe UI"><option>Segoe UI</option></select><select aria-label="Dimensione carattere" defaultValue="11"><option>11</option></select><b>G</b><i>I</i><u>S</u><span>☷</span><span>≡</span><span>↗</span></div>
      <div className="mail-fields"><div><span>Da:</span><strong>{MAIL_SENDER_ADDRESS}</strong></div><div><span>A:</span><mark className={`rarity-address rarity-${contact.rarity}`}>{contact.firstName} {contact.lastName} &lt;{contact.email}&gt;</mark></div><div><span>Oggetto:</span><strong>{email.subject}</strong></div></div>
      <div
        className="mail-body"
        role="button"
        tabIndex={0}
        aria-label="Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere."
        onClick={onWrite}
      >
        <div className="typed-copy"><span>{visible}</span>{email.status === "writing" ? <i className="text-caret" /> : null}<span className="untyped-copy" aria-hidden="true">{hidden}</span></div>
        {email.status === "sending" ? <div className="sending-toast"><Icon name="send" /> Invio in corso…</div> : null}
      </div>
      <div className="composer-status">
        <div className="progress-dots" aria-label={`Completamento ${progress}%`}><i className={progress > 0 ? "on" : ""}/><i className={progress >= 34 ? "on" : ""}/><i className={progress >= 67 ? "on" : ""}/></div>
        <span>Bozza salvata</span><em>{email.status === "sending" ? "Invio in corso…" : "Digitazione in corso…"}</em><b>{email.revealedCharacters} / {email.body.length} caratteri · {state.player.writingPower} per input</b>
      </div>
    </main>
  );
}
