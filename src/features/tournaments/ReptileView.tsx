import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getGameMonthName, getSchoolYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { useGameSelector } from "../../game/GameStateContext";
import {
  REPTILE_SECTORS,
  REPTILE_SECTOR_LABELS,
  canStartReptilePreparation,
  getReptileQualityLabel,
  getReptileTeamCount,
} from "../../game/reptilePreparation";
import { getReptilePresentationStepCount } from "../../game/reptileFlow";
import type {
  Collaborator,
  GameState,
  ReptileActiveEdition,
  ReptileMatch,
  ReptileSector,
  ReptileSectorAssignments,
  ReptileTeam,
  ReptileTournamentResult,
} from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { ReptileCircleGame } from "./ReptileCircleGame";

type ReptilePage = "overview" | "preparation" | "coordination" | "bracket" | "recap";
type ReptilePageState = "active" | "complete" | "available" | "locked";

const REPTILE_PAGES: readonly {
  id: ReptilePage;
  label: string;
  icon: IconName;
}[] = [
  { id: "overview", label: "Panoramica", icon: "spark" },
  { id: "preparation", label: "Preparazione", icon: "wrench" },
  { id: "coordination", label: "Coordinamento", icon: "play" },
  { id: "bracket", label: "Tabellone", icon: "trophy" },
  { id: "recap", label: "Recap", icon: "flag" },
];

const ASSIGNMENT_LABEL: Record<Exclude<Collaborator["assignment"], null>, string> = {
  writing: "Scrittura / Social",
  events: "Eventi",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
  gadget: "Gadget",
};

const REPTILE_SECTOR_ICONS: Record<ReptileSector, IconName> = {
  social: "megaphone",
  equipment: "wrench",
  gadget: "gift",
  events: "calendar",
};

function teamLabel(team: ReptileTeam | undefined): string {
  if (!team) return "—";
  return `${team.athletes[0].lastName} / ${team.athletes[1].lastName}`;
}

function getResultForReptileView(
  reptile: GameState["tournaments"]["reptile"],
): ReptileTournamentResult | undefined {
  return reptile.activeEdition?.result ?? reptile.latestRecap;
}

function getPreferredReptilePage(
  reptile: GameState["tournaments"]["reptile"],
): ReptilePage {
  if (!reptile.unlocked) return "overview";
  if (reptile.activeEdition?.status === "minigame") return "coordination";
  if (reptile.activeEdition?.status === "presenting") return "bracket";
  if (reptile.activeEdition) return "preparation";
  if (reptile.latestRecap) return "recap";
  return "preparation";
}

function isReptilePageLocked(
  page: ReptilePage,
  reptile: GameState["tournaments"]["reptile"],
): boolean {
  const edition = reptile.activeEdition;
  const result = getResultForReptileView(reptile);
  if (page === "overview") return false;
  if (page === "preparation") return !reptile.unlocked;
  if (page === "coordination") return !edition;
  if (page === "bracket") return !result;
  if (page === "recap") return !reptile.latestRecap;
  return true;
}

function getReptilePageState(
  page: ReptilePage,
  activePage: ReptilePage,
  reptile: GameState["tournaments"]["reptile"],
): ReptilePageState {
  if (isReptilePageLocked(page, reptile)) return "locked";
  if (page === activePage) return "active";
  if (page === "overview" && (reptile.activeEdition || reptile.latestRecap)) return "complete";
  if (page === "preparation" && reptile.activeEdition && reptile.activeEdition.status !== "minigame") {
    return "complete";
  }
  if (
    page === "coordination" &&
    reptile.activeEdition &&
    reptile.activeEdition.minigame.status !== "ready"
  ) {
    return "complete";
  }
  if (page === "bracket" && reptile.latestRecap) return "complete";
  return "available";
}

function getReptilePageStatusLabel(state: ReptilePageState): string {
  if (state === "active") return "In corso";
  if (state === "complete") return "Completata";
  if (state === "available") return "Disponibile";
  return "Bloccata";
}

function getEditionStatusLabel(edition: ReptileActiveEdition | undefined): string {
  if (!edition) return "Preparazione disponibile";
  if (edition.status === "minigame") return "Coordinamento da completare";
  if (edition.status === "preparing") return "Preparazione in corso";
  if (edition.status === "ready") return "Pronto per il palazzetto";
  if (edition.status === "booked") return "Palazzetto prenotato";
  return "Torneo in corso";
}

