import type { ReactNode } from "react";
import { getNextTournamentLevel } from "../../content/tournaments";
import { getGameMonthName } from "../../game/calendar";
import type {
  ReptileTournamentResult,
  TournamentParticipant,
  TournamentPodiumEntry,
  TournamentResult,
} from "../../game/types";
import { formatVote } from "../../shared/formatters";
import { OrderPennant } from "./OrderPennant";
import { reptileTeamLabel } from "./reptileUi";
import type { YearEntry } from "./schoolYearTournaments";
import { TournamentScene } from "./TournamentScene";
import { knockoutStageLabel, participantName } from "./tournamentPresentation";

const STAGE_DEPTH: Record<string, number> = {
  group: 0, round64: 1, round32: 2, round16: 3, quarterfinal: 4, semifinal: 5, bronze: 5, final: 6,
};

function qualificationDestination(result: TournamentResult): string {
  const next = getNextTournamentLevel(result.level);
  if (next === "academy") return "all'Accademico Alpha";
  if (next === "national") return "al Nazionale";
  if (next === "champions") return "alla Champion's Arena";
  return "";
}

/** «2° Arena», «ai Quarti», «fuori nei gironi»: how far the school went. */
function ourBest(result: TournamentResult, byId: ReadonlyMap<string, TournamentParticipant>): string {
  const podium = (entries: readonly TournamentPodiumEntry[], label: string) => {
    const best = entries.find((entry) => byId.get(entry.participantId)?.ownedContactId);
    return best ? `${best.position}° ${label}` : undefined;
  };
  const places = [podium(result.arenaPodium, "Arena"), podium(result.stylePodium, "Stile")].filter(Boolean);
  if (places.length) return places.join(", ");
  let depth = -1;
  let stage = "";
  for (const match of result.matches) {
    const owned = byId.get(match.participantAId)?.ownedContactId || byId.get(match.participantBId)?.ownedContactId;
    if (owned && (STAGE_DEPTH[match.stage] ?? 0) > depth) {
      depth = STAGE_DEPTH[match.stage] ?? 0;
      stage = match.stage;
    }
  }
  if (depth < 0) return "nessun nostro atleta in gara";
  if (depth === 0) return "fuori nei gironi";
  const name = (knockoutStageLabel[stage as keyof typeof knockoutStageLabel] ?? "").toLowerCase();
  const article = stage === "semifinal" ? "alle" : /^[aeiou]/.test(name) ? "agli" : "ai";
  return `fino ${article} ${name}`;
}

function Podium({
  title,
  entries,
  byId,
}: {
  title: string;
  entries: readonly TournamentPodiumEntry[];
  byId: ReadonlyMap<string, TournamentParticipant>;
}) {
  return (
    <div>
      <h3>{title}</h3>
      {entries.map((entry) => {
        const participant = byId.get(entry.participantId);
        return (
          <p key={`${entry.discipline}-${entry.position}`} className={participant?.ownedContactId ? "is-owned" : undefined}>
            <span className={`tyear-medal is-${entry.position}`}>{entry.position}</span>
            <span className="tyear-pen">{participant ? <OrderPennant owner={participant} /> : null}</span>
            <span className="tyear-name">{participantName(participant)}</span>
            <small>{entry.discipline === "style" ? formatVote(entry.score) : ""}</small>
          </p>
        );
      })}
    </div>
  );
}

function ResultBody({ result }: { result: TournamentResult }) {
  const byId = new Map(result.participants.map((participant) => [participant.id, participant]));
  const final = result.matches.find((match) => match.stage === "final");
  const a = final ? byId.get(final.participantAId) : undefined;
  const b = final ? byId.get(final.participantBId) : undefined;
  const destination = qualificationDestination(result);
  const tag = (participant: TournamentParticipant | undefined, side: "a" | "b") => participant ? (
    <span className={`tsc-tag is-${side}${final?.winnerId === participant.id ? " is-winner" : ""}${participant.ownedContactId ? " is-owned" : ""}`}>
      <OrderPennant owner={participant} />
      <b>{participantName(participant)}</b>
    </span>
  ) : null;
  return (
    <>
      <div className="tsc-scene">
        <TournamentScene level={result.level} result={result} />
        {final ? (
          <span className="tsc-plate" aria-label={`Finale ${final.arenaScoreA} a ${final.arenaScoreB}`}>
            {final.arenaScoreA} – {final.arenaScoreB}
            <small>Finale</small>
          </span>
        ) : null}
        {tag(a, "a")}
        {tag(b, "b")}
      </div>
      <div className="tyear-podiums">
        <Podium title="Podio Arena" entries={result.arenaPodium} byId={byId} />
        <Podium title="Podio Stile" entries={result.stylePodium} byId={byId} />
      </div>
      <footer className="tyear-esito">
        <span>
          {result.participants.length} partecipanti · <b>{ourBest(result, byId)}</b>
        </span>
        {destination ? <span>{result.qualifiers.length} qualificati {destination}</span> : null}
      </footer>
    </>
  );
}

