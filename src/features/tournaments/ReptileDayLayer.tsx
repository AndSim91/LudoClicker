import { useEffect, useMemo, useState } from "react";
import { getReptileQualityLabel, REPTILE_SECTOR_LABELS } from "../../game/reptilePreparation";
import type { ReptileSector, ReptileTeam, ReptileTournamentResult } from "../../game/types";
import { formatReptileEuros as formatCurrency, reptileTeamLabel } from "./reptileUi";

/*
 * The tournament day, already played: four short scenes (opening with the
 * sector stamps and the resa, the Swiss rounds, the bracket, the podium).
 * «Salta» jumps to the podium; nothing here changes the game.
 */

const SCENE_MS = [5_200, 4_600, 4_400];
const STAMP_SECTORS: readonly ReptileSector[] = ["social", "events", "equipment", "instructors", "gadget"];

function stampLine(sector: ReptileSector, result: ReptileTournamentResult): string {
  const quality = result.sectorQualities[sector] ?? 0;
  if (sector === "social") return `+${result.economy.followersGained} follower: la voce è girata`;
  if (sector === "events") return quality >= 60 ? "Accrediti scorrevoli, tribune piene" : "Qualche coda di troppo agli accrediti";
  if (sector === "equipment") {
    return result.economy.missingSwords > 0
      ? `${result.economy.usedSchoolSwords} spade nostre, ${result.economy.missingSwords} mancanti`
      : `${result.economy.usedSchoolSwords} spade cariche, arene col nastro nuovo`;
  }
  if (sector === "instructors") return quality >= 60 ? "Arbitri pronti, nessun ricorso serio" : "Arbitri presi all'ultimo momento";
  return `${formatCurrency(result.economy.gadgetGross)} al banchetto`;
}

