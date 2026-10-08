import { ANNUAL_SUBJECT_LABELS, monthLabel } from "../../game/annualReport";
import type { AnnualGrade, AnnualHighlight, AnnualReport } from "../../game/types";

const GRADE_ORDER: readonly AnnualGrade[] = ["E", "D", "C", "B", "A"];

const HIGHLIGHT_ICONS: Record<"story" | "title" | "first" | "record", string> = {
  story: "M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5z",
  title: "M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm-1 4v1a2 2 0 0 0 1 1.7V7zm11 0v2.7A2 2 0 0 0 18 8V7z",
  first: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21c.6-4.6 3.8-7 8-7s7.4 2.4 8 7z",
  record: "M3 17l5-5 4 4 7-8v4h2V4h-8v2h4l-5 6-4-4-7 7z",
};

function highlightIcon(category: AnnualHighlight["category"]): string {
  if (category === 1) return HIGHLIGHT_ICONS.story;
  if (category === 2) return HIGHLIGHT_ICONS.title;
  if (category === 3 || category === 4) return HIGHLIGHT_ICONS.first;
  return HIGHLIGHT_ICONS.record;
}

/** H1 «Trofeo» (Andrea, 08/10): medal, the event, two mentions. */
export function AnnualHighlightCard({ highlight }: { highlight: AnnualHighlight }) {
  return (
    <div className="annual-highlight" data-tutorial-region="planning-highlight">
      <span className="annual-highlight-medal" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d={highlightIcon(highlight.category)} /></svg>
      </span>
      <div className="annual-highlight-body">
        <span className="annual-highlight-label">
          Highlight annuale{highlight.month ? ` · ${monthLabel(highlight.month)}` : ""}
        </span>
        <span className="annual-highlight-title">{highlight.title}</span>
      </div>
      {highlight.mentions.length > 0 ? (
        <div className="annual-highlight-more">
          {highlight.mentions.map((mention) => <span key={mention}>{mention}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function trend(grade: AnnualGrade, previous: AnnualGrade) {
  const change = GRADE_ORDER.indexOf(grade) - GRADE_ORDER.indexOf(previous);
  if (change > 0) return <span className="annual-trend is-up" aria-label="in salita">▲</span>;
  if (change < 0) return <span className="annual-trend is-down" aria-label="in calo">▼</span>;
  return <span className="annual-trend is-same" aria-label="stabile">●</span>;
}

/** The pagella: six subjects A–E, the year before, the Highlight annuale. No average, no «Ammesso». */
export function PagellaPage({ report }: { report: AnnualReport }) {
  return (
    <>
      <div className="annual-grades" data-tutorial-region="planning-grades">
        {report.grades.map((row) => {
          const previous = report.previousGrades?.[row.subject];
          return (
            <div key={row.subject} className="annual-grade">
              <span className="area">
                {ANNUAL_SUBJECT_LABELS[row.subject]}
                <small>{row.text}</small>
              </span>
              <span className="was">{report.previousGrades ? `anno prima: ${previous ?? "—"}` : ""}</span>
              <span className={`annual-vote is-${row.grade?.toLowerCase() ?? "none"}`} aria-label={row.grade ? `Voto ${row.grade}` : "Senza voto"}>
                {row.grade ?? "—"}
              </span>
              {row.grade && previous ? trend(row.grade, previous) : <span />}
            </div>
          );
        })}
      </div>
      {report.highlight ? <AnnualHighlightCard highlight={report.highlight} /> : null}
    </>
  );
}