function ReptileBody({ result, title }: { result: ReptileTournamentResult; title: string }) {
  const teams = new Map(result.teams.map((team) => [team.id, team]));
  const final = result.matches.find((match) => match.phase === "final");
  const a = final ? teams.get(final.teamAId) : undefined;
  const b = final ? teams.get(final.teamBId) : undefined;
  const homePlace = result.podiumTeamIds.findIndex((id) => teams.get(id)?.home);
  const tag = (team: typeof a, side: "a" | "b") => team ? (
    <span className={`tsc-tag is-${side}${final?.winnerId === team.id ? " is-winner" : ""}${team.home ? " is-owned" : ""}`}>
      <OrderPennant owner={team} />
      <b>{reptileTeamLabel(team)}</b>
    </span>
  ) : null;
  return (
    <>
      <div className="tsc-scene is-reptile">
        <TournamentScene level="reptile" title={title} />
        {final ? (
          <span className="tsc-plate" aria-label={`Finale ${final.scoreA} a ${final.scoreB}`}>
            {final.scoreA} – {final.scoreB}
            <small>Finale</small>
          </span>
        ) : null}
        {tag(a, "a")}
        {tag(b, "b")}
      </div>
      <div className="tyear-podiums is-single">
        <div>
          <h3>Classifica</h3>
          {result.podiumTeamIds.slice(0, 3).map((id, index) => {
            const team = teams.get(id);
            return (
              <p key={id} className={team?.home ? "is-owned" : undefined}>
                <span className={`tyear-medal is-${index + 1}`}>{index + 1}</span>
                <span className="tyear-pen">{team ? <OrderPennant owner={team} /> : null}</span>
                <span className="tyear-name">{reptileTeamLabel(team)}</span>
                <small>{team?.schoolName}</small>
              </p>
            );
          })}
        </div>
      </div>
      <footer className="tyear-esito">
        <span>
          {result.teamCount} coppie · <b>{homePlace >= 0 && homePlace < 3 ? `nostra coppia ${homePlace + 1}ª` : "nessuna nostra coppia sul podio"}</b>
        </span>
        <span>Resa {result.resa} · Fama {result.economy.fameDelta >= 0 ? "+" : ""}{result.economy.fameDelta}</span>
      </footer>
    </>
  );
}

export function TournamentYearPanel({
  entry,
  previous,
  label,
  reptileTitle,
  nextBody,
  countdown,
  onOpenResults,
}: {
  entry: YearEntry;
  /** The row belongs to the previous school year (nothing played yet this year). */
  previous: boolean;
  label: string;
  reptileTitle: string;
  /** Delegation of the next tournament, built by the overview. */
  nextBody?: ReactNode;
  /** Time left to the next tournament, already formatted. */
  countdown?: string;
  onOpenResults: (entry: YearEntry) => void;
}) {
  const month = entry.calendarMonth ? getGameMonthName(entry.calendarMonth).toLowerCase() : "Open";
  const level = entry.level;
  let body: ReactNode;
  if (entry.status === "done" && entry.result) body = <ResultBody result={entry.result} />;
  else if (entry.status === "done" && entry.reptileResult) body = <ReptileBody result={entry.reptileResult} title={reptileTitle} />;
  else if (entry.status === "next") {
    body = (
      <>
        <div className="tsc-scene is-short">
          <TournamentScene level={level} fighters={false} title={reptileTitle} />
          <div className="tsc-over">
            <span className="tsc-over-label">L&apos;Arena è pronta tra</span>
            <strong className="tsc-countdown">{countdown ?? "—"}</strong>
          </div>
        </div>
        {nextBody}
      </>
    );
  } else {
    body = (
      <>
        <div className="tsc-scene is-short is-dim">
          <TournamentScene level={level} fighters={false} title={reptileTitle} />
          <div className="tsc-over">
            <b>{entry.status === "out" ? "Si gioca senza di noi" : level === "reptile" ? "In preparazione" : "Arena ancora chiusa"}</b>
          </div>
        </div>
        <p className="tyear-note">
          {entry.status === "out"
            ? "Nessun nostro atleta era qualificato."
            : level === "reptile"
              ? "Organizzato: la preparazione si segue nella pagina Open."
              : "Si apre con i qualificati del torneo precedente."}
        </p>
      </>
    );
  }
  return (
    <section className={`tyear-panel${previous ? " is-previous" : ""}`} aria-labelledby="tyear-panel-title" data-tutorial-region="tournament-panel">
      <header className="tyear-panel-head">
        <div>
          <span className={`tyear-eyebrow${previous ? " is-previous" : ""}`}>
            Anno scolastico {entry.schoolYear}{previous ? " · anno precedente" : ""} · {month}
          </span>
          <h2 id="tyear-panel-title">{label}</h2>
        </div>
        {entry.status === "done" ? (
          <button type="button" className="tyear-link" onClick={() => onOpenResults(entry)}>
            Tabellone completo ›
          </button>
        ) : null}
      </header>
      {body}
    </section>
  );
}
