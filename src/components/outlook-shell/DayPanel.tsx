import { useState } from "react";
import { selectUpcomingTrials } from "../../game/selectors";
import type { GameState } from "../../game/types";
import { Icon } from "../common/Icon";

function getContactName(state: GameState, id: string) {
  const contact = state.contacts.find((candidate) => candidate.id === id);
  return contact ? `${contact.firstName} ${contact.lastName}` : "Nuovo contatto";
}

export function DayPanel({ state }: { state: GameState }) {
  const trials = selectUpcomingTrials(state);
  const [today] = useState(() => Date.now());
  return (
    <aside className="day-panel">
      <div className="day-heading"><strong>La mia giornata</strong><Icon name="calendar" /></div>
      <div className="today">{new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(today)}</div>
      {trials.length === 0 ? (
        <div className="day-empty"><Icon name="clock" /><strong>Nessuna prova in calendario</strong><span>Gli appuntamenti confermati compariranno qui.</span></div>
      ) : trials.map((trial) => (
        <div className="appointment" key={trial.id}>
          <time>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(trial.startsAt)}</time>
          <i />
          <div><strong>Lezione di prova</strong><span>{getContactName(state, trial.contactId)}</span><small>Ordine delle Onde</small></div>
        </div>
      ))}
    </aside>
  );
}
