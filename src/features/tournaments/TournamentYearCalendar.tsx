import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getGameMonthName } from "../../game/calendar";
import type { TournamentYearView, YearEntry } from "./schoolYearTournaments";

const STATUS_LABEL: Record<YearEntry["status"], string> = {
  done: "Disputato",
  next: "Prossimo torneo",
  wait: "In attesa",
  out: "Senza di noi",
};

function standardOf(entry: YearEntry): number | undefined {
  if (entry.level === "reptile") return undefined;
  return TOURNAMENT_DEFINITIONS[entry.level].standard || undefined;
}

function Row({
  entry,
  label,
  selected,
  previous,
  onSelect,
}: {
  entry: YearEntry;
  label: string;
  selected: boolean;
  previous: boolean;
  onSelect: (entry: YearEntry) => void;
}) {
  const standard = standardOf(entry);
  const month = entry.calendarMonth ? getGameMonthName(entry.calendarMonth).slice(0, 3) : "";
  const sub = entry.level === "reptile" || entry.level === "chronicles"
    ? "Open · organizzato"
    : entry.level === "school" ? "Ander Games" : undefined;
  return (
    <button
      type="button"
      className={`tyear-row is-${entry.status}${entry.level === "reptile" || entry.level === "chronicles" ? " is-open" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(entry)}
    >
      <time>
        <b>{entry.calendarMonth ? entry.calendarMonth.toString().padStart(2, "0") : "—"}</b>
        <small>{month}</small>
      </time>
      <span className="tyear-row-name">
        {label}
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className={`tyear-row-status is-${entry.status}`}>
        <i aria-hidden="true" />
        {previous && entry.status === "done" ? "Risultati" : STATUS_LABEL[entry.status]}
      </span>
      <span className="tyear-row-standard">
        {standard ? <><small>campo</small><b>{standard}</b></> : <small>{entry.level === "school" ? "interno" : ""}</small>}
      </span>
    </button>
  );
}

/** The tournaments of the school year (and of the previous one while nothing has been played). */
export function TournamentYearCalendar({
  view,
  selectedKey,
  labelOf,
  onSelect,
}: {
  view: TournamentYearView;
  selectedKey: string | undefined;
  labelOf: (entry: YearEntry) => string;
  onSelect: (entry: YearEntry) => void;
}) {
  return (
    <section className="tyear-calendar" aria-labelledby="tyear-calendar-title">
      <header>
        <h2 id="tyear-calendar-title">Anno scolastico {view.schoolYear}</h2>
        <span className="tyear-path" aria-hidden="true">
          {view.entries.map((entry, index) => (
            <span key={entry.key}>
              {index ? <em /> : null}
              <i className={`is-${entry.status}`} />
            </span>
          ))}
        </span>
      </header>
      {view.entries.length === 0 ? <p className="tyear-note">Nessun torneo in programma quest&apos;anno.</p> : null}
      {view.entries.map((entry) => (
        <Row key={entry.key} entry={entry} label={labelOf(entry)} selected={entry.key === selectedKey} previous={false} onSelect={onSelect} />
      ))}
      {view.previous ? (
        <div className="tyear-previous">
          <p className="tyear-previous-head">
            <b>Anno scolastico {view.previous.schoolYear} · anno precedente</b>
            <span>quest&apos;anno non si è ancora giocato</span>
          </p>
          {view.previous.entries.map((entry) => (
            <Row key={entry.key} entry={entry} label={labelOf(entry)} selected={entry.key === selectedKey} previous onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
