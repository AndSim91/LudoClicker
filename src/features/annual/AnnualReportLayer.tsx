import { useMemo, useState, type CSSProperties } from "react";

import { getFormDefinition } from "../../content/forms";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import {
  ANNUAL_SUBJECT_LABELS,
  ANNUAL_SUBJECTS,
  describeAnnualSubjects,
  getAnnualYearData,
  monthLabel,
} from "../../game/annualReport";
import { getCalendarMonth, getGameMonthName } from "../../game/calendar";
import type { AnnualReport, GameState, TournamentLevel } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { AnnualWindow, type AnnualPage } from "./AnnualWindow";
import { CONTACT_SOURCE_LABELS, describeSchoolYear } from "./annualLabels";
import { PagellaPage } from "./PagellaPage";

const TOURNAMENT_MONTHS: Partial<Record<TournamentLevel, string>> = {
  champions: "Novembre",
  school: "Dicembre",
  academy: "Aprile",
  national: "Giugno",
};

const count = (value: number) => Math.round(value).toLocaleString("it-IT");

function YearData({ state, now }: { state: GameState; now: number }) {
  const data = useMemo(() => getAnnualYearData(state, now), [state, now]);
  const texts = describeAnnualSubjects(state, data);
  return (
    <>
      <div className="annual-grades">
        {ANNUAL_SUBJECTS.map((subject) => (
          <div key={subject} className="annual-grade is-plain">
            <span className="area">{ANNUAL_SUBJECT_LABELS[subject]}</span>
            <span className="data">{texts[subject]}</span>
          </div>
        ))}
      </div>
      <p className="annual-note">
        Fino {/^[aeiou]/.test(monthLabel(state.school.currentMonth)) ? "ad" : "a"} {monthLabel(state.school.currentMonth)}. Voti e pianificazione arrivano a inizio luglio.
      </p>
    </>
  );
}

