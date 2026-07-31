import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import type {
  GameState,
  RockPaperScissorsChoice,
  TournamentDiscipline,
  TournamentHallEntry,
  TournamentResult,
  ReptileSectorAssignments,
} from "../../game/types";
import { gameDelayToWallDelay } from "../../game/gameClock";
import { useGameSelector, useGameStateSlices } from "../../game/GameStateContext";
import { ChroniclesView } from "./ChroniclesView";
import {
  CHRONICLES_TOURNAMENT_LOADING_MS,
  ChroniclesTournamentLoading,
} from "./ChroniclesTournamentLoading";
import { TournamentOverview } from "./TournamentOverview";
import { TournamentResults } from "./TournamentResults";
import { useVirtualRows } from "../../shared/useVirtualRows";
import { levelShortLabel, type TournamentTab } from "./tournamentPresentation";
import { ReptileView } from "./ReptileView";

const TOURNAMENT_HALL_ROW_HEIGHT = 150;

type OpenTournamentTab = "reptile" | "chronicles";

type TournamentHallRow = {
  id: string;
  label: string;
  level: string;
  season: number;
  arenaWinner?: string;
  styleWinner?: string;
};

function getTournamentHallRows(hall: readonly TournamentHallEntry[]): TournamentHallRow[] {
  return [...hall].reverse().map((entry) => ({
    id: `${entry.level}-${entry.season}`,
    label: TOURNAMENT_DEFINITIONS[entry.level].label,
    level: levelShortLabel[entry.level],
    season: entry.season,
    arenaWinner: entry.arenaWinner,
    styleWinner: entry.styleWinner,
  }));
}

function TournamentHallDiscipline({
  discipline,
  winner,
}: {
  discipline: TournamentDiscipline;
  winner?: string;
}) {
  const label = discipline === "arena" ? "Arena" : "Stile";
  return (
    <section className={`tournament-hall-discipline is-${discipline}`} aria-label={label}>
      <header>
        <Icon name={discipline === "arena" ? "trophy" : "spark"} />
        <h4>{label}</h4>
      </header>
      {winner ? (
        <div className="tournament-hall-winner">
          <b>1°</b>
          <strong>{winner}</strong>
        </div>
      ) : (
        <p className="tournament-hall-empty-discipline">Nessuna vittoria della scuola</p>
      )}
    </section>
  );
}

const TournamentsHall = memo(function TournamentsHall({
  hall,
}: {
  hall: readonly TournamentHallEntry[];
}) {
  const entries = useMemo(() => getTournamentHallRows(hall), [hall]);
  const winnerCount = entries.reduce(
    (total, entry) => total + Number(Boolean(entry.arenaWinner)) + Number(Boolean(entry.styleWinner)),
    0,
  );
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
          <small>Solo vittorie della scuola</small>
        </div>
        <span>{winnerCount} {winnerCount === 1 ? "vittoria" : "vittorie"}</span>
      </header>
      <div className="virtualized-tournament-hall" onScroll={virtualRows.onScroll}>
        {virtualRows.paddingTop > 0 ? (
          <div
            className="virtual-list-spacer"
            style={{ height: virtualRows.paddingTop }}
            aria-hidden="true"
          />
        ) : null}
        {renderedEntries.map((entry) => (
          <article key={entry.id} className="tournament-hall-tournament">
            <header>
              <div>
                <Icon name="trophy" />
                <div>
                  <h3>{entry.label}</h3>
                  <small>
                    Livello {entry.level} · Stagione {entry.season}
                  </small>
                </div>
              </div>
            </header>
            <div className="tournament-hall-disciplines">
              <TournamentHallDiscipline discipline="arena" winner={entry.arenaWinner} />
              <TournamentHallDiscipline discipline="style" winner={entry.styleWinner} />
            </div>
          </article>
        ))}
        {virtualRows.paddingBottom > 0 ? (
          <div
            className="virtual-list-spacer"
            style={{ height: virtualRows.paddingBottom }}
            aria-hidden="true"
          />
        ) : null}
        {entries.length === 0 ? (
          <p className="empty-tournaments">L'Albo d'Oro è ancora vuoto.</p>
        ) : null}
      </div>
    </section>
  );
});

function selectTournamentContactForms(state: GameState): GameState["contacts"] {
  return state.contacts;
}

