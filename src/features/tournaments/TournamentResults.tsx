import { useMemo, useRef, useState } from "react";
import { TOURNAMENT_DEFINITIONS, getNextTournamentLevel } from "../../content/tournaments";
import type {
  TournamentMatch,
  TournamentParticipant,
  TournamentPodiumEntry,
  TournamentReward,
  TournamentResult,
  FormId,
} from "../../game/types";
import {
  describeTournamentRewardBonus,
  getTournamentRewardBonus,
} from "../../game/tournamentRewardFlow";
import { formatCurrency } from "../../shared/formatters";
import { knockoutStageLabel, levelShortLabel, participantName } from "./tournamentPresentation";
import { SchoolPreliminaryResults } from "./SchoolPreliminaryResults";
import { ChroniclesKeyIcon } from "./ChroniclesIcons";

const KNOCKOUT_STAGE_ORDER: TournamentMatch["stage"][] = [
  "round64",
  "round32",
  "round16",
  "quarterfinal",
  "semifinal",
  "final",
];

interface TournamentResultsProps {
  result: TournamentResult;
  results: readonly TournamentResult[];
  onSelectResult: (resultId: string) => void;
  onBackToOverview: () => void;
  onViewQualified: () => void;
  knownFormsByContactId: ReadonlyMap<string, readonly FormId[]>;
  continuationAction?: {
    label: string;
    onClick: () => void;
  };
}

function groupLetter(groupIndex: number): string {
  return String.fromCharCode(65 + groupIndex);
}

function qualificationDestination(level: ReturnType<typeof getNextTournamentLevel>): string {
  if (level === "academy") return "all'Accademico";
  if (level === "national") return "al Nazionale";
  if (level === "champions") return "alla Champion's Arena";
  return "complessivi";
}

