import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import type {
  GameState,
  RockPaperScissorsChoice,
  TournamentResult,
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
import { type TournamentTab } from "./tournamentPresentation";
import { ReptileRecapPanel, ReptileView } from "./ReptileView";
import { getReptileTournamentName } from "../../game/reptileUnlock";
import { getGameMonthName } from "../../game/calendar";
import {
  YEAR_ENTRY_LABEL,
  YEAR_ENTRY_SHORT,
  findEntry,
  getDefaultEntry,
  getPlayedEntries,
  getTournamentYearView,
  type TournamentYearView,
  type YearEntry,
} from "./schoolYearTournaments";
import { TournamentScene } from "./TournamentScene";
import { OrderPennant } from "./OrderPennant";
import { participantName } from "./tournamentPresentation";

type OpenTournamentTab = "reptile" | "chronicles";

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
  banner,
}: {
  state?: GameState;
  banner?: ReactNode;
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
      banner={banner}
    />
  );
});

/** Banner of Risultati: the hall of the tournament with its name, champion and outcome. */
function ResultsBanner({ entry, view, label, reptileTitle }: { entry: YearEntry; view: TournamentYearView; label: string; reptileTitle: string }) {
  const previous = Boolean(view.previous?.entries.includes(entry));
  const month = entry.calendarMonth ? getGameMonthName(entry.calendarMonth).toLowerCase() : "Open";
  const result = entry.result;
  const champion = result
    ? result.participants.find((participant) => participant.id === result.arenaRanking[0])
    : undefined;
  const reptile = entry.reptileResult;
  const reptileWinner = reptile ? reptile.teams.find((team) => team.id === reptile.podiumTeamIds[0]) : undefined;
  return (
    <div className={`results-banner-art${previous ? " is-previous" : ""}`}>
      <TournamentScene level={entry.level} fighters={false} title={reptileTitle} />
      <div className="results-banner-copy">
        <div>
          <span className={`tyear-eyebrow${previous ? " is-previous" : ""}`}>
            Anno scolastico {entry.schoolYear}{previous ? " · anno precedente" : ""} · {month}
          </span>
          <h2>{label}</h2>
          <span className="results-banner-meta">
            {result
              ? `${result.participants.length} partecipanti${result.schoolPreliminary ? ` · ${result.schoolPreliminary.eligibleCount} idonei alle preliminari` : ""}`
              : reptile ? `${reptile.teamCount} coppie · ${reptile.swissRounds} turni svizzeri` : ""}
          </span>
        </div>
        {champion || reptileWinner ? (
          <div className="results-banner-champion">
            <span className="tyear-eyebrow">{reptile ? "Vincitori" : "Campione Arena"}</span>
            <b className={champion?.ownedContactId || reptileWinner?.home ? "is-owned" : undefined}>
              {champion ? <OrderPennant owner={champion} large /> : reptileWinner ? <OrderPennant owner={reptileWinner} large /> : null}
              {champion ? participantName(champion) : reptileWinner?.athletes.map((athlete) => athlete.lastName).join(" / ")}
            </b>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Tournaments of the year as chips; the played ones open, the previous year's in red. */
function ResultsChips({
  view,
  selectedKey,
  onSelect,
}: {
  view: TournamentYearView;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const chip = (entry: YearEntry, previous: boolean) => entry.status === "done" ? (
    <button
      key={entry.key}
      type="button"
      className={`results-chip${previous ? " is-previous" : ""}`}
      aria-pressed={entry.key === selectedKey}
      onClick={() => onSelect(entry.key)}
    >
      {YEAR_ENTRY_SHORT[entry.level]}
      {entry.calendarMonth ? <small>{getGameMonthName(entry.calendarMonth).slice(0, 3).toLowerCase()}</small> : null}
    </button>
  ) : (
    <span key={entry.key} className="results-chip is-off">
      {YEAR_ENTRY_SHORT[entry.level]}
      <small>{entry.status === "next" ? "prossimo" : entry.status === "out" ? "senza di noi" : "in attesa"}</small>
    </span>
  );
  return (
    <nav className="results-chips" aria-label="Tornei dell'anno">
      <p>
        <span className="results-chips-label">Anno {view.schoolYear}</span>
        {view.entries.map((entry) => chip(entry, false))}
      </p>
      {view.previous ? (
        <p>
          <span className="results-chips-label is-previous">Anno {view.previous.schoolYear} · anno precedente</span>
          {view.previous.entries.map((entry) => chip(entry, true))}
        </p>
      ) : null}
    </nav>
  );
}

const SceneCard = memo(function SceneCard({
  level,
  title,
  status,
  note,
  locked,
  selected,
  onSelect,
}: {
  level: "reptile" | "chronicles";
  title: string;
  status: string;
  note: string;
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`open-scene-card is-${level}${locked ? " is-locked" : ""}`} aria-pressed={selected} onClick={onSelect}>
      <span className="open-scene-art">
        <TournamentScene level={level} fighters={false} title={title} />
        {locked ? <span className="open-scene-lock"><Icon name="lock" /></span> : null}
        <span className="open-scene-status">{status}</span>
      </span>
      <span className="open-scene-copy">
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
    </button>
  );
});

export function TournamentsView({
  state: stateOverride,
  gameSpeed = 1,
  onOpenAthletes = () => undefined,
  onStartChronicles = () => undefined,
  onPlayChroniclesHand = () => undefined,
  onOrganizeReptile = () => undefined,
  onCancelReptile = () => undefined,
  onPlayReptileMinigame = () => undefined,
  onOpenReptileTutorial = () => undefined,
  onReplayReptileDay = () => undefined,
  focusResultId,
  tutorialTab,
  onReptileShownChange,
}: {
  state?: GameState;
  /** Opens straight on this result in Risultati (from «Mostra i risultati» of the final). */
  focusResultId?: string;
  /** A tutorial step shows this tab (the latest result, or Open › Reptile). */
  tutorialTab?: "results" | "reptile";
  /** Tells the tutorial whether Open › Reptile is on screen. */
  onReptileShownChange?: (shown: boolean) => void;
  gameSpeed?: number;
  onOpenAthletes?: () => void;
  onStartChronicles?: (contactIds: string[]) => void;
  onPlayChroniclesHand?: (choice: RockPaperScissorsChoice) => void;
  onOrganizeReptile?: () => void;
  onCancelReptile?: () => void;
  onPlayReptileMinigame?: () => void;
  onOpenReptileTutorial?: () => void;
  onReplayReptileDay?: () => void;
}) {
  const state = useGameStateSlices(
    ["tournaments", "network", "school"],
    stateOverride,
  );
  const yearView = useMemo(
    () => getTournamentYearView(state),
    [state.school.currentMonth, state.school.nextFeeAt, state.tournaments], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const focusKey = focusResultId
    ? getPlayedEntries(yearView).find((entry) => entry.result?.id === focusResultId)?.key
    : undefined;
  const [tab, setTab] = useState<TournamentTab>(focusResultId ? "results" : "overview");
  const [openTournamentTab, setOpenTournamentTab] = useState<OpenTournamentTab>("reptile");
  const [selectedKey, setSelectedKey] = useState<string | undefined>(focusKey);
  const [chroniclesLoading, setChroniclesLoading] = useState(false);
  const [showChroniclesResult, setShowChroniclesResult] = useState(false);
  const chroniclesStartTimerRef = useRef<number | undefined>(undefined);
  const onStartChroniclesRef = useRef(onStartChronicles);
  const chroniclesUnlocked = state.tournaments.chronicles.unlocked;
  const reptile = state.tournaments.reptile;
  const reptileTitle = getReptileTournamentName(state);
  const chroniclesLoadingMs = gameDelayToWallDelay(
    CHRONICLES_TOURNAMENT_LOADING_MS,
    gameSpeed,
  );
  const labelOf = (entry: YearEntry) => entry.level === "reptile" ? reptileTitle : YEAR_ENTRY_LABEL[entry.level];
  const played = getPlayedEntries(yearView);
  const selectedForResults = (() => {
    const chosen = findEntry(yearView, selectedKey);
    if (chosen?.status === "done") return chosen;
    const fallback = getDefaultEntry(yearView);
    return fallback?.status === "done" ? fallback : played.at(-1);
  })();
  const latestChroniclesResult = [...state.tournaments.results]
    .reverse()
    .find((result) => result.level === "chronicles");
  // A tutorial step moves to its tab once, when the step asks for it (adjusted while rendering).
  const [shownTutorialTab, setShownTutorialTab] = useState<typeof tutorialTab>();
  if (tutorialTab !== shownTutorialTab) {
    setShownTutorialTab(tutorialTab);
    if (tutorialTab === "results") {
      setSelectedKey(undefined);
      setTab("results");
    } else if (tutorialTab === "reptile") {
      setTab("open");
      setOpenTournamentTab("reptile");
    }
  }
  const reptileShown = tab === "open" && (openTournamentTab === "reptile" || !chroniclesUnlocked);
  useEffect(() => {
    onReptileShownChange?.(reptileShown);
    return () => onReptileShownChange?.(false);
  }, [onReptileShownChange, reptileShown]);
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
      setSelectedKey(undefined);
      setTab("open");
      setOpenTournamentTab("chronicles");
      setShowChroniclesResult(true);
      setChroniclesLoading(false);
    }, chroniclesLoadingMs);
  };

  const reptileStatus = !reptile.unlocked
    ? "Da sbloccare"
    : reptile.activeEdition ? "In preparazione" : "Da organizzare";
  const chroniclesStatus = state.tournaments.chronicles.activeChallenge ? "Sfida in corso" : "Pronto";

  return (
    <main className="overview-view tournaments-view">
      <header>
        {/* Every page header has its icon (06/10). */}
        <Icon name="trophy" className="page-header-icon" aria-hidden="true" />
        <div>
          <h1>Tornei</h1>
          <p>Segui la stagione, prepara la squadra, conquista la Champion’s Arena</p>
        </div>
      </header>
      <div className="people-tabs tournament-tabs" role="tablist" aria-label="Sezioni tornei">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Panoramica
        </TabButton>
        <TabButton active={tab === "results"} onClick={() => setTab("results")}>
          Risultati
        </TabButton>
        <TabButton active={tab === "open"} onClick={() => setTab("open")}>
          Open
        </TabButton>
      </div>

      {chroniclesLoading ? (
        <ChroniclesTournamentLoading durationMs={chroniclesLoadingMs} />
      ) : null}
      {!chroniclesLoading && tab === "overview" ? (
        <TournamentOverview
          state={stateOverride}
          selectedKey={selectedKey}
          onSelectEntry={setSelectedKey}
          onOpenResults={(key) => {
            setSelectedKey(key);
            setTab("results");
          }}
        />
      ) : null}
      {!chroniclesLoading && tab === "results" ? (
        <div className="results-page">
          <ResultsChips view={yearView} selectedKey={selectedForResults?.key} onSelect={setSelectedKey} />
          {selectedForResults?.result ? (
            <StoredTournamentResults
              state={stateOverride}
              result={selectedForResults.result}
              results={played.flatMap((entry) => entry.result ? [entry.result] : [])}
              onSelectResult={(resultId) => setSelectedKey(played.find((entry) => entry.result?.id === resultId)?.key)}
              onBackToOverview={() => setTab("overview")}
              onViewQualified={onOpenAthletes}
              banner={<ResultsBanner entry={selectedForResults} view={yearView} label={labelOf(selectedForResults)} reptileTitle={reptileTitle} />}
            />
          ) : selectedForResults?.reptileResult ? (
            <div className="tournament-results-view is-reptile">
              <section className="results-banner">
                <ResultsBanner entry={selectedForResults} view={yearView} label={labelOf(selectedForResults)} reptileTitle={reptileTitle} />
              </section>
              <ReptileRecapPanel result={selectedForResults.reptileResult} onReplay={onReplayReptileDay} />
            </div>
          ) : (
            <p className="empty-tournaments tournament-empty-page">Nessun torneo disputato.</p>
          )}
        </div>
      ) : null}
      {!chroniclesLoading && tab === "open" ? (
        <section className="open-tournaments" aria-label="Tornei Open">
          <div className={`open-scene-cards${chroniclesUnlocked ? "" : " is-single"}`} role="group" aria-label="Tornei Open">
            <SceneCard
              level="reptile"
              title={reptileTitle}
              status={reptileStatus}
              note="Coppie, gironi svizzeri, a luglio a Genova"
              locked={!reptile.unlocked}
              selected={openTournamentTab === "reptile"}
              onSelect={() => setOpenTournamentTab("reptile")}
            />
            {chroniclesUnlocked ? (
            <SceneCard
              level="chronicles"
              title="Chronicles of Ludosport"
              status={chroniclesStatus}
              note="Il torneo delle leggende, quando vuoi"
              locked={false}
              selected={openTournamentTab === "chronicles"}
              onSelect={() => setOpenTournamentTab("chronicles")}
            />
            ) : null}
          </div>

          {openTournamentTab === "reptile" || !chroniclesUnlocked ? (
            <ReptileView
              state={stateOverride}
              onOrganize={onOrganizeReptile}
              onCancel={onCancelReptile}
              onPlayMinigame={onPlayReptileMinigame}
              onOpenTutorial={onOpenReptileTutorial}
              onReplayDay={onReplayReptileDay}
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