function SwissScene({ result, teamsById }: { result: ReptileTournamentResult; teamsById: Map<string, ReptileTeam> }) {
  const [round, setRound] = useState(1);
  useEffect(() => {
    if (round >= result.swissRounds) return;
    const timer = window.setTimeout(() => setRound((value) => value + 1), 3_800 / result.swissRounds);
    return () => window.clearTimeout(timer);
  }, [round, result.swissRounds]);
  const shown = useMemo(() => {
    const final = result.standings.slice(0, 8).map((entry) => entry.teamId);
    const home = result.standings.filter((entry) => teamsById.get(entry.teamId)?.home).slice(0, 3).map((entry) => entry.teamId);
    return [...new Set([...final, ...home])].slice(0, 10);
  }, [result.standings, teamsById]);
  const wins = new Map<string, number>(shown.map((id) => [id, 0]));
  for (const match of result.matches) {
    if (match.phase !== "swiss" || match.round > round || !wins.has(match.winnerId)) continue;
    wins.set(match.winnerId, (wins.get(match.winnerId) ?? 0) + 1);
  }
  const ordered = [...shown].sort((left, right) => (wins.get(right) ?? 0) - (wins.get(left) ?? 0));
  return (
    <>
      <span className="reptile-section-kicker">Gironi svizzeri</span>
      <h3>Turno {round} di {result.swissRounds}</h3>
      <ol className="reptile-day-standings">
        {ordered.map((id, index) => {
          const team = teamsById.get(id);
          return (
            <li key={id} className={team?.home ? "is-home" : ""}>
              <b>{index + 1}</b>
              <span>{reptileTeamLabel(team)} <small>{team?.schoolName}</small></span>
              <span>{wins.get(id)}–{round - (wins.get(id) ?? 0)}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function BracketScene({ result, teamsById }: { result: ReptileTournamentResult; teamsById: Map<string, ReptileTeam> }) {
  const [revealed, setRevealed] = useState(1);
  useEffect(() => {
    if (revealed >= 4) return;
    const timer = window.setTimeout(() => setRevealed((value) => value + 1), 950);
    return () => window.clearTimeout(timer);
  }, [revealed]);
  const quarterfinals = result.matches.filter((match) => match.phase === "quarterfinal");
  const semifinals = result.matches.filter((match) => match.phase === "semifinal");
  const final = result.matches.find((match) => match.phase === "final");
  const columns: string[][] = [
    quarterfinals.flatMap((match) => [match.teamAId, match.teamBId]),
    semifinals.flatMap((match) => [match.teamAId, match.teamBId]),
    final ? [final.teamAId, final.teamBId] : [],
    [result.podiumTeamIds[0]],
  ];
  const labels = ["Quarti di finale", "Semifinali", "Finale", "Vincitori"];
  return (
    <>
      <span className="reptile-section-kicker">Fase finale</span>
      <h3>{labels[revealed - 1]}</h3>
      <div className="reptile-day-bracket">
        {columns.map((ids, column) => (
          <div key={labels[column]} className="reptile-day-bracket-column">
            {ids.map((id) => {
              const team = teamsById.get(id);
              return (
                <span key={`${column}-${id}`} className={`${column < revealed ? "is-in" : ""}${team?.home ? " is-home" : ""}`}>
                  {reptileTeamLabel(team)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

export function ReptileDayLayer({
  result,
  superba,
  city,
  onClose,
}: {
  result: ReptileTournamentResult;
  superba: boolean;
  city: string;
  onClose: () => void;
}) {
  const [scene, setScene] = useState(0);
  const [stamps, setStamps] = useState(0);
  const teamsById = useMemo(() => new Map(result.teams.map((team) => [team.id, team])), [result.teams]);
  const name = result.superba ? "Torneo della Superba" : "Torneo Reptile";
  const homeCount = result.teams.filter((team) => team.home).length;
  const sectors = STAMP_SECTORS.filter((sector) => result.sectorQualities[sector] !== undefined);
  const winner = teamsById.get(result.podiumTeamIds[0]);

  useEffect(() => {
    if (scene >= SCENE_MS.length) return;
    const timer = window.setTimeout(() => setScene((value) => value + 1), SCENE_MS[scene]);
    return () => window.clearTimeout(timer);
  }, [scene]);

  useEffect(() => {
    if (scene !== 0 || stamps > sectors.length + 1) return;
    const timer = window.setTimeout(() => setStamps((value) => value + 1), stamps === 0 ? 300 : 380);
    return () => window.clearTimeout(timer);
  }, [scene, sectors.length, stamps]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (scene >= 3) onClose();
      else setScene(3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, scene]);

  return (
    <div
      className={`reptile-view reptile-day-layer${superba ? " is-superba" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reptile-day-title"
    >
      <div className="reptile-day-stage">
        <header className="reptile-day-top">
          <span className="reptile-day-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => <i key={index} className={index <= scene ? "is-on" : ""} />)}
          </span>
          <span id="reptile-day-title" className="reptile-section-kicker">{name} · luglio, anno {result.schoolYear}</span>
          {scene < 3
            ? <button type="button" className="secondary" onClick={() => setScene(3)}>Salta</button>
            : <button type="button" className="primary" onClick={onClose}>Torna al gioco</button>}
        </header>
        <div key={scene} className="reptile-day-scene">
          {scene === 0 ? (
            <>
              <span className="reptile-section-kicker">Palazzetto di {city}</span>
              <h3>{result.teamCount} squadre, {homeCount === 0 ? "nessuna" : homeCount} di {city}</h3>
              <div className="reptile-day-stamps">
                {sectors.map((sector, index) => (
                  <span key={sector} className={`reptile-day-stamp${index < stamps ? " is-in" : ""}`}>
                    <b>{REPTILE_SECTOR_LABELS[sector]} · {getReptileQualityLabel(result.sectorQualities[sector] ?? 0)}</b>
                    <small>{stampLine(sector, result)}</small>
                  </span>
                ))}
                {result.minigameBonusPercent > 0 ? (
                  <span className={`reptile-day-stamp is-gold${stamps > sectors.length ? " is-in" : ""}`}>
                    <b>Imprevisti +{result.minigameBonusPercent}%</b>
                    <small>Il preside ha tenuto il palazzetto</small>
                  </span>
                ) : null}
              </div>
              <strong className={`reptile-day-resa${stamps > sectors.length ? " is-in" : ""}`}>
                {result.resa}<small>resa del torneo · {getReptileQualityLabel(result.resa)}</small>
              </strong>
            </>
          ) : scene === 1 ? (
            <SwissScene result={result} teamsById={teamsById} />
          ) : scene === 2 ? (
            <BracketScene result={result} teamsById={teamsById} />
          ) : (
            <>
              <span className="reptile-section-kicker">Podio</span>
              <h3>{reptileTeamLabel(winner)} vincono il {name}</h3>
              <div className="reptile-day-podium">
                {[1, 0, 2].map((place) => {
                  const team = teamsById.get(result.podiumTeamIds[place]);
                  return (
                    <div key={place} className={team?.home ? "is-home" : ""}>
                      <small>{reptileTeamLabel(team)}<br />{team?.schoolName}</small>
                      <i style={{ height: `${[110, 80, 60][place]}px` }}>{place + 1}</i>
                    </div>
                  );
                })}
              </div>
              <div className="reptile-tiles">
                <div><small>Resa</small><strong>{result.resa}</strong></div>
                <div><small>Fama</small><strong>{result.economy.fameDelta >= 0 ? "+" : "−"}{Math.abs(result.economy.fameDelta)}</strong></div>
                <div><small>Banchetto</small><strong>{formatCurrency(result.economy.gadgetGross)}</strong></div>
                <div><small>Follower</small><strong>+{result.economy.followersGained}</strong></div>
              </div>
              {result.superba && winner?.home ? <p className="reptile-inline-note">Battuta la Superba: negli Upgrade c&apos;è qualcosa di nuovo.</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