function MatchCompetitor({
  participant,
  score,
  styleScore,
  winner,
}: {
  participant: TournamentParticipant | undefined;
  score: number;
  styleScore: number;
  winner: boolean;
}) {
  return (
    <span
      className={[winner ? "is-winner" : "", participant?.ownedContactId ? "is-owned" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <strong>{participantName(participant)}</strong>
      <b>{score}</b>
      <small>{styleScore.toFixed(3)}</small>
    </span>
  );
}

function BracketMatch({
  className,
  match,
  participantById,
  position,
  positionOffset = 0,
  selected,
  onSelect,
}: {
  className?: string;
  match: TournamentMatch;
  participantById: ReadonlyMap<string, TournamentParticipant>;
  position: number;
  positionOffset?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const a = participantById.get(match.participantAId);
  const b = participantById.get(match.participantBId);
  return (
    <button
      type="button"
      className={["bracket-match", className, selected ? "selected" : ""].filter(Boolean).join(" ")}
      style={{
        top: positionOffset === 0 ? `${position}%` : `calc(${position}% + ${positionOffset}px)`,
      }}
      onClick={onSelect}
      aria-label={`${participantName(a)} ${match.arenaScoreA} a ${match.arenaScoreB} ${participantName(b)}`}
    >
      <MatchCompetitor
        participant={a}
        score={match.arenaScoreA}
        styleScore={match.styleScoreA}
        winner={match.winnerId === a?.id}
      />
      <MatchCompetitor
        participant={b}
        score={match.arenaScoreB}
        styleScore={match.styleScoreB}
        winner={match.winnerId === b?.id}
      />
    </button>
  );
}

function orderKnockoutRounds(
  matches: readonly TournamentMatch[],
  stages: readonly TournamentMatch["stage"][],
): TournamentMatch[][] {
  const orderedRounds = new Map<TournamentMatch["stage"], TournamentMatch[]>();
  let nextRound: TournamentMatch[] | undefined;

  for (let stageIndex = stages.length - 1; stageIndex >= 0; stageIndex -= 1) {
    const stage = stages[stageIndex];
    const stageMatches = matches.filter((match) => match.stage === stage);
    if (nextRound) {
      const matchByWinnerId = new Map(stageMatches.map((match) => [match.winnerId, match]));
      const usedMatchIds = new Set<string>();
      const connectedMatches: TournamentMatch[] = [];
      for (const parentMatch of nextRound) {
        for (const participantId of [parentMatch.participantAId, parentMatch.participantBId]) {
          const sourceMatch = matchByWinnerId.get(participantId);
          if (sourceMatch && !usedMatchIds.has(sourceMatch.id)) {
            connectedMatches.push(sourceMatch);
            usedMatchIds.add(sourceMatch.id);
          }
        }
      }
      for (const match of stageMatches) {
        if (!usedMatchIds.has(match.id)) connectedMatches.push(match);
      }
      orderedRounds.set(stage, connectedMatches);
      nextRound = connectedMatches;
    } else {
      orderedRounds.set(stage, stageMatches);
      nextRound = stageMatches;
    }
  }

  return stages.map((stage) => orderedRounds.get(stage) ?? []);
}

function BracketConnectors({
  matches,
  nextMatches,
}: {
  matches: readonly TournamentMatch[];
  nextMatches: readonly TournamentMatch[];
}) {
  const sourceIndexByWinnerId = new Map(matches.map((match, index) => [match.winnerId, index]));
  return (
    <svg
      className="bracket-connectors"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {nextMatches.map((parentMatch, parentIndex) => {
        const sourceIndices = [parentMatch.participantAId, parentMatch.participantBId]
          .map((participantId) => sourceIndexByWinnerId.get(participantId))
          .filter((index) => index !== undefined);
        if (sourceIndices.length === 0) return null;
        const targetY = ((parentIndex + 0.5) / nextMatches.length) * 100;
        if (sourceIndices.length === 1) {
          const sourceY = ((sourceIndices[0] + 0.5) / matches.length) * 100;
          return <path key={parentMatch.id} d={`M 0 ${sourceY} H 50 V ${targetY} H 100`} />;
        }
        const firstY = ((sourceIndices[0] + 0.5) / matches.length) * 100;
        const secondY = ((sourceIndices[1] + 0.5) / matches.length) * 100;
        const joinY = (firstY + secondY) / 2;
        return (
          <path
            key={parentMatch.id}
            d={`M 0 ${firstY} H 50 V ${secondY} H 0 M 50 ${joinY} V ${targetY} H 100`}
          />
        );
      })}
    </svg>
  );
}

function PodiumList({
  title,
  entries,
  participantById,
}: {
  title: string;
  entries: readonly TournamentPodiumEntry[];
  participantById: ReadonlyMap<string, TournamentParticipant>;
}) {
  return (
    <div className="results-podium-list">
      <strong>{title}</strong>
      <div>
        {entries.map((entry) => (
          <span
            key={`${entry.discipline}-${entry.position}`}
            className={participantById.get(entry.participantId)?.ownedContactId ? "is-owned" : ""}
          >
            <b>{entry.position}</b>
            <em>{participantName(participantById.get(entry.participantId))}</em>
            <small>{entry.discipline === "style" ? entry.score.toFixed(3) : "Arena"}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function TournamentRewards({
  result,
  participantById,
}: {
  result: TournamentResult;
  participantById: ReadonlyMap<string, TournamentParticipant>;
}) {
  const podiumByDiscipline: Record<
    TournamentReward["discipline"],
    readonly TournamentPodiumEntry[]
  > = {
    arena: result.arenaPodium,
    style: result.stylePodium,
  };
  const totalEuros = result.rewards.reduce((total, reward) => total + reward.euros, 0);
  const totalRandomContacts = result.rewards.reduce((total, reward) => {
    const bonus = getTournamentRewardBonus(reward);
    return total + (bonus?.kind === "random-contacts" ? bonus.amount : 0);
  }, 0);

  return (
    <section className="tournament-rewards" aria-labelledby="tournament-rewards-title">
      <h2 id="tournament-rewards-title">Premi ricevuti</h2>
      {result.rewards.length > 0 ? (
        <div>
          <div className="tournament-reward-summary">
            <span>
              <small>Totale premi</small>
              <strong>{formatCurrency(totalEuros)}</strong>
            </span>
            <span>
              <small>Contatti casuali</small>
              <strong>+{totalRandomContacts}</strong>
            </span>
          </div>
          <div className="tournament-reward-list">
            {result.rewards.map((reward) => {
              const podiumEntry = podiumByDiscipline[reward.discipline].find(
                (entry) => entry.position === reward.position,
              );
              const participant = podiumEntry
                ? participantById.get(podiumEntry.participantId)
                : undefined;
              return (
                <article key={`${reward.discipline}-${reward.position}`}>
                  <span>
                    <strong>{reward.discipline === "arena" ? "Arena" : "Stile"}</strong>
                    <small>{reward.position}° posto</small>
                  </span>
                  <b>{participantName(participant)}</b>
                  <span>{formatCurrency(reward.euros)}</span>
                  <span>{describeTournamentRewardBonus(reward)}</span>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="empty-tournaments">
          Questo torneo non ha assegnato premi economici o contatti.
        </p>
      )}
    </section>
  );
}

export function TournamentResults({
  result,
  results,
  onSelectResult,
  onBackToOverview,
  onViewQualified,
  knownFormsByContactId,
  continuationAction,
}: TournamentResultsProps) {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedMatchId, setSelectedMatchId] = useState<string>();
  const [showMatchDetail, setShowMatchDetail] = useState(false);
  const [preliminaryResultId, setPreliminaryResultId] = useState<string>();
  const tournamentTabRef = useRef<HTMLButtonElement>(null);
  const preliminaryTabRef = useRef<HTMLButtonElement>(null);
  const participantById = useMemo(
    () => new Map(result.participants.map((participant) => [participant.id, participant])),
    [result.participants],
  );
  const groupIndices = useMemo(
    () =>
      [...new Set(result.groupStandings.map((standing) => standing.groupIndex))].sort(
        (a, b) => a - b,
      ),
    [result.groupStandings],
  );
  const activeGroupIndex = groupIndices.includes(selectedGroupIndex)
    ? selectedGroupIndex
    : (groupIndices[0] ?? 0);
  const groupStandings = result.groupStandings.filter(
    (standing) => standing.groupIndex === activeGroupIndex,
  );
  const groupMatches = result.matches.filter(
    (match) => match.stage === "group" && match.groupIndex === activeGroupIndex,
  );
  const knockoutRounds = useMemo(() => {
    const stages = KNOCKOUT_STAGE_ORDER.filter((stage) =>
      result.matches.some((match) => match.stage === stage),
    );
    const orderedMatches = orderKnockoutRounds(result.matches, stages);
    return stages.map((stage, index) => ({ stage, matches: orderedMatches[index] }));
  }, [result.matches]);
  const bracketRoundCount = knockoutRounds.length;
  const firstRoundMatchCount = knockoutRounds[0]?.matches.length ?? 0;
  const bracketStyle =
    bracketRoundCount > 0
      ? {
          gridTemplateColumns: `repeat(${bracketRoundCount}, minmax(200px, 1fr))`,
          minWidth: `${bracketRoundCount * 220 + Math.max(0, bracketRoundCount - 1) * 42}px`,
          minHeight: `${Math.max(390, firstRoundMatchCount * 76 + 70)}px`,
        }
      : undefined;
  const defaultMatch =
    groupMatches.find(
      (match) =>
        participantById.get(match.participantAId)?.ownedContactId ||
        participantById.get(match.participantBId)?.ownedContactId,
    ) ??
    groupMatches[0] ??
    result.matches.find((match) => match.stage === "final");
  const selectedMatch =
    result.matches.find((match) => match.id === selectedMatchId) ?? defaultMatch;
  const finalMatch = result.matches.find((match) => match.stage === "final");
  const bronzeMatch = result.matches.find((match) => match.stage === "bronze");
  const champion = finalMatch ? participantById.get(finalMatch.winnerId) : undefined;
  const nextLevel = getNextTournamentLevel(result.level);
  const preliminary = result.schoolPreliminary;
  const showPreliminary = preliminaryResultId === result.id && Boolean(preliminary);
  const tournamentPanelId = `tournament-result-panel-${result.id}`;
  const preliminaryPanelId = `preliminary-result-panel-${result.id}`;
  const tournamentTabId = `tournament-result-tab-${result.id}`;
  const preliminaryTabId = `preliminary-result-tab-${result.id}`;

  const selectResultView = (view: "tournament" | "preliminary", focus = false) => {
    setPreliminaryResultId(view === "preliminary" ? result.id : undefined);
    if (focus) {
      const target = view === "preliminary" ? preliminaryTabRef : tournamentTabRef;
      requestAnimationFrame(() => target.current?.focus());
    }
  };

  return (
    <div
      className={`tournament-results-view${result.level === "chronicles" ? " is-chronicles" : ""}`}
    >
      <section className="results-context">
        <button type="button" className="back-to-calendar" onClick={onBackToOverview}>
          <span aria-hidden="true">‹</span> Calendario
        </button>
        {result.level === "chronicles" ? (
          <span className="chronicles-results-emblem" aria-hidden="true">
            <ChroniclesKeyIcon />
          </span>
        ) : null}
        <h2>{TOURNAMENT_DEFINITIONS[result.level].label}</h2>
        <span>Stagione {result.season}</span>
        <i aria-hidden="true" />
        <span>{result.participants.length} partecipanti</span>
        <i aria-hidden="true" />
        {result.schoolPreliminary ? (
          <>
            <span>{result.schoolPreliminary.eligibleCount} idonei alle preliminari</span>
            <i aria-hidden="true" />
          </>
        ) : null}
        {result.vacantQualificationContactIds?.length ? (
          <>
            <span>
              {result.vacantQualificationContactIds.length}{" "}
              {result.vacantQualificationContactIds.length === 1
                ? "posto vacante (bye)"
                : "posti vacanti (bye)"}
            </span>
            <i aria-hidden="true" />
          </>
        ) : null}
        <strong>Completato</strong>
        <label>
          <span>Cambia torneo</span>
          <select
            aria-label="Cambia torneo"
            value={result.id}
            onChange={(event) => onSelectResult(event.target.value)}
          >
            {[...results].reverse().map((entry) => (
              <option key={entry.id} value={entry.id}>
                {levelShortLabel[entry.level]} · Stagione {entry.season}
              </option>
            ))}
          </select>
        </label>
        <b aria-hidden="true" />
      </section>

      {preliminary ? (
        <div className="result-view-tabs" role="tablist" aria-label="Visualizzazione del torneo">
          <button
            ref={tournamentTabRef}
            id={tournamentTabId}
            type="button"
            role="tab"
            aria-selected={!showPreliminary}
            aria-controls={tournamentPanelId}
            tabIndex={showPreliminary ? -1 : 0}
            onClick={() => selectResultView("tournament")}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "End") {
                event.preventDefault();
                selectResultView("preliminary", true);
              }
            }}
          >
            Torneo
          </button>
          <button
            ref={preliminaryTabRef}
            id={preliminaryTabId}
            type="button"
            role="tab"
            aria-label={`Preliminari, ${preliminary.eligibleCount} idonei`}
            aria-selected={showPreliminary}
            aria-controls={preliminaryPanelId}
            tabIndex={showPreliminary ? 0 : -1}
            onClick={() => selectResultView("preliminary")}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "Home") {
                event.preventDefault();
                selectResultView("tournament", true);
              }
            }}
          >
            Preliminari <span aria-hidden="true">{preliminary.eligibleCount}</span>
          </button>
        </div>
      ) : null}

      {showPreliminary && preliminary ? (
        <div
          id={preliminaryPanelId}
          role="tabpanel"
          aria-labelledby={preliminaryTabId}
          className="result-view-panel"
        >
          <SchoolPreliminaryResults
            preliminary={preliminary}
            participants={result.participants}
            knownFormsByContactId={knownFormsByContactId}
          />
        </div>
      ) : (
        <div
          id={preliminary ? tournamentPanelId : undefined}
          role={preliminary ? "tabpanel" : undefined}
          aria-labelledby={preliminary ? tournamentTabId : undefined}
          className="result-view-panel"
        >
          <div className="results-workspace">
            <section className="group-stage" aria-labelledby="group-stage-title">
              <h2 id="group-stage-title">Gironi</h2>
              <div className="group-selector" role="tablist" aria-label="Seleziona girone">
                {groupIndices.map((groupIndex) => (
                  <button
                    key={groupIndex}
                    type="button"
                    role="tab"
                    aria-selected={activeGroupIndex === groupIndex}
                    className={activeGroupIndex === groupIndex ? "active" : ""}
                    onClick={() => {
                      setSelectedGroupIndex(groupIndex);
                      setSelectedMatchId(undefined);
                    }}
                  >
                    {groupLetter(groupIndex)}
                  </button>
                ))}
              </div>
              <h3>Gruppo {groupLetter(activeGroupIndex)}</h3>
              <div className="group-table-wrap">
                <table className="group-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Atleta</th>
                      <th>V</th>
                      <th>Punti</th>
                      <th>Stile</th>
                      <th>Esito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStandings.map((standing, index) => {
                      const participant = participantById.get(standing.participantId);
                      return (
                        <tr
                          key={standing.participantId}
                          className={[
                            standing.qualified ? "is-advanced" : "",
                            participant?.ownedContactId ? "is-owned" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td>{index + 1}</td>
                          <th
                            scope="row"
                            className={
                              participant?.rarity === "secret-legendary" ? "secret-legendary" : ""
                            }
                          >
                            {participantName(participant)}
                          </th>
                          <td>{standing.wins}</td>
                          <td>{standing.assaultPoints}</td>
                          <td>{standing.styleAverage.toFixed(3)}</td>
                          <td>{standing.qualified ? "Avanza" : "Eliminato"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedMatch ? (
                <div className="selected-match-detail" aria-live="polite">
                  <span>
                    <strong>
                      {participantName(participantById.get(selectedMatch.participantAId))}
                    </strong>
                    <small>Stile {selectedMatch.styleScoreA.toFixed(3)}</small>
                  </span>
                  <b>
                    {selectedMatch.arenaScoreA}
                    <i>–</i>
                    {selectedMatch.arenaScoreB}
                  </b>
                  <span>
                    <strong>
                      {participantName(participantById.get(selectedMatch.participantBId))}
                    </strong>
                    <small>Stile {selectedMatch.styleScoreB.toFixed(3)}</small>
                  </span>
                  <button
                    type="button"
                    aria-expanded={showMatchDetail}
                    onClick={() => setShowMatchDetail((visible) => !visible)}
                  >
                    {showMatchDetail ? "Nascondi dettaglio" : "Dettaglio incontro"}
                  </button>
                  {showMatchDetail ? (
                    <div className="selected-match-expanded">
                      <span>{participantById.get(selectedMatch.participantAId)?.schoolName}</span>
                      <strong>
                        {selectedMatch.stage === "group"
                          ? `Girone ${groupLetter(selectedMatch.groupIndex ?? 0)}`
                          : knockoutStageLabel[selectedMatch.stage]}
                      </strong>
                      <span>{participantById.get(selectedMatch.participantBId)?.schoolName}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="knockout-stage" aria-labelledby="knockout-stage-title">
              <h2 id="knockout-stage-title">Eliminazione diretta</h2>
              {knockoutRounds.length > 0 ? (
                <div className="tournament-bracket-scroll">
                  <div
                    className={`tournament-bracket rounds-${knockoutRounds.length}`}
                    style={bracketStyle}
                  >
                    {knockoutRounds.map(({ stage, matches }, roundIndex) => {
                      const nextMatches = knockoutRounds[roundIndex + 1]?.matches;
                      return (
                        <div key={stage} className={`bracket-round stage-${stage}`}>
                          <h3>{knockoutStageLabel[stage]}</h3>
                          <div className="bracket-round-matches">
                            {matches.map((match, matchIndex) => (
                              <BracketMatch
                                key={match.id}
                                match={match}
                                participantById={participantById}
                                position={((matchIndex + 0.5) / matches.length) * 100}
                                selected={selectedMatch?.id === match.id}
                                onSelect={() => {
                                  setSelectedMatchId(match.id);
                                  setShowMatchDetail(false);
                                }}
                              />
                            ))}
                            {nextMatches ? (
                              <BracketConnectors matches={matches} nextMatches={nextMatches} />
                            ) : null}
                            {!nextMatches && bronzeMatch ? (
                              <>
                                <h4 className="bronze-match-label">3° / 4° posto</h4>
                                <BracketMatch
                                  className="bronze-bracket-match"
                                  match={bronzeMatch}
                                  participantById={participantById}
                                  position={50}
                                  positionOffset={108}
                                  selected={selectedMatch?.id === bronzeMatch.id}
                                  onSelect={() => {
                                    setSelectedMatchId(bronzeMatch.id);
                                    setShowMatchDetail(false);
                                  }}
                                />
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {champion ? (
                      <p className="arena-champion">
                        <strong>{participantName(champion)}</strong>
                        <span>Campione Arena</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="empty-tournaments">
                  Nessuna fase a eliminazione diretta disponibile.
                </p>
              )}
            </section>
          </div>

          <section
            className="podium-qualification-rail"
            aria-labelledby="podium-qualification-title"
          >
            <h2 id="podium-qualification-title">Podio e qualificazioni</h2>
            <div>
              <PodiumList
                title="Arena"
                entries={result.arenaPodium}
                participantById={participantById}
              />
              <PodiumList
                title="Stile"
                entries={result.stylePodium}
                participantById={participantById}
              />
              <div className="result-qualifiers">
                <strong>
                  {result.qualifiers.length} qualificati {qualificationDestination(nextLevel)}
                </strong>
                {result.qualificationAllocation ? (
                  <small>
                    {result.qualificationAllocation.slotCount} posti disponibili con{" "}
                    {result.qualificationAllocation.activeMembers} iscritti attivi
                  </small>
                ) : null}
                <button type="button" onClick={onViewQualified}>
                  Vedi qualificati
                </button>
              </div>
            </div>
          </section>

          <TournamentRewards result={result} participantById={participantById} />
        </div>
      )}
      {continuationAction ? (
        <footer className="tournament-results-continuation">
          <button type="button" onClick={continuationAction.onClick}>
            {continuationAction.label}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