function haveSameTournamentContactForms(
  left: GameState["contacts"],
  right: GameState["contacts"],
): boolean {
  return left.length === right.length && left.every((contact, index) =>
    contact.id === right[index].id && contact.forms === right[index].forms
  );
}

const StoredTournamentResults = memo(function StoredTournamentResults({
  state: stateOverride,
  result,
  results,
  onSelectResult,
  onBackToOverview,
  onViewQualified,
  continuationAction,
}: {
  state?: GameState;
  result: TournamentResult;
  results: readonly TournamentResult[];
  onSelectResult: (resultId: string) => void;
  onBackToOverview: () => void;
  onViewQualified: () => void;
  continuationAction?: {
    label: string;
    onClick: () => void;
  };
}) {
  const contacts = useGameSelector(
    selectTournamentContactForms,
    stateOverride,
    haveSameTournamentContactForms,
  );
  const knownFormsByContactId = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact.forms] as const)),
    [contacts],
  );
  return (
    <TournamentResults
      result={result}
      results={results}
      onSelectResult={onSelectResult}
      onBackToOverview={onBackToOverview}
      onViewQualified={onViewQualified}
      knownFormsByContactId={knownFormsByContactId}
      continuationAction={continuationAction}
    />
  );
});

export function TournamentsView({
  state: stateOverride,
  gameSpeed = 1,
  onOpenAthletes = () => undefined,
  onStartChronicles = () => undefined,
  onPlayChroniclesHand = () => undefined,
  onStartReptilePreparation = () => undefined,
  onStartReptileMinigame = () => undefined,
  onCompleteReptileMinigame = () => undefined,
  onSkipReptileMinigame = () => undefined,
  onCancelReptilePreparation = () => undefined,
  onBookReptileVenue = () => undefined,
  onAdvanceReptilePresentation = () => undefined,
  onSkipReptilePresentation = () => undefined,
}: {
  state?: GameState;
  gameSpeed?: number;
  onOpenAthletes?: () => void;
  onStartChronicles?: (contactIds: string[]) => void;
  onPlayChroniclesHand?: (choice: RockPaperScissorsChoice) => void;
  onStartReptilePreparation?: (assignments: ReptileSectorAssignments) => void;
  onStartReptileMinigame?: () => void;
  onCompleteReptileMinigame?: (hits: number, misses: number, outsideClicks: number) => void;
  onSkipReptileMinigame?: () => void;
  onCancelReptilePreparation?: () => void;
  onBookReptileVenue?: () => void;
  onAdvanceReptilePresentation?: () => void;
  onSkipReptilePresentation?: () => void;
}) {
  const state = useGameStateSlices(
    ["tournaments"],
    stateOverride,
  );
  const [tab, setTab] = useState<TournamentTab>("overview");
  const [openTournamentTab, setOpenTournamentTab] = useState<OpenTournamentTab>("reptile");
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [chroniclesLoading, setChroniclesLoading] = useState(false);
  const [showChroniclesResult, setShowChroniclesResult] = useState(false);
  const chroniclesStartTimerRef = useRef<number | undefined>(undefined);
  const onStartChroniclesRef = useRef(onStartChronicles);
  const chroniclesUnlocked = state.tournaments.chronicles.unlocked;
  const chroniclesLoadingMs = gameDelayToWallDelay(
    CHRONICLES_TOURNAMENT_LOADING_MS,
    gameSpeed,
  );
  const blockingReptileFlow = state.tournaments.reptile.activeEdition?.status === "presenting" ||
    state.tournaments.reptile.activeEdition?.minigame.status === "running";
  const visibleTab = blockingReptileFlow ? "open" : tab;
  const visibleOpenTournamentTab = blockingReptileFlow ? "reptile" : openTournamentTab;
  const latestResult = state.tournaments.results.at(-1);
  const selectedResult =
    state.tournaments.results.find((result) => result.id === selectedResultId) ?? latestResult;
  const latestChroniclesResult = [...state.tournaments.results]
    .reverse()
    .find((result) => result.level === "chronicles");
  const openResult = (result: TournamentResult) => {
    setSelectedResultId(result.id);
    setTab("results");
  };
  useEffect(() => {
    onStartChroniclesRef.current = onStartChronicles;
  }, [onStartChronicles]);

  useEffect(
    () => () => {
      if (chroniclesStartTimerRef.current !== undefined) {
        window.clearTimeout(chroniclesStartTimerRef.current);
      }
    },
    [],
  );

  const startChronicles = (contactIds: string[]) => {
    if (chroniclesLoading) return;
    const pendingContactIds = [...contactIds];
    setChroniclesLoading(true);
    chroniclesStartTimerRef.current = window.setTimeout(() => {
      chroniclesStartTimerRef.current = undefined;
      onStartChroniclesRef.current(pendingContactIds);
      setSelectedResultId(undefined);
      setTab("open");
      setOpenTournamentTab("chronicles");
      setShowChroniclesResult(true);
      setChroniclesLoading(false);
    }, chroniclesLoadingMs);
  };

  return (
    <main className="overview-view tournaments-view">
      <header>
        <div>
          <h1>Tornei</h1>
          <p>Segui la stagione, prepara la squadra, conquista la Champion’s Arena</p>
        </div>
      </header>
      <div className="people-tabs tournament-tabs" role="tablist" aria-label="Sezioni tornei">
        <TabButton active={visibleTab === "overview"} onClick={() => setTab("overview")}>
          Panoramica
        </TabButton>
        <TabButton active={visibleTab === "results"} onClick={() => setTab("results")}>
          Risultati
        </TabButton>
        <TabButton active={visibleTab === "hall"} onClick={() => setTab("hall")}>
          Albo d'oro
        </TabButton>
        <TabButton active={visibleTab === "open"} onClick={() => setTab("open")}>
          Open
        </TabButton>
      </div>

      {chroniclesLoading ? (
        <ChroniclesTournamentLoading durationMs={chroniclesLoadingMs} />
      ) : null}
      {!chroniclesLoading && visibleTab === "overview" ? (
        <TournamentOverview state={stateOverride} onOpenResult={openResult} />
      ) : null}
      {!chroniclesLoading && visibleTab === "results" ? (
        selectedResult ? (
          <StoredTournamentResults
            state={stateOverride}
            result={selectedResult}
            results={state.tournaments.results}
            onSelectResult={setSelectedResultId}
            onBackToOverview={() => setTab("overview")}
            onViewQualified={onOpenAthletes}
          />
        ) : (
          <p className="empty-tournaments tournament-empty-page">Nessun torneo disputato.</p>
        )
      ) : null}
      {!chroniclesLoading && visibleTab === "hall" ? (
        <TournamentsHall hall={state.tournaments.hall} />
      ) : null}
      {!chroniclesLoading && visibleTab === "open" ? (
        <section className="open-tournaments" aria-label="Tornei Open">
          <div className="people-tabs open-tournament-tabs" role="tablist" aria-label="Tornei Open">
            <TabButton
              active={visibleOpenTournamentTab === "reptile"}
              onClick={() => setOpenTournamentTab("reptile")}
            >
              Reptile
            </TabButton>
            {chroniclesUnlocked ? (
              <TabButton
                active={visibleOpenTournamentTab === "chronicles"}
                onClick={() => setOpenTournamentTab("chronicles")}
              >
                Chronicles
              </TabButton>
            ) : null}
          </div>

          {visibleOpenTournamentTab === "reptile" ? (
            <ReptileView
              state={stateOverride}
              onStartPreparation={onStartReptilePreparation}
              onStartMinigame={onStartReptileMinigame}
              onCompleteMinigame={onCompleteReptileMinigame}
              onSkipMinigame={onSkipReptileMinigame}
              onCancelPreparation={onCancelReptilePreparation}
              onBookVenue={onBookReptileVenue}
              onAdvancePresentation={onAdvanceReptilePresentation}
              onSkipPresentation={onSkipReptilePresentation}
            />
          ) : showChroniclesResult && latestChroniclesResult ? (
            <StoredTournamentResults
              state={stateOverride}
              result={latestChroniclesResult}
              results={[latestChroniclesResult]}
              onSelectResult={() => undefined}
              onBackToOverview={() => setTab("overview")}
              onViewQualified={onOpenAthletes}
              continuationAction={{
                label:
                  state.tournaments.chronicles.activeChallenge?.tournamentResultId ===
                  latestChroniclesResult.id
                    ? "Sfida Finale"
                    : "Prossimo Torneo",
                onClick: () => setShowChroniclesResult(false),
              }}
            />
          ) : (
            <ChroniclesView
              state={stateOverride}
              onStartTournament={startChronicles}
              onPlayHand={onPlayChroniclesHand}
            />
          )}
        </section>
      ) : null}
    </main>
  );
}
