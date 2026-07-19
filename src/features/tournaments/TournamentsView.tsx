import { memo, useMemo, useState } from "react";
import { TabButton } from "../../components/common/TabButton";
import type { GameState, TournamentResult } from "../../game/types";
import { TournamentAthletes } from "./TournamentAthletes";
import { TournamentOverview } from "./TournamentOverview";
import { TournamentResults } from "./TournamentResults";
import { useVirtualRows } from "../../shared/useVirtualRows";
import {
  levelShortLabel,
  participantName,
  type TournamentTab,
} from "./tournamentPresentation";

const TOURNAMENT_HALL_ROW_HEIGHT = 58;

const TournamentsHall = memo(function TournamentsHall({
  results,
}: {
  results: GameState["tournaments"]["results"];
}) {
  const entries = useMemo(() => [...results].reverse().flatMap((result) => {
    const participantById = new Map(result.participants.map((participant) => [participant.id, participant]));
    return [...result.arenaPodium, ...result.stylePodium].map((entry) => {
      const participant = participantById.get(entry.participantId);
      return {
        id: `${result.id}-${entry.discipline}-${entry.position}`,
        participant,
        position: entry.position,
        detail: `${levelShortLabel[result.level]} · Stagione ${result.season} · ${entry.discipline === "arena" ? "Arena" : `Stile ${entry.score.toFixed(3)}`}`,
      };
    });
  }), [results]);
  const virtualRows = useVirtualRows({
    count: entries.length,
    rowHeight: TOURNAMENT_HALL_ROW_HEIGHT,
  });
  const renderedEntries = entries.slice(virtualRows.startIndex, virtualRows.endIndex);
  return (
    <section className="tournament-hall" aria-label="Albo d'oro">
      <header><h2>Albo d'oro</h2><span>{entries.length} piazzamenti</span></header>
      <div
        className="virtualized-tournament-hall"
        onScroll={virtualRows.onScroll}
      >
        {virtualRows.paddingTop > 0 ? (
          <div className="virtual-list-spacer" style={{ height: virtualRows.paddingTop }} aria-hidden="true" />
        ) : null}
        {renderedEntries.map((entry) => (
          <article key={entry.id} className={entry.participant?.ownedContactId ? "is-owned" : ""}>
            <b>{entry.position}°</b>
            <span className={entry.participant?.rarity === "secret-legendary" ? "secret-legendary" : ""}><strong>{participantName(entry.participant)}</strong><small>{entry.detail}</small></span>
            <em>{entry.participant?.schoolName}</em>
          </article>
        ))}
        {virtualRows.paddingBottom > 0 ? (
          <div className="virtual-list-spacer" style={{ height: virtualRows.paddingBottom }} aria-hidden="true" />
        ) : null}
        {entries.length === 0 ? <p className="empty-tournaments">L'Albo d'Oro è ancora vuoto.</p> : null}
      </div>
    </section>
  );
});

export function TournamentsView({ state }: { state: GameState }) {
  const [tab, setTab] = useState<TournamentTab>("overview");
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [athleteQualificationFilter, setAthleteQualificationFilter] = useState<"all" | "qualified">("all");
  const latestResult = state.tournaments.results.at(-1);
  const selectedResult = state.tournaments.results.find((result) => result.id === selectedResultId) ?? latestResult;
  const openResult = (result: TournamentResult) => {
    setSelectedResultId(result.id);
    setTab("results");
  };
  const openAthletes = (qualifiedOnly: boolean) => {
    setAthleteQualificationFilter(qualifiedOnly ? "qualified" : "all");
    setTab("athletes");
  };

  return (
    <main className="overview-view tournaments-view">
      <header><div><h1>Tornei</h1><p>Segui la stagione, prepara la squadra, conquista la Champion’s Arena</p></div></header>
      <div className="people-tabs tournament-tabs" role="tablist" aria-label="Sezioni tornei">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Panoramica</TabButton>
        <TabButton active={tab === "athletes"} onClick={() => openAthletes(false)}>Atleti</TabButton>
        <TabButton active={tab === "results"} onClick={() => setTab("results")}>Risultati</TabButton>
        <TabButton active={tab === "hall"} onClick={() => setTab("hall")}>Albo d'oro</TabButton>
      </div>

      {tab === "overview" ? <TournamentOverview state={state} onOpenResult={openResult} /> : null}
      {tab === "athletes" ? <TournamentAthletes state={state} initialQualificationFilter={athleteQualificationFilter} /> : null}
      {tab === "results" ? (
        selectedResult ? (
          <TournamentResults
            result={selectedResult}
            results={state.tournaments.results}
            onSelectResult={setSelectedResultId}
            onBackToOverview={() => setTab("overview")}
            onViewQualified={() => openAthletes(true)}
          />
        ) : <p className="empty-tournaments tournament-empty-page">Nessun torneo disputato.</p>
      ) : null}
      {tab === "hall" ? <TournamentsHall results={state.tournaments.results} /> : null}
    </main>
  );
}
