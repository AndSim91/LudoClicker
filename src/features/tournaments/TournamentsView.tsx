import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import type {
  GameState,
  RockPaperScissorsChoice,
  TournamentDiscipline,
  TournamentParticipant,
  TournamentResult,
  ReptileSectorAssignments,
} from "../../game/types";
import { gameDelayToWallDelay } from "../../game/gameClock";
import { useGameStateSlices } from "../../game/GameStateContext";
import { ChroniclesView } from "./ChroniclesView";
import {
  CHRONICLES_TOURNAMENT_LOADING_MS,
  ChroniclesTournamentLoading,
} from "./ChroniclesTournamentLoading";
import { TournamentOverview } from "./TournamentOverview";
import { TournamentResults } from "./TournamentResults";
import { TournamentParticipantIdentity } from "./TournamentAthleteIdentity";
import { tournamentSchoolDisplayName } from "./tournamentSchoolPresentation";
import { useVirtualRows } from "../../shared/useVirtualRows";
import { levelShortLabel, type TournamentTab } from "./tournamentPresentation";
import { ReptileView } from "./ReptileView";

const TOURNAMENT_HALL_ROW_HEIGHT = 274;

type OpenTournamentTab = "reptile" | "chronicles";

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
  const participantById = new Map(
    result.participants.map((participant) => [participant.id, participant]),
  );
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

function getTournamentHallRows(results: GameState["tournaments"]["results"]): TournamentHallRow[] {
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
              <TournamentParticipantIdentity participant={entry.participant} />
              <small>{entry.metric}</small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tournament-hall-empty-discipline">Nessun vincitore della scuola</p>
      )}
    </section>
  );
}

const TournamentsHall = memo(function TournamentsHall({
  results,
  schoolName,
  schoolCity,
}: {
  results: GameState["tournaments"]["results"];
  schoolName: string;
  schoolCity: string;
}) {
  const entries = useMemo(() => getTournamentHallRows(results), [results]);
  const displaySchoolName = tournamentSchoolDisplayName(schoolName, schoolCity);
  const winnerCount = entries.reduce(
    (total, entry) => total + entry.arena.length + entry.style.length,
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
          <small title={`Città: ${schoolCity}`}>Solo vincitori di {displaySchoolName}</small>
        </div>
        <span>{winnerCount} piazzamenti</span>
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
              <em title={`Città: ${schoolCity}`}>{displaySchoolName}</em>
            </header>
            <div className="tournament-hall-disciplines">
              <TournamentHallDiscipline discipline="arena" entries={entry.arena} />
              <TournamentHallDiscipline discipline="style" entries={entry.style} />
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
    ["collaborators", "contacts", "equipment", "network", "school", "tournaments", "upgrades"],
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
  const knownFormsByContactId = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact.forms] as const)),
    [state.contacts],
  );
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
          <TournamentResults
            result={selectedResult}
            results={state.tournaments.results}
            onSelectResult={setSelectedResultId}
            onBackToOverview={() => setTab("overview")}
            onViewQualified={onOpenAthletes}
            knownFormsByContactId={knownFormsByContactId}
          />
        ) : (
          <p className="empty-tournaments tournament-empty-page">Nessun torneo disputato.</p>
        )
      ) : null}
      {!chroniclesLoading && visibleTab === "hall" ? (
        <TournamentsHall
          results={state.tournaments.results}
          schoolName={state.school.name}
          schoolCity={state.school.city}
        />
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
              state={state}
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
            <TournamentResults
              result={latestChroniclesResult}
              results={[latestChroniclesResult]}
              onSelectResult={() => undefined}
              onBackToOverview={() => setTab("overview")}
              onViewQualified={onOpenAthletes}
              knownFormsByContactId={knownFormsByContactId}
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