function YearNumbers({ state, now }: { state: GameState; now: number }) {
  const data = useMemo(() => getAnnualYearData(state, now), [state, now]);
  // From the start of the year to August; the running month counts what it has so far.
  const first = data.start.month;
  const length = Math.max(1, 8 - getCalendarMonth(first) + (getCalendarMonth(first) > 8 ? 12 : 0) + 1);
  const recorded = new Map(data.months.map((month) => [month.month, month.enrolled]));
  const last = state.annual?.ledger?.last;
  recorded.set(state.school.currentMonth, Math.max(0, data.now.membersEnrolled - (last?.membersEnrolled ?? data.start.membersEnrolled)));
  const columns = Array.from({ length }, (_, index) => {
    const month = first + index;
    return { month, value: month <= state.school.currentMonth ? recorded.get(month) ?? 0 : undefined };
  });
  const max = Math.max(1, ...columns.map((column) => column.value ?? 0));
  const maxSource = Math.max(1, ...data.sources.map((source) => source.total));
  const style = { "--cols": columns.length } as CSSProperties;
  return (
    <>
      <div className="annual-two">
        <div className="annual-block">
          <h3>Nuovi iscritti mese per mese</h3>
          <div className="annual-columns" style={style}>
            {columns.map((column) => (
              <span key={column.month} title={column.value === undefined ? undefined : `${getGameMonthName(column.month)}: +${column.value}`}>
                {column.value === max && max > 0 ? <b>{column.value}</b> : null}
                <i style={{ height: column.value === undefined ? "2px" : `${(column.value / max) * 100}%`, opacity: column.value === undefined ? 0.25 : 1 }} />
              </span>
            ))}
          </div>
          <div className="annual-xlabels" style={style}>
            {columns.map((column) => <span key={column.month}>{getGameMonthName(column.month).slice(0, 3)}</span>)}
          </div>
        </div>
        <div className="annual-block">
          <h3>Da dove arrivano i Contatti</h3>
          <div className="annual-sources">
            {data.sources.length === 0 ? <p className="annual-note">Ancora nessun Contatto quest'anno.</p> : data.sources.map((source) => (
              <div key={source.source} className="annual-source">
                <span>{CONTACT_SOURCE_LABELS[source.source] ?? source.source}</span>
                <span className="track"><i style={{ width: `${(source.total / maxSource) * 100}%` }} /></span>
                <span className="pct">{Math.round((source.enrolled / Math.max(1, source.total)) * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="annual-note">Barra: Contatti arrivati. A destra: quanti si sono iscritti.</p>
        </div>
      </div>
      <div className="annual-totals">
        <div><b>{count(data.enrolled)}</b><span>nuovi Iscritti</span></div>
        <div><b>{count(data.trials)}</b><span>prove fatte</span></div>
        <div><b>{count(data.events)}</b><span>eventi</span></div>
        <div><b>{formatCurrency(data.earned)}</b><span>guadagnati</span></div>
      </div>
    </>
  );
}

function YearTournaments({ state, now }: { state: GameState; now: number }) {
  const data = useMemo(() => getAnnualYearData(state, now), [state, now]);
  if (data.tournaments.length === 0) return <p className="annual-note">Nessun torneo disputato quest'anno.</p>;
  return (
    <div className="annual-tournaments">
      {data.tournaments.map(({ result, place }) => (
        <div key={result.id} className="annual-tournament">
          <span className="month">{TOURNAMENT_MONTHS[result.level] ?? ""}</span>
          <span className="name">{TOURNAMENT_DEFINITIONS[result.level].label}</span>
          <span className={`annual-pill${place === 1 ? " is-win" : place <= 3 ? " is-podium" : ""}`}>
            {Number.isFinite(place) ? `${place}° posto` : "Fuori classifica"}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlanSummary({ report }: { report: AnnualReport }) {
  const plan = report.plan;
  if (!plan) return <p className="annual-note">Nessun piano confermato.</p>;
  const courses = plan.courses.map((course) =>
    `${course.track === "technician" ? "Corso Tecnici" : "Corso Istruttori"} · ${getFormDefinition(course.formId)?.longName ?? course.formId}${course.count > 1 ? ` ×${course.count}` : ""}`);
  const swords = [plan.repaired ? "Riparazione spade" : "", plan.swordsBought > 0 ? `${count(plan.swordsBought)} spade nuove` : ""].filter(Boolean);
  return (
    <div className="annual-readonly">
      <div><b>SIS</b><span>{courses.length ? courses.join(", ") : "Nessun corso"}</span></div>
      <div><b>Spade</b><span>{swords.length ? swords.join(", ") : "Nessuna spesa"}</span></div>
      <div><b>Speso</b><span>{formatCurrency(plan.spent)}</span></div>
      {plan.borrowed > 0 ? <div><b>Debito</b><span>{formatCurrency(plan.borrowed)}, da restituire in 12 rate</span></div> : null}
    </div>
  );
}

/**
 * «Report annuale» (Andrea, 08/10), from the Consiglio delle Onde: the game
 * pauses; the year so far without grades, or the whole pagella of last year.
 */
export function AnnualReportLayer({
  state,
  now,
  onClose,
  planningToggle,
}: {
  state: GameState;
  now: number;
  onClose: () => void;
  planningToggle?: { enabled: boolean; onChange: (enabled: boolean) => void };
}) {
  const report = state.annual?.report;
  const [year, setYear] = useState<"current" | "previous">("current");
  const showPrevious = year === "previous" && report;
  const pages: AnnualPage[] = showPrevious
    ? [
        { title: "Pagella", render: () => <PagellaPage report={report} /> },
        { title: "Piano", render: () => <PlanSummary report={report} /> },
      ]
    : [
        { title: "Dati", render: () => <YearData state={state} now={now} /> },
        { title: "Numeri", render: () => <YearNumbers state={state} now={now} /> },
        { title: "Tornei", render: () => <YearTournaments state={state} now={now} /> },
      ];
  return (
    <AnnualWindow
      key={year}
      title="Report annuale"
      subtitle={showPrevious ? `Pagella ${describeSchoolYear(report)}` : "Anno in corso, senza voti"}
      pages={pages}
      planningToggle={planningToggle}
      finalLabel="Chiudi e riprendi"
      onFinal={onClose}
      toolbar={report ? (
        <div className="annual-years">
          <button type="button" aria-pressed={year === "current"} onClick={() => setYear("current")}>Anno in corso</button>
          <button type="button" aria-pressed={year === "previous"} onClick={() => setYear("previous")}>Anno precedente · pagella</button>
        </div>
      ) : null}
    />
  );
}