function ReptileHero({
  reptile,
  edition,
  activePage,
}: {
  reptile: GameState["tournaments"]["reptile"];
  edition?: ReptileActiveEdition;
  activePage: ReptilePage;
}) {
  const difficulty = TOURNAMENT_DEFINITIONS.champions.standard * 1.1 ** reptile.victories;
  const teamCount = edition?.teamCount ?? getReptileTeamCount(reptile.fameXp);
  const pageLabel = REPTILE_PAGES.find((page) => page.id === activePage)?.label ?? "Panoramica";
  return (
    <section className="reptile-hero" aria-labelledby="reptile-title">
      <div className="reptile-hero-copy">
        <span className="reptile-hero-kicker">Open · Genova</span>
        <h2 id="reptile-title">Torneo Reptile</h2>
        <p>
          Un torneo a coppie con gironi svizzeri, migliori 16 alla fase finale e sfide alla meglio
          dei cinque.
        </p>
        <span className="reptile-hero-current">Pagina: {pageLabel} · {getEditionStatusLabel(edition)}</span>
      </div>
      <div className="reptile-hero-stats" aria-label="Metriche del Torneo Reptile">
        <div>
          <Icon name="spark" />
          <span>Fama</span>
          <strong>{reptile.fameXp}</strong>
          <small>{reptile.fameXp}/3000 XP</small>
        </div>
        <div>
          <Icon name="people" />
          <span>Team previsti</span>
          <strong>{teamCount}</strong>
          <small>{reptile.victories} vittorie della scuola</small>
        </div>
        <div>
          <Icon name="trend" />
          <span>Difficoltà</span>
          <strong>{Math.round(difficulty)}</strong>
          <small>Champion&apos;s × {(1.1 ** reptile.victories).toFixed(2)}</small>
        </div>
      </div>
    </section>
  );
}

