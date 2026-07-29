import { useMemo, useState } from "react";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getGameMonthName, getSchoolYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import {
  REPTILE_SECTORS,
  REPTILE_SECTOR_LABELS,
  canStartReptilePreparation,
  getReptileFameLevel,
  getReptileQualityLabel,
} from "../../game/reptilePreparation";
import { getReptilePresentationStepCount } from "../../game/reptileFlow";
import type {
  Collaborator,
  GameState,
  ReptileMatch,
  ReptileSector,
  ReptileSectorAssignments,
  ReptileTeam,
  ReptileTournamentResult,
} from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { ReptileCircleGame } from "./ReptileCircleGame";

const ASSIGNMENT_LABEL: Record<Exclude<Collaborator["assignment"], null>, string> = {
  writing: "Scrittura / Social",
  events: "Eventi",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
  gadget: "Gadget",
};

function teamLabel(team: ReptileTeam | undefined): string {
  if (!team) return "—";
  return `${team.athletes[0].lastName} / ${team.athletes[1].lastName}`;
}

function ReptileMatchRows({
  matches,
  teamsById,
}: {
  matches: readonly ReptileMatch[];
  teamsById: ReadonlyMap<string, ReptileTeam>;
}) {
  return (
    <div className="reptile-match-list">
      {matches.map((match) => {
        const teamA = teamsById.get(match.teamAId);
        const teamB = teamsById.get(match.teamBId);
        return (
          <article key={match.id} className={teamA?.home || teamB?.home ? "is-home-match" : ""}>
            <div>
              <strong>{teamLabel(teamA)}</strong>
              <small>{teamA?.schoolName}</small>
            </div>
            <b>{match.scoreA}–{match.scoreB}</b>
            <div>
              <strong>{teamLabel(teamB)}</strong>
              <small>{teamB?.schoolName}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ReptileRecap({ result }: { result: ReptileTournamentResult }) {
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const winner = teamsById.get(result.podiumTeamIds[0]);
  return (
    <section className="reptile-recap">
      <header>
        <span>Edizione conclusa · anno scolastico {result.schoolYear}</span>
        <h2>{teamLabel(winner)} vince il Torneo Reptile</h2>
        <p>{winner?.schoolName} · {winner?.city}</p>
      </header>
      <div className="reptile-recap-grid">
        <article>
          <small>Partecipazione</small>
          <strong>{result.teamCount} team</strong>
          <span>{result.swissRounds} turni svizzeri</span>
        </article>
        <article>
          <small>Fama del torneo</small>
          <strong>{result.economy.fameAfter} XP</strong>
          <span>{result.economy.fameDelta >= 0 ? "+" : ""}{result.economy.fameDelta} XP</span>
        </article>
        <article>
          <small>Pubblico</small>
          <strong>+{result.economy.followersGained}</strong>
          <span>nuovi follower</span>
        </article>
        <article>
          <small>Risultato economico</small>
          <strong>{formatCurrency(result.economy.netResult)}</strong>
          <span>Gadget {formatCurrency(result.economy.gadgetGross)} · affitto {formatCurrency(result.economy.venueCost)} · spade {formatCurrency(result.economy.rentalCost)}</span>
        </article>
      </div>
      <div className="reptile-sector-summary">
        {REPTILE_SECTORS.map((sector) => (
          <div key={sector}>
            <span>{REPTILE_SECTOR_LABELS[sector]}</span>
            <strong>{Math.round(result.sectorQualities[sector])}/100</strong>
            <small>{getReptileQualityLabel(result.sectorQualities[sector])}</small>
          </div>
        ))}
      </div>
      <p className="reptile-equipment-note">
        {result.economy.usedSchoolSwords} spade della scuola usate, {result.economy.rentedSwords} noleggiate,
        usura totale {result.economy.swordWear}.
      </p>
    </section>
  );
}

function ReptilePresentation({
  result,
  step,
  onContinue,
  onSkip,
}: {
  result: ReptileTournamentResult;
  step: number;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const teamsById = useMemo(() => new Map(result.teams.map((team) => [team.id, team])), [result.teams]);
  const swissStart = 4;
  const standingsStep = swissStart + result.swissRounds;
  const knockoutStart = standingsStep + 1;
  const recapStep = getReptilePresentationStepCount(result) - 1;
  let content;
  let title;
  if (step < 4) {
    const sector = REPTILE_SECTORS[step];
    title = `Il lavoro del settore ${REPTILE_SECTOR_LABELS[sector]}`;
    const sectorCopy: Record<ReptileSector, string> = {
      social: `${result.teamCount} team hanno risposto alla campagna. La qualità Social porta ${result.economy.followersGained} nuovi follower.`,
      equipment: `${result.economy.usedSchoolSwords} spade disponibili e ${result.economy.rentedSwords} noleggiate per completare l'allestimento.`,
      gadget: `Il banchetto può generare ${formatCurrency(result.economy.gadgetGross)} di entrate lorde.`,
      events: `Accoglienza, arbitri e tabellone sono pronti. La qualità Eventi ha influenzato la selezione degli atleti di Genova.`,
    };
    content = <p className="reptile-interlude-copy">{sectorCopy[sector]}</p>;
  } else if (step < standingsStep) {
    const round = step - swissStart + 1;
    const matches = result.matches.filter((match) => match.phase === "swiss" && match.round === round);
    const homeMatches = matches.filter((match) =>
      teamsById.get(match.teamAId)?.home || teamsById.get(match.teamBId)?.home,
    );
    title = `Girone svizzero · turno ${round}/${result.swissRounds}`;
    content = (
      <>
        <p>{matches.length} sfide disputate · {matches.length - homeMatches.length} incontri esterni riepilogati.</p>
        {homeMatches.length > 0 ? (
          <ReptileMatchRows matches={homeMatches} teamsById={teamsById} />
        ) : <p>Nessun team di Genova in questo turno.</p>}
      </>
    );
  } else if (step === standingsStep) {
    title = "Classifica finale dei gironi svizzeri";
    content = (
      <div className="reptile-standing-table" role="table" aria-label="Classifica svizzera completa">
        {result.standings.map((standing) => {
          const team = teamsById.get(standing.teamId);
          return (
            <div key={standing.teamId} className={standing.qualified ? "is-qualified" : ""} role="row">
              <b>{standing.rank}</b>
              <span>{teamLabel(team)} <small>{team?.schoolName}</small></span>
              <span>{standing.wins}–{standing.losses}</span>
              <span>{standing.pointsFor - standing.pointsAgainst >= 0 ? "+" : ""}{standing.pointsFor - standing.pointsAgainst}</span>
              <span>OS {standing.opponentsWins}</span>
            </div>
          );
        })}
      </div>
    );
  } else if (step < recapStep) {
    const stageIndex = step - knockoutStart;
    const stageGroups: ReptileMatch["phase"][][] = [
      ["round16"],
      ["quarterfinal"],
      ["semifinal"],
      ["bronze", "final"],
    ];
    const labels = ["Ottavi di finale", "Quarti di finale", "Semifinali", "Finali"];
    const phases = stageGroups[stageIndex] ?? stageGroups[3];
    const matches = result.matches.filter((match) => phases.includes(match.phase));
    title = labels[stageIndex] ?? "Fase a eliminazione";
    content = <ReptileMatchRows matches={matches} teamsById={teamsById} />;
  } else {
    title = "Il Torneo Reptile è concluso";
    content = <ReptileRecap result={result} />;
  }
  return (
    <div className="reptile-presentation-overlay" role="dialog" aria-modal="true" aria-labelledby="reptile-presentation-title">
      <section className="reptile-presentation-shell">
        <header>
          <span>Torneo Reptile · Genova</span>
          <h2 id="reptile-presentation-title">{title}</h2>
        </header>
        <div className="reptile-presentation-content">{content}</div>
        <footer>
          {step < recapStep ? <button type="button" onClick={onSkip}>Salta la presentazione</button> : <span />}
          <button type="button" className="primary" onClick={onContinue}>
            {step === recapStep ? "Concludi il torneo" : "Continua"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function createDefaultAssignments(collaborators: readonly Collaborator[]): Record<string, ReptileSector> {
  const eligible = collaborators.filter((collaborator) => collaborator.assignment !== "instructor");
  return Object.fromEntries(eligible.map((collaborator, index) => [
    collaborator.id,
    REPTILE_SECTORS[index % REPTILE_SECTORS.length],
  ]));
}

export function ReptileView({
  state,
  onStartPreparation,
  onStartMinigame,
  onCompleteMinigame,
  onSkipMinigame,
  onCancelPreparation,
  onBookVenue,
  onAdvancePresentation,
  onSkipPresentation,
}: {
  state: GameState;
  onStartPreparation: (assignments: ReptileSectorAssignments) => void;
  onStartMinigame: () => void;
  onCompleteMinigame: (hits: number, misses: number, outsideClicks: number) => void;
  onSkipMinigame: () => void;
  onCancelPreparation: () => void;
  onBookVenue: () => void;
  onAdvancePresentation: () => void;
  onSkipPresentation: () => void;
}) {
  const reptile = state.tournaments.reptile;
  const edition = reptile.activeEdition;
  const eligibleCollaborators = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment !== "instructor"),
    [state.collaborators],
  );
  const [sectorByCollaborator, setSectorByCollaborator] = useState<Record<string, ReptileSector>>(
    () => createDefaultAssignments(state.collaborators),
  );
  if (!reptile.unlocked) {
    return (
      <section className="reptile-locked-card">
        <span>Open · Genova</span>
        <h2>Torneo Reptile</h2>
        <p>Vinci il Torneo Nazionale sia in Arena sia in Stile per sbloccare l'organizzazione del primo Open della scuola.</p>
      </section>
    );
  }

  if (edition?.status === "presenting" && edition.result) {
    return <ReptilePresentation result={edition.result} step={edition.presentationStep} onContinue={onAdvancePresentation} onSkip={onSkipPresentation} />;
  }

  if (edition?.status === "minigame" && edition.minigame.status === "running") {
    return <ReptileCircleGame editionId={edition.id} minigame={edition.minigame} onComplete={onCompleteMinigame} />;
  }

  const canStart = canStartReptilePreparation(state);
  const resolvedSectorByCollaborator = Object.fromEntries(
    eligibleCollaborators.map((collaborator, index) => [
      collaborator.id,
      sectorByCollaborator[collaborator.id] ?? REPTILE_SECTORS[index % REPTILE_SECTORS.length],
    ]),
  ) as Record<string, ReptileSector>;
  const allSectorsCovered = REPTILE_SECTORS.every((sector) =>
    Object.values(resolvedSectorByCollaborator).includes(sector),
  );
  const assignments = Object.fromEntries(REPTILE_SECTORS.map((sector) => [
    sector,
    eligibleCollaborators
      .filter((collaborator) => resolvedSectorByCollaborator[collaborator.id] === sector)
      .map((collaborator) => collaborator.id),
  ])) as ReptileSectorAssignments;
  const difficulty = TOURNAMENT_DEFINITIONS.champions.standard * 1.1 ** reptile.victories;

  return (
    <div className="reptile-view">
      <section className="reptile-hero">
        <div>
          <span>Open · torneo a coppie</span>
          <h2>Torneo Reptile</h2>
          <p>Gironi svizzeri, migliori 16 alla fase finale, sfide alla meglio dei cinque.</p>
        </div>
        <div className="reptile-hero-stats">
          <div><small>Fama</small><strong>{getReptileFameLevel(reptile.fameXp)}</strong><span>{reptile.fameXp}/3000 XP</span></div>
          <div><small>Team previsti</small><strong>{edition?.teamCount ?? 16 * 2 ** getReptileFameLevel(reptile.fameXp)}</strong></div>
          <div><small>Difficoltà media</small><strong>{Math.round(difficulty)}</strong><span>Champion's × {(1.1 ** reptile.victories).toFixed(2)}</span></div>
        </div>
      </section>

      {!edition ? (
        <>
          <section className="reptile-setup-card">
            <header><h3>Distribuisci i collaboratori</h3><p>Tutti i collaboratori non assegnati come Istruttori sospenderanno il lavoro ordinario fino alla fine della preparazione.</p></header>
            {eligibleCollaborators.length >= 4 ? (
              <div className="reptile-collaborator-assignment">
                {eligibleCollaborators.map((collaborator) => (
                  <label key={collaborator.id}>
                    <span><strong>{collaborator.displayName}</strong><small>Ora: {collaborator.assignment ? ASSIGNMENT_LABEL[collaborator.assignment] : "Nessun incarico"}</small></span>
                    <select value={resolvedSectorByCollaborator[collaborator.id]} onChange={(event) => setSectorByCollaborator((current) => ({ ...current, [collaborator.id]: event.target.value as ReptileSector }))}>
                      {REPTILE_SECTORS.map((sector) => <option key={sector} value={sector}>{REPTILE_SECTOR_LABELS[sector]}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            ) : <p className="reptile-warning">Servono almeno quattro collaboratori non assegnati come Istruttori: uno per ciascun settore.</p>}
            <div className="reptile-sector-counts">
              {REPTILE_SECTORS.map((sector) => <span key={sector}>{REPTILE_SECTOR_LABELS[sector]} <b>{assignments[sector].length}</b></span>)}
            </div>
            {!canStart && getSchoolYear(state.school.currentMonth) < reptile.nextPreparationSchoolYear ? (
              <p>La prossima preparazione potrà iniziare da settembre, nell'anno scolastico {reptile.nextPreparationSchoolYear}.</p>
            ) : null}
            <button type="button" className="primary" disabled={!canStart || !allSectorsCovered} onClick={() => onStartPreparation(assignments)}>Avvia la preparazione</button>
          </section>
          {reptile.latestRecap ? <ReptileRecap result={reptile.latestRecap} /> : null}
        </>
      ) : null}

      {edition?.status === "minigame" && edition.minigame.status === "ready" ? (
        <section className="reptile-setup-card">
          <h3>Bonus di coordinamento</h3>
          <p>In 30 secondi appariranno 50 cerchi. Il risultato modificherà qualità e velocità di tutti i settori da −50% a +50%. Puoi anche saltare senza bonus né malus.</p>
          <div className="reptile-actions"><button type="button" className="primary" onClick={onStartMinigame}>Gioca il mini-gioco</button><button type="button" onClick={onSkipMinigame}>Salta</button><button type="button" onClick={onCancelPreparation}>Annulla preparazione</button></div>
        </section>
      ) : null}

      {edition?.sectors && (edition.status === "preparing" || edition.status === "ready" || edition.status === "booked") ? (
        <section className="reptile-preparation-dashboard">
          <header><div><h3>Preparazione del torneo</h3><p>Mini-gioco: {edition.minigame.modifierPercent >= 0 ? "+" : ""}{edition.minigame.modifierPercent}%</p></div><span>{edition.status === "ready" ? "Pronto" : edition.status === "booked" ? "Palazzetto prenotato" : "In lavorazione"}</span></header>
          <div className="reptile-sector-cards">
            {REPTILE_SECTORS.map((sector) => {
              const progress = edition.sectors![sector];
              return <article key={sector}><div><small>{REPTILE_SECTOR_LABELS[sector]}</small><strong>{Math.round(progress.quality)}/100</strong><span>{getReptileQualityLabel(progress.quality)}</span></div><progress max={1} value={progress.progress} /><p>{Math.round(progress.progress * 100)}% · potenza {progress.effectivePower.toFixed(2)} / carico {progress.load.toFixed(1)}</p></article>;
            })}
          </div>
          {edition.status === "ready" ? (
            <div className="reptile-booking-card"><div><h3>Prenota il palazzetto</h3><p>Il costo di {formatCurrency(GAME_CONFIG.reptileVenueCost)} viene pagato subito e non è rimborsabile. {getGameMonthName(state.school.currentMonth) === "Luglio" ? "Il torneo inizierà subito." : "Il torneo inizierà il prossimo luglio."}</p></div><button type="button" className="primary" disabled={state.school.euros < GAME_CONFIG.reptileVenueCost} onClick={onBookVenue}>Prenota palazzetto · {formatCurrency(GAME_CONFIG.reptileVenueCost)}</button><button type="button" onClick={onCancelPreparation}>Annulla preparazione</button></div>
          ) : null}
          {edition.status === "booked" ? <p className="reptile-booked-note">Palazzetto prenotato. Il torneo si terrà a luglio (mese di gioco {edition.scheduledMonth}); partecipanti e spade saranno calcolati all'inizio dell'evento.</p> : null}
        </section>
      ) : null}

      {reptile.hall.length > 0 ? (
        <section className="reptile-hall"><h3>Albo d'oro Reptile</h3>{[...reptile.hall].reverse().map((entry) => <div key={`${entry.schoolYear}-${entry.teamId}`}><b>Anno {entry.schoolYear}</b><span>{entry.athleteNames.join(" / ")}</span><small>{entry.schoolName}</small></div>)}</section>
      ) : null}
    </div>
  );
}
