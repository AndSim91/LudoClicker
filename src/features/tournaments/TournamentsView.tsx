import { memo, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import type { GameState, RockPaperScissorsChoice, TournamentDiscipline, TournamentParticipant, TournamentResult } from "../../game/types";
import { ChroniclesView } from "./ChroniclesView";
import { TournamentOverview } from "./TournamentOverview";
import { TournamentResults } from "./TournamentResults";
import { useVirtualRows } from "../../shared/useVirtualRows";
import {
  levelShortLabel,
  participantName,
  type TournamentTab,
} from "./tournamentPresentation";

const TOURNAMENT_HALL_ROW_HEIGHT = 274;

type TournamentHallWinner = {
  id: string;
  participant: TournamentParticipant;
  position: 1 | 2 | 3;
  metric: string;
};

type TournamentHallRow = {
  id: string;
  label: string;
  level: string;
  season: number;
  arena: TournamentHallWinner[];
  style: TournamentHallWinner[];
};

function buildTournamentHallDiscipline(
  result: GameState["tournaments"]["results"][number],
  discipline: TournamentDiscipline,
): TournamentHallWinner[] {
  const participantById = new Map(result.participants.map((participant) => [participant.id, participant]));
  const podium = discipline === "arena" ? result.arenaPodium : result.stylePodium;
  return podium
    .map((entry): TournamentHallWinner | undefined => {
      const participant = participantById.get(entry.participantId);
      if (!participant?.ownedContactId) return undefined;
      return {
        id: `${result.id}-${entry.discipline}-${entry.position}`,
        participant,
        position: entry.position,
        metric: discipline === "arena" ? "Arena" : entry.score.toFixed(3),
      };
    })
    .filter((entry): entry is TournamentHallWinner => Boolean(entry));
}

function getTournamentHallRows(
  results: GameState["tournaments"]["results"],
): TournamentHallRow[] {
  return [...results].reverse().map((result) => ({
    id: result.id,
    label: TOURNAMENT_DEFINITIONS[result.level].label,
    level: levelShortLabel[result.level],
    season: result.season,
    arena: buildTournamentHallDiscipline(result, "arena"),
    style: buildTournamentHallDiscipline(result, "style"),
  }));
}

function TournamentHallDiscipline({
  discipline,
  entries,
}: {
  discipline: TournamentDiscipline;
  entries: readonly TournamentHallWinner[];
}) {
  const label = discipline === "arena" ? "Arena" : "Stile";
  return (
    <section className={`tournament-hall-discipline is-${discipline}`} aria-label={label}>
      <header>
        <Icon name={discipline === "arena" ? "trophy" : "spark"} />
        <h4>{label}</h4>
      </header>
      {entries.length > 0 ? (
        <ol className="tournament-hall-podium">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.position === 1 ? "is-first" : ""}>
              <b>{entry.position}°</b>
              <strong>{participantName(entry.participant)}</strong>
              <small>{entry.metric}</small>
            </li>
          ))}
        </ol>
      ) : <p className="tournament-hall-empty-discipline">Nessun vincitore della scuola</p>}
    </section>
  );
}

const TournamentsHall = memo(function TournamentsHall({
  results,
  schoolName,
}: {
  results: GameState["tournaments"]["results"];
  schoolName: string;
}) {
  const entries = useMemo(() => getTournamentHallRows(results), [results]);
  const winnerCount = entries.reduce((total, entry) => total + entry.arena.length + entry.style.length, 0);
  const virtualRows = useVirtualRows({
    count: entries.length,
    rowHeight: TOURNAMENT_HALL_ROW_HEIGHT,
  });
  const renderedEntries = entries.slice(virtualRows.startIndex, virtualRows.endIndex);
  return (
    <section className="tournament-hall" aria-label="Albo d'oro">
      <header>
        <div>
          <h2>Albo d'oro</h2>
          <small>Solo vincitori di {schoolName}</small>
        </div>
        <span>{winnerCount} piazzamenti</span>
      </header>
      <div
        className="virtualized-tournament-hall"
        onScroll={virtualRows.onScroll}
      >
        {virtualRows.paddingTop > 0 ? (
          <div className="virtual-list-spacer" style={{ height: virtualRows.paddingTop }} aria-hidden="true" />
        ) : null}
        {renderedEntries.map((entry) => (
          <article key={entry.id} className="tournament-hall-tournament">
            <header>
              <div>
                <Icon name="trophy" />
                <div>
                  <h3>{entry.label}</h3>
                  <small>Livello {entry.level} · Stagione {entry.season}</small>
                </div>
              </div>
              <em>{schoolName}</em>
            </header>
            <div className="tournament-hall-disciplines">
              <TournamentHallDiscipline discipline="arena" entries={entry.arena} />
              <TournamentHallDiscipline discipline="style" entries={entry.style} />
            </div>
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

export function TournamentsView({
  state,
  onOpenAthletes = () => undefined,
  onStartChronicles = () => undefined,
  onPlayChroniclesHand = () => undefined,
}: {
  state: GameState;
  onOpenAthletes?: () => void;
  onStartChronicles?: (contactIds: string[]) => void;
  onPlayChroniclesHand?: (choice: RockPaperScissorsChoice) => void;
}) {
  const [tab, setTab] = useState<TournamentTab>("overview");
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const chroniclesUnlocked = state.tournaments.chronicles.unlocked;
  const visibleTab = tab === "chronicles" && !chroniclesUnlocked ? "overview" : tab;
  const latestResult = state.tournaments.results.at(-1);
  const selectedResult = state.tournaments.results.find((result) => result.id === selectedResultId) ?? latestResult;
  const knownFormsByContactId = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact.forms] as const)),
    [state.contacts],
  );
  const openResult = (result: TournamentResult) => {
    setSelectedResultId(result.id);
    setTab("results");
  };

  return (
    <main className="overview-view tournaments-view">
      <header><div><h1>Tornei</h1><p>Segui la stagione, prepara la squadra, conquista la Champion’s Arena</p></div></header>
      <div className="people-tabs tournament-tabs" role="tablist" aria-label="Sezioni tornei">
        <TabButton active={visibleTab === "overview"} onClick={() => setTab("overview")}>Panoramica</TabButton>
        <TabButton active={visibleTab === "results"} onClick={() => setTab("results")}>Risultati</TabButton>
        <TabButton active={visibleTab === "hall"} onClick={() => setTab("hall")}>Albo d'oro</TabButton>
        {chroniclesUnlocked ? (
          <TabButton active={visibleTab === "chronicles"} onClick={() => setTab("chronicles")}>Chronicles</TabButton>
        ) : null}
      </div>

      {visibleTab === "overview" ? <TournamentOverview state={state} onOpenResult={openResult} /> : null}
      {visibleTab === "results" ? (
        selectedResult ? (
          <TournamentResults
            result={selectedResult}
            results={state.tournaments.results}
            onSelectResult={setSelectedResultId}
            onBackToOverview={() => setTab("overview")}
            onViewQualified={onOpenAthletes}
            knownFormsByContactId={knownFormsByContactId}
          />
        ) : <p className="empty-tournaments tournament-empty-page">Nessun torneo disputato.</p>
      ) : null}
      {visibleTab === "hall" ? <TournamentsHall results={state.tournaments.results} schoolName={state.school.name} /> : null}
      {visibleTab === "chronicles" && chroniclesUnlocked ? (
        <ChroniclesView
          state={state}
          onStartTournament={onStartChronicles}
          onPlayHand={onPlayChroniclesHand}
        />
      ) : null}
    </main>
  );
}