function ReptileStepper({
  reptile,
  activePage,
  onPageChange,
}: {
  reptile: GameState["tournaments"]["reptile"];
  activePage: ReptilePage;
  onPageChange: (page: ReptilePage) => void;
}) {
  const flowLocked = reptile.activeEdition?.status === "presenting" ||
    (reptile.activeEdition?.status === "minigame" && reptile.activeEdition.minigame.status === "running");
  return (
    <nav className="reptile-stepper" aria-label="Percorso del Torneo Reptile" role="tablist">
      {REPTILE_PAGES.map((page) => {
        const state = getReptilePageState(page.id, activePage, reptile);
        const disabled = state === "locked" || (flowLocked && page.id !== activePage);
        return (
          <button
            key={page.id}
            id={`reptile-tab-${page.id}`}
            type="button"
            role="tab"
            aria-selected={activePage === page.id}
            aria-controls={`reptile-panel-${page.id}`}
            aria-label={`${page.label}: ${getReptilePageStatusLabel(state)}`}
            className={`is-${state}`}
            disabled={disabled}
            onClick={() => onPageChange(page.id)}
          >
            <span className="reptile-stepper-icon">
              <Icon name={state === "complete" ? "check" : state === "locked" ? "lock" : page.icon} />
            </span>
            <span>{page.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ReptileShell({
  reptile,
  activePage,
  onPageChange,
  children,
}: {
  reptile: GameState["tournaments"]["reptile"];
  activePage: ReptilePage;
  onPageChange: (page: ReptilePage) => void;
  children: ReactNode;
}) {
  return (
    <div className="reptile-view">
      <ReptileHero reptile={reptile} edition={reptile.activeEdition} activePage={activePage} />
      <ReptileStepper reptile={reptile} activePage={activePage} onPageChange={onPageChange} />
      <div
        id={`reptile-panel-${activePage}`}
        className="reptile-page"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`reptile-tab-${activePage}`}
      >
        {children}
      </div>
    </div>
  );
}

function ReptileDossier({
  state,
  reptile,
  edition,
}: {
  state: GameState;
  reptile: GameState["tournaments"]["reptile"];
  edition?: ReptileActiveEdition;
}) {
  const canStart = canStartReptilePreparation(state);
  const schedule = edition?.scheduledMonth
    ? getGameMonthName(edition.scheduledMonth)
    : canStart
      ? "Disponibile ora"
      : `Anno scolastico ${reptile.nextPreparationSchoolYear}`;
  return (
    <aside className="reptile-dossier" aria-label="Dossier del torneo">
      <header>
        <div>
          <span>Dossier evento</span>
          <h3>Open Reptile</h3>
        </div>
        <Icon name="flag" />
      </header>
      <dl>
        <div><dt>Sede</dt><dd>{state.school.city}</dd></div>
        <div><dt>Periodo</dt><dd>{schedule}</dd></div>
        <div><dt>Costo palazzetto</dt><dd>{formatCurrency(GAME_CONFIG.reptileVenueCost)}</dd></div>
        <div><dt>Formato</dt><dd>Swiss · top 16 · best-of-five</dd></div>
        <div><dt>Squadra</dt><dd>Due atleti della stessa scuola</dd></div>
      </dl>
    </aside>
  );
}

function ReptileLockedStep({
  title,
  copy,
  actionLabel,
  onAction,
  heading = true,
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
  heading?: boolean;
}) {
  return (
    <section className="reptile-step-locked">
      <Icon name="lock" />
      <div>
        {heading ? <h2>{title}</h2> : <strong className="reptile-locked-label">{title}</strong>}
        <p>{copy}</p>
        {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
      </div>
    </section>
  );
}

function ReptileOverviewPage({
  state,
  reptile,
  onNavigate,
}: {
  state: GameState;
  reptile: GameState["tournaments"]["reptile"];
  onNavigate: (page: ReptilePage) => void;
}) {
  const edition = reptile.activeEdition;
  const nextPage = getPreferredReptilePage(reptile);
  return (
    <div className="reptile-page-grid reptile-overview-page">
      <section className="reptile-panel reptile-overview-story">
        <header className="reptile-panel-heading">
          <div>
            <span className="reptile-section-kicker">Il percorso dell&apos;edizione</span>
            <h2>Un Open costruito passo dopo passo</h2>
          </div>
          <span className="reptile-status-mark">{getEditionStatusLabel(edition)}</span>
        </header>
        <p>
          Il Reptile mette insieme quattro settori della scuola. La loro qualità determina la
          preparazione, il pubblico, le entrate Gadget e la forza con cui la squadra affronta il
          torneo.
        </p>
        <ol className="reptile-route-list">
          <li><b>01</b><span><strong>Preparazione</strong><small>Distribuisci i collaboratori e fai crescere i settori.</small></span></li>
          <li><b>02</b><span><strong>Coordinamento</strong><small>Un solo ritmo comune può migliorare o peggiorare il risultato.</small></span></li>
          <li><b>03</b><span><strong>Tabellone</strong><small>Gironi svizzeri, classifica e fase finale a 16 squadre.</small></span></li>
          <li><b>04</b><span><strong>Recap</strong><small>Leggi fama, pubblico, risultato economico e albo d&apos;oro.</small></span></li>
        </ol>
        <footer className="reptile-panel-actions">
          <button type="button" className="primary" onClick={() => onNavigate(nextPage)}>
            Vai a {REPTILE_PAGES.find((page) => page.id === nextPage)?.label.toLocaleLowerCase("it-IT")}
            <Icon name="arrowRight" />
          </button>
        </footer>
      </section>
      <ReptileDossier state={state} reptile={reptile} edition={edition} />
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

function ReptileAssignmentPage({
  state,
  eligibleCollaborators,
  sectorByCollaborator,
  setSectorByCollaborator,
  onStartPreparation,
  onNavigate,
}: {
  state: GameState;
  eligibleCollaborators: readonly Collaborator[];
  sectorByCollaborator: Record<string, ReptileSector>;
  setSectorByCollaborator: Dispatch<SetStateAction<Record<string, ReptileSector>>>;
  onStartPreparation: (assignments: ReptileSectorAssignments) => void;
  onNavigate: (page: ReptilePage) => void;
}) {
  const reptile = state.tournaments.reptile;
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
  return (
    <div className="reptile-page-grid reptile-preparation-page">
      <section className="reptile-panel reptile-assignment-panel">
        <header className="reptile-panel-heading">
          <div>
            <span className="reptile-section-kicker">01 · Preparazione</span>
            <h2>Distribuisci i collaboratori</h2>
            <p>Assegna ogni collaboratore a un settore: il lavoro ordinario verrà sospeso fino alla fine della preparazione.</p>
          </div>
          <span className="reptile-count-mark">{eligibleCollaborators.length} disponibili</span>
        </header>
        {eligibleCollaborators.length >= 4 ? (
          <div className="reptile-collaborator-assignment">
            {eligibleCollaborators.map((collaborator) => (
              <label key={collaborator.id}>
                <span className="reptile-collaborator-icon"><Icon name="contact" /></span>
                <span className="reptile-collaborator-copy">
                  <strong>{collaborator.displayName}</strong>
                  <small>Ora: {collaborator.assignment ? ASSIGNMENT_LABEL[collaborator.assignment] : "Nessun incarico"}</small>
                </span>
                <select
                  aria-label={`Settore di ${collaborator.displayName}`}
                  value={resolvedSectorByCollaborator[collaborator.id]}
                  onChange={(event) => setSectorByCollaborator((current) => ({
                    ...current,
                    [collaborator.id]: event.target.value as ReptileSector,
                  }))}
                >
                  {REPTILE_SECTORS.map((sector) => (
                    <option key={sector} value={sector}>{REPTILE_SECTOR_LABELS[sector]}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : (
          <p className="reptile-inline-warning">Servono almeno quattro collaboratori non assegnati come Istruttori: uno per ciascun settore.</p>
        )}
        <div className="reptile-sector-counts" aria-label="Collaboratori per settore">
          {REPTILE_SECTORS.map((sector) => (
            <div key={sector}>
              <span className="reptile-sector-count-icon"><Icon name={REPTILE_SECTOR_ICONS[sector]} /></span>
              <span><small>{REPTILE_SECTOR_LABELS[sector]}</small><strong>{assignments[sector].length}</strong></span>
            </div>
          ))}
        </div>
        {!canStart && getSchoolYear(state.school.currentMonth) < reptile.nextPreparationSchoolYear ? (
          <p className="reptile-inline-warning">
            La prossima preparazione potrà iniziare da settembre, nell&apos;anno scolastico {reptile.nextPreparationSchoolYear}.
          </p>
        ) : null}
        <footer className="reptile-panel-actions">
          <button type="button" className="primary" disabled={!canStart || !allSectorsCovered} onClick={() => onStartPreparation(assignments)}>
            Avvia la preparazione <Icon name="arrowRight" />
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate("overview")}>Torna alla panoramica</button>
        </footer>
      </section>
      <ReptileDossier state={state} reptile={reptile} />
    </div>
  );
}

function ReptileSectorProgress({
  state,
  edition,
  onBookVenue,
  onCancelPreparation,
  onNavigate,
}: {
  state: GameState;
  edition: ReptileActiveEdition;
  onBookVenue: () => void;
  onCancelPreparation: () => void;
  onNavigate: (page: ReptilePage) => void;
}) {
  if (!edition.sectors) {
    return (
      <section className="reptile-panel reptile-preparation-waiting">
        <span className="reptile-section-kicker">01 · Preparazione</span>
        <h2>La preparazione è pronta per il coordinamento</h2>
        <p>Completa o salta il mini-gioco per applicare il modificatore comune ai quattro settori.</p>
        <button type="button" className="primary" onClick={() => onNavigate("coordination")}>
          Vai al coordinamento <Icon name="arrowRight" />
        </button>
      </section>
    );
  }
  const statusLabel = edition.status === "ready"
    ? "Pronto"
    : edition.status === "booked"
      ? "Palazzetto prenotato"
      : "In lavorazione";
  return (
    <section className="reptile-panel reptile-preparation-dashboard">
      <header className="reptile-panel-heading">
        <div>
          <span className="reptile-section-kicker">01 · Preparazione</span>
          <h2>Preparazione del torneo</h2>
          <p>Il modificatore di coordinamento è {edition.minigame.modifierPercent >= 0 ? "+" : ""}{edition.minigame.modifierPercent}%.</p>
        </div>
        <span className="reptile-status-mark">{statusLabel}</span>
      </header>
      <div className="reptile-sector-progress-list">
        {REPTILE_SECTORS.map((sector) => {
          const progress = edition.sectors![sector];
          return (
            <article key={sector}>
              <div className="reptile-sector-progress-heading">
                <span className="reptile-sector-count-icon"><Icon name={REPTILE_SECTOR_ICONS[sector]} /></span>
                <div><small>{REPTILE_SECTOR_LABELS[sector]}</small><strong>{Math.round(progress.quality)}/100</strong></div>
                <b>{getReptileQualityLabel(progress.quality)}</b>
              </div>
              <progress max={1} value={progress.progress} aria-label={`Progresso ${REPTILE_SECTOR_LABELS[sector]}`} />
              <p>{Math.round(progress.progress * 100)}% · potenza {progress.effectivePower.toFixed(2)} / carico {progress.load.toFixed(1)}</p>
            </article>
          );
        })}
      </div>
      {edition.status === "ready" ? (
        <div className="reptile-booking-card">
          <div>
            <span className="reptile-section-kicker">Prossimo passo</span>
            <h3>Prenota il palazzetto</h3>
            <p>
              Il costo di {formatCurrency(GAME_CONFIG.reptileVenueCost)} viene pagato subito e non è rimborsabile.{' '}
              {getGameMonthName(state.school.currentMonth) === "Luglio" ? "Il torneo inizierà subito." : "Il torneo inizierà il prossimo luglio."}
            </p>
          </div>
          <button type="button" className="primary" disabled={state.school.euros < GAME_CONFIG.reptileVenueCost} onClick={onBookVenue}>
            Prenota palazzetto · {formatCurrency(GAME_CONFIG.reptileVenueCost)}
          </button>
          <button type="button" className="secondary" onClick={onCancelPreparation}>Annulla preparazione</button>
        </div>
      ) : null}
      {edition.status === "booked" ? (
        <p className="reptile-inline-note">Palazzetto prenotato. Il torneo si terrà a luglio (mese di gioco {edition.scheduledMonth}); partecipanti e spade saranno calcolati all&apos;inizio dell&apos;evento.</p>
      ) : null}
    </section>
  );
}

function ReptilePreparationPage({
  state,
  eligibleCollaborators,
  sectorByCollaborator,
  setSectorByCollaborator,
  onStartPreparation,
  onBookVenue,
  onCancelPreparation,
  onNavigate,
}: {
  state: GameState;
  eligibleCollaborators: readonly Collaborator[];
  sectorByCollaborator: Record<string, ReptileSector>;
  setSectorByCollaborator: Dispatch<SetStateAction<Record<string, ReptileSector>>>;
  onStartPreparation: (assignments: ReptileSectorAssignments) => void;
  onBookVenue: () => void;
  onCancelPreparation: () => void;
  onNavigate: (page: ReptilePage) => void;
}) {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition) {
    return (
      <ReptileAssignmentPage
        state={state}
        eligibleCollaborators={eligibleCollaborators}
        sectorByCollaborator={sectorByCollaborator}
        setSectorByCollaborator={setSectorByCollaborator}
        onStartPreparation={onStartPreparation}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <div className="reptile-page-grid reptile-preparation-page">
      <ReptileSectorProgress
        state={state}
        edition={edition}
        onBookVenue={onBookVenue}
        onCancelPreparation={onCancelPreparation}
        onNavigate={onNavigate}
      />
      <ReptileDossier state={state} reptile={state.tournaments.reptile} edition={edition} />
    </div>
  );
}

function ReptileCoordinationPage({
  edition,
  onStartMinigame,
  onCompleteMinigame,
  onSkipMinigame,
  onCancelPreparation,
  onNavigate,
}: {
  edition?: ReptileActiveEdition;
  onStartMinigame: () => void;
  onCompleteMinigame: (hits: number, misses: number, outsideClicks: number) => void;
  onSkipMinigame: () => void;
  onCancelPreparation: () => void;
  onNavigate: (page: ReptilePage) => void;
}) {
  if (!edition) {
    return (
      <ReptileLockedStep
        title="Il coordinamento non è ancora disponibile"
        copy="Prima distribuisci i collaboratori nei quattro settori della preparazione."
        actionLabel="Vai alla preparazione"
        onAction={() => onNavigate("preparation")}
      />
    );
  }
  if (edition.status === "minigame" && edition.minigame.status === "running") {
    return (
      <ReptileCircleGame
        editionId={edition.id}
        minigame={edition.minigame}
        onComplete={onCompleteMinigame}
      />
    );
  }
  if (edition.status === "minigame" && edition.minigame.status === "ready") {
    return (
      <section className="reptile-panel reptile-coordination-intro">
        <div className="reptile-coordination-heading">
          <span className="reptile-section-kicker">02 · Coordinamento</span>
          <h2>Prendi il ritmo dell&apos;organizzazione</h2>
          <p>In 30 secondi appariranno 50 cerchi. Il risultato modificherà qualità e velocità di tutti i settori da −50% a +50%.</p>
        </div>
        <div className="reptile-coordination-rules">
          <div><strong>50</strong><span>cerchi attivi</span></div>
          <div><strong>+1%</strong><span>per ogni colpo</span></div>
          <div><strong>−1%</strong><span>per ogni clic fuori</span></div>
        </div>
        <footer className="reptile-panel-actions">
          <button type="button" className="primary" onClick={onStartMinigame}>Gioca il coordinamento <Icon name="play" /></button>
          <button type="button" className="secondary" onClick={onSkipMinigame}>Salta il coordinamento</button>
          <button type="button" className="text-button" onClick={onCancelPreparation}>Annulla preparazione</button>
        </footer>
      </section>
    );
  }
  return (
    <section className="reptile-panel reptile-coordination-complete">
      <span className="reptile-section-kicker">02 · Coordinamento completato</span>
      <h2>Il ritmo è stato registrato</h2>
      <p>Il modificatore applicato alla preparazione è già salvato nell&apos;edizione.</p>
      <strong className={edition.minigame.modifierPercent >= 0 ? "is-positive" : "is-negative"}>
        {edition.minigame.modifierPercent >= 0 ? "+" : ""}{edition.minigame.modifierPercent}%
      </strong>
      <button type="button" className="primary" onClick={() => onNavigate("preparation")}>Vai alla preparazione <Icon name="arrowRight" /></button>
    </section>
  );
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
            <div><strong>{teamLabel(teamA)}</strong><small>{teamA?.schoolName}</small></div>
            <b>{match.scoreA}–{match.scoreB}</b>
            <div><strong>{teamLabel(teamB)}</strong><small>{teamB?.schoolName}</small></div>
          </article>
        );
      })}
    </div>
  );
}

function ReptileStandingTable({
  result,
  limit,
}: {
  result: ReptileTournamentResult;
  limit?: number;
}) {
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const standings = limit ? result.standings.slice(0, limit) : result.standings;
  return (
    <div className="reptile-standing-table" role="table" aria-label="Classifica svizzera completa">
      <div className="reptile-standing-head" role="row">
        <span role="columnheader">Pos.</span><span role="columnheader">Squadra</span><span role="columnheader">V-P</span><span role="columnheader">Diff.</span>
      </div>
      {standings.map((standing) => {
        const team = teamsById.get(standing.teamId);
        return (
          <div key={standing.teamId} className={standing.qualified ? "is-qualified" : ""} role="row">
            <b>{standing.rank}</b>
            <span><strong>{teamLabel(team)}</strong><small>{team?.schoolName}</small></span>
            <span>{standing.wins}–{standing.losses}</span>
            <span>{standing.pointsFor - standing.pointsAgainst >= 0 ? "+" : ""}{standing.pointsFor - standing.pointsAgainst}</span>
          </div>
        );
      })}
    </div>
  );
}

const REPTILE_BRACKET_STAGES: readonly {
  phase: ReptileMatch["phase"];
  label: string;
}[] = [
  { phase: "round16", label: "Ottavi di finale" },
  { phase: "quarterfinal", label: "Quarti di finale" },
  { phase: "semifinal", label: "Semifinali" },
  { phase: "final", label: "Finale" },
];

function ReptileBracket({ result }: { result: ReptileTournamentResult }) {
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  return (
    <section className="reptile-bracket-panel" aria-labelledby="reptile-bracket-title">
      <header className="reptile-panel-heading">
        <div><span className="reptile-section-kicker">03 · Tabellone</span><h2 id="reptile-bracket-title">Fase finale</h2></div>
        <span className="reptile-count-mark">Top 16 · seed 1–16</span>
      </header>
      <div className="reptile-bracket-scroll">
        <div className="reptile-bracket">
          {REPTILE_BRACKET_STAGES.map((stage) => {
            const matches = result.matches.filter((match) => match.phase === stage.phase);
            return (
              <section key={stage.phase} className={`reptile-bracket-stage is-${stage.phase}`}>
                <h3>{stage.label}</h3>
                <div className="reptile-bracket-matches">
                  {matches.map((match) => {
                    const teamA = teamsById.get(match.teamAId);
                    const teamB = teamsById.get(match.teamBId);
                    return (
                      <article key={match.id} className="reptile-bracket-match">
                        <div className={match.winnerId === match.teamAId ? "is-winner" : ""}><span>{teamLabel(teamA)}</span><b>{match.scoreA}</b></div>
                        <div className={match.winnerId === match.teamBId ? "is-winner" : ""}><span>{teamLabel(teamB)}</span><b>{match.scoreB}</b></div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReptileRecap({
  result,
  compact = false,
}: {
  result: ReptileTournamentResult;
  compact?: boolean;
}) {
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const winner = teamsById.get(result.podiumTeamIds[0]);
  const titleId = `reptile-recap-title-${result.id}`;
  return (
    <section className={`reptile-recap-panel${compact ? " is-compact" : ""}`} aria-labelledby={titleId}>
      <header className="reptile-panel-heading">
        <div>
          <span className="reptile-section-kicker">Edizione conclusa · anno scolastico {result.schoolYear}</span>
          <h2 id={titleId}>{teamLabel(winner)} vince il Torneo Reptile</h2>
          <p>{winner?.schoolName} · {winner?.city}</p>
        </div>
        <span className="reptile-winner-mark"><Icon name="trophy" /></span>
      </header>
      <div className="reptile-recap-grid">
        <article><small>Partecipazione</small><strong>{result.teamCount} team</strong><span>{result.swissRounds} turni svizzeri</span></article>
        <article><small>Fama del torneo</small><strong>{result.economy.fameAfter} XP</strong><span>{result.economy.fameDelta >= 0 ? "+" : ""}{result.economy.fameDelta} XP</span></article>
        <article><small>Pubblico</small><strong>+{result.economy.followersGained}</strong><span>nuovi follower</span></article>
        <article><small>Risultato economico</small><strong>{formatCurrency(result.economy.netResult)}</strong><span>Gadget {formatCurrency(result.economy.gadgetGross)} · affitto {formatCurrency(result.economy.venueCost)} · spade {formatCurrency(result.economy.rentalCost)}</span></article>
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
      <p className="reptile-inline-note">
        {result.economy.usedSchoolSwords} spade della scuola usate, {result.economy.rentedSwords} noleggiate, usura totale {result.economy.swordWear}.
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
  let content: ReactNode;
  let title: string;
  let phaseIndex = 0;
  if (step < 4) {
    const sector = REPTILE_SECTORS[step] ?? "social";
    const sectorCopy: Record<ReptileSector, string> = {
      social: `${result.teamCount} team hanno risposto alla campagna. La qualità Social porta ${result.economy.followersGained} nuovi follower.`,
      equipment: `${result.economy.usedSchoolSwords} spade disponibili e ${result.economy.rentedSwords} noleggiate per completare l'allestimento.`,
      gadget: `Il banchetto può generare ${formatCurrency(result.economy.gadgetGross)} di entrate lorde.`,
      events: "Accoglienza, arbitri e tabellone sono pronti. La qualità Eventi ha influenzato la selezione degli atleti di Genova.",
    };
    title = `Il lavoro del settore ${REPTILE_SECTOR_LABELS[sector]}`;
    content = <p className="reptile-interlude-copy">{sectorCopy[sector]}</p>;
  } else if (step < standingsStep) {
    phaseIndex = 1;
    const round = step - swissStart + 1;
    const matches = result.matches.filter((match) => match.phase === "swiss" && match.round === round);
    const homeMatches = matches.filter((match) => teamsById.get(match.teamAId)?.home || teamsById.get(match.teamBId)?.home);
    title = `Girone svizzero · turno ${round}/${result.swissRounds}`;
    content = (
      <>
        <p className="reptile-page-lead">{matches.length} sfide disputate · {matches.length - homeMatches.length} incontri esterni riepilogati.</p>
        {homeMatches.length > 0 ? <ReptileMatchRows matches={homeMatches} teamsById={teamsById} /> : <p className="reptile-inline-note">Nessun team di Genova in questo turno.</p>}
      </>
    );
  } else if (step === standingsStep) {
    phaseIndex = 2;
    title = "Classifica finale dei gironi svizzeri";
    content = <ReptileStandingTable result={result} />;
  } else if (step < recapStep) {
    phaseIndex = 3;
    const stageIndex = step - knockoutStart;
    const stageGroups: ReptileMatch["phase"][][] = [["round16"], ["quarterfinal"], ["semifinal"], ["bronze", "final"]];
    const labels = ["Ottavi di finale", "Quarti di finale", "Semifinali", "Finali"];
    const phases = stageGroups[stageIndex] ?? stageGroups[3];
    const matches = result.matches.filter((match) => phases.includes(match.phase));
    title = labels[stageIndex] ?? "Fase a eliminazione";
    content = <ReptileMatchRows matches={matches} teamsById={teamsById} />;
  } else {
    phaseIndex = 4;
    title = "Il Torneo Reptile è concluso";
    content = <ReptileRecap result={result} />;
  }
  const phases = ["Settori", "Gironi svizzeri", "Classifica", "Fase finale", "Recap"];
  return (
    <section className="reptile-presentation-page" aria-labelledby="reptile-presentation-title">
      <header className="reptile-panel-heading">
        <div><span className="reptile-section-kicker">03 · Tabellone · presentazione</span><h2 id="reptile-presentation-title">{title}</h2></div>
        <span className="reptile-count-mark">Passo {step + 1} di {recapStep + 1}</span>
      </header>
      <ol className="reptile-presentation-phases" aria-label="Avanzamento presentazione">
        {phases.map((label, index) => <li key={label} className={index < phaseIndex ? "is-complete" : index === phaseIndex ? "is-active" : ""}><span>{index < phaseIndex ? "✓" : index + 1}</span>{label}</li>)}
      </ol>
      <div className="reptile-presentation-content">{content}</div>
      <footer className="reptile-panel-actions">
        {step < recapStep ? <button type="button" className="secondary" onClick={onSkip}>Salta la presentazione</button> : <span />}
        <button type="button" className="primary" onClick={onContinue}>{step === recapStep ? "Concludi il torneo" : "Continua"} <Icon name="arrowRight" /></button>
      </footer>
    </section>
  );
}

function ReptileBracketPage({
  reptile,
  onAdvancePresentation,
  onSkipPresentation,
  onNavigate,
}: {
  reptile: GameState["tournaments"]["reptile"];
  onAdvancePresentation: () => void;
  onSkipPresentation: () => void;
  onNavigate: (page: ReptilePage) => void;
}) {
  const result = getResultForReptileView(reptile);
  if (!result) {
    return (
      <ReptileLockedStep
        title="Il tabellone si aprirà all'inizio del torneo"
        copy="Completa la preparazione, applica il coordinamento e prenota il palazzetto per generare il tabellone."
        actionLabel="Vai al coordinamento"
        onAction={() => onNavigate(reptile.activeEdition ? "coordination" : "preparation")}
      />
    );
  }
  if (reptile.activeEdition?.status === "presenting" && reptile.activeEdition.result) {
    return (
      <ReptilePresentation
        result={reptile.activeEdition.result}
        step={reptile.activeEdition.presentationStep}
        onContinue={onAdvancePresentation}
        onSkip={onSkipPresentation}
      />
    );
  }
  return (
    <div className="reptile-results-page">
      <ReptileBracket result={result} />
      <div className="reptile-results-side-grid">
        <section className="reptile-panel reptile-standing-panel">
          <header className="reptile-panel-heading"><div><span className="reptile-section-kicker">Gironi svizzeri</span><h2>Classifica</h2></div><span className="reptile-count-mark">{result.teamCount} team</span></header>
          <ReptileStandingTable result={result} limit={16} />
          {result.standings.length > 16 ? <p className="reptile-inline-note">Le altre squadre restano disponibili nella classifica completa della presentazione.</p> : null}
        </section>
        <section className="reptile-panel reptile-board-next">
          <span className="reptile-section-kicker">Prossimo passo</span>
          <h2>Leggi il recap dell&apos;edizione</h2>
          <p>Fama, pubblico, settori e risultato economico sono raccolti nella pagina finale.</p>
          <button type="button" className="primary" onClick={() => onNavigate("recap")}>Vai al recap <Icon name="arrowRight" /></button>
        </section>
      </div>
    </div>
  );
}

function ReptileRecapPage({ reptile }: { reptile: GameState["tournaments"]["reptile"] }) {
  if (!reptile.latestRecap) {
    return <ReptileLockedStep title="Il recap arriverà dopo la conclusione" copy="Quando il torneo sarà completato troverai qui vincitore, ricavi, fama e albo d'oro." />;
  }
  return (
    <div className="reptile-recap-page">
      <ReptileRecap result={reptile.latestRecap} />
      <section className="reptile-hall-panel">
        <header className="reptile-panel-heading"><div><span className="reptile-section-kicker">Memoria del torneo</span><h2>Albo d&apos;oro Reptile</h2></div><span className="reptile-count-mark">{reptile.hall.length} edizioni</span></header>
        {reptile.hall.length > 0 ? (
          <div className="reptile-hall-list">
            {[...reptile.hall].reverse().map((entry) => <div key={`${entry.schoolYear}-${entry.teamId}`}><b>Anno {entry.schoolYear}</b><span>{entry.athleteNames.join(" / ")}</span><small>{entry.schoolName}</small></div>)}
          </div>
        ) : <p className="reptile-inline-note">L&apos;albo d&apos;oro è ancora vuoto.</p>}
      </section>
    </div>
  );
}

function selectReptileViewState(state: GameState): GameState {
  return state;
}

function haveSameReptileViewState(left: GameState, right: GameState): boolean {
  return left.tournaments.reptile === right.tournaments.reptile &&
    left.school.currentMonth === right.school.currentMonth &&
    left.school.euros === right.school.euros &&
    left.collaborators.length === right.collaborators.length &&
    left.collaborators.every((collaborator, index) => {
      const current = right.collaborators[index];
      return collaborator.id === current.id &&
        collaborator.displayName === current.displayName &&
        collaborator.assignment === current.assignment;
    });
}

export function ReptileView({
  state: stateOverride,
  onStartPreparation,
  onStartMinigame,
  onCompleteMinigame,
  onSkipMinigame,
  onCancelPreparation,
  onBookVenue,
  onAdvancePresentation,
  onSkipPresentation,
}: {
  state?: GameState;
  onStartPreparation: (assignments: ReptileSectorAssignments) => void;
  onStartMinigame: () => void;
  onCompleteMinigame: (hits: number, misses: number, outsideClicks: number) => void;
  onSkipMinigame: () => void;
  onCancelPreparation: () => void;
  onBookVenue: () => void;
  onAdvancePresentation: () => void;
  onSkipPresentation: () => void;
}) {
  const state = useGameSelector(selectReptileViewState, stateOverride, haveSameReptileViewState);
  const reptile = state.tournaments.reptile;
  const edition = reptile.activeEdition;
  const eligibleCollaborators = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment !== "instructor"),
    [state.collaborators],
  );
  const [activePage, setActivePage] = useState<ReptilePage>(() => getPreferredReptilePage(reptile));
  const [sectorByCollaborator, setSectorByCollaborator] = useState<Record<string, ReptileSector>>(
    () => createDefaultAssignments(state.collaborators),
  );
  const preferredPage = getPreferredReptilePage(reptile);

  const navigate = (page: ReptilePage) => {
    if (!isReptilePageLocked(page, reptile)) setActivePage(page);
  };

  const flowLocked = edition?.status === "presenting" ||
    (edition?.status === "minigame" && edition.minigame.status === "running");
  const visiblePage = flowLocked ? preferredPage : activePage;
  const advancePresentation = () => {
    onAdvancePresentation();
    if (edition?.status === "presenting" && edition.result) {
      setActivePage("recap");
    }
  };
  const skipPresentation = () => {
    onSkipPresentation();
    setActivePage("recap");
  };

  let pageContent: ReactNode;
  if (!reptile.unlocked) {
    pageContent = <ReptileLockedStep heading={false} title="Torneo Reptile" copy="Vinci il Torneo Nazionale sia in Arena sia in Stile per sbloccare l'organizzazione del primo Open della scuola." />;
  } else if (visiblePage === "overview") {
    pageContent = <ReptileOverviewPage state={state} reptile={reptile} onNavigate={navigate} />;
  } else if (visiblePage === "preparation") {
    pageContent = (
      <ReptilePreparationPage
        state={state}
        eligibleCollaborators={eligibleCollaborators}
        sectorByCollaborator={sectorByCollaborator}
        setSectorByCollaborator={setSectorByCollaborator}
        onStartPreparation={onStartPreparation}
        onBookVenue={onBookVenue}
        onCancelPreparation={onCancelPreparation}
        onNavigate={navigate}
      />
    );
  } else if (visiblePage === "coordination") {
    pageContent = (
      <ReptileCoordinationPage
        edition={edition}
        onStartMinigame={onStartMinigame}
        onCompleteMinigame={onCompleteMinigame}
        onSkipMinigame={onSkipMinigame}
        onCancelPreparation={onCancelPreparation}
        onNavigate={navigate}
      />
    );
  } else if (visiblePage === "bracket") {
    pageContent = <ReptileBracketPage reptile={reptile} onAdvancePresentation={advancePresentation} onSkipPresentation={skipPresentation} onNavigate={navigate} />;
  } else {
    pageContent = <ReptileRecapPage reptile={reptile} />;
  }

  return (
    <ReptileShell reptile={reptile} activePage={visiblePage} onPageChange={navigate}>
      {pageContent}
    </ReptileShell>
  );
}
