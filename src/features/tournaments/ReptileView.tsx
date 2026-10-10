import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getGameMonthName, getSchoolYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { getAvailableSwords } from "../../game/equipment";
import { useGameSelector } from "../../game/GameStateContext";
import {
  REPTILE_BASE_LOADS,
  REPTILE_SECTOR_LABELS,
  canOrganizeReptile,
  getNextReptileJuly,
  getReptileFameLevel,
  getReptileOutlook,
  getReptilePreparationSectors,
  getReptileQualityLabel,
  getReptileTeamCount,
  type ReptileBarOutlook,
} from "../../game/reptilePreparation";
import { getReptileWinner } from "../../game/reptileFlow";
import { getReptileTournamentName, isSuperbaTournament } from "../../game/reptileUnlock";
import type {
  GameState,
  ReptileActiveEdition,
  ReptileSector,
  ReptileTournamentResult,
} from "../../game/types";
import {
  REPTILE_SECTOR_ICONS,
  REPTILE_SECTOR_ROLES,
  formatReptileEuros as formatCurrency,
  reptileTeamLabel,
} from "./reptileUi";

function monthLabel(month: number): string {
  return getGameMonthName(month).toLocaleLowerCase("it-IT");
}

/** «a gennaio» within the year, «tra 14 mesi» beyond it. */
function whenLabel(currentMonth: number, month: number): string {
  const months = month - currentMonth;
  return months > 11 ? `tra ${months} mesi` : `a ${monthLabel(month)}`;
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toLocaleString("it-IT")}`;
}

/** One line on where the tournament stands, for the Outlook header. */
function getHeroStatus(
  state: GameState,
  outlook: ReturnType<typeof getReptileOutlook>,
): { label: string; alert?: boolean } | undefined {
  const reptile = state.tournaments.reptile;
  if (!reptile.unlocked) return undefined;
  if (!reptile.activeEdition) return { label: reptile.latestRecap ? "Edizione conclusa" : "Da organizzare" };
  const stuck = outlook?.bars.filter((entry) => entry.stuck) ?? [];
  if (stuck.length > 0) {
    return {
      label: `${stuck.map((entry) => REPTILE_SECTOR_LABELS[entry.sector]).join(", ")} ${stuck.length === 1 ? "ferma" : "ferme"}`,
      alert: true,
    };
  }
  return { label: outlook?.complete ? "Pronto per luglio" : "In preparazione" };
}

function ReptileHero({ state }: { state: GameState }) {
  const reptile = state.tournaments.reptile;
  const superba = isSuperbaTournament(state);
  const tournamentName = getReptileTournamentName(state);
  const level = getReptileFameLevel(reptile.fameXp);
  const teamCount = reptile.activeEdition?.teamCount ?? getReptileTeamCount(reptile.fameXp);
  const difficulty = TOURNAMENT_DEFINITIONS.champions.standard * 1.1 ** reptile.victories *
    (superba ? GAME_CONFIG.superbaDifficultyMultiplier : 1);
  const outlook = getReptileOutlook(state);
  const nextJuly = getNextReptileJuly(state.school.currentMonth, reptile.lastTournamentMonth);
  const tournamentMonth = reptile.activeEdition ? outlook?.tournamentMonth : nextJuly;
  const status = getHeroStatus(state, outlook);
  return (
    <section className="reptile-hero" aria-labelledby="reptile-title" data-tutorial-region="reptile-hero">
      {/* Outlook only (06/10): icon tile and status chip of the plain header; hidden in Onde. */}
      <span className="reptile-hero-tile" aria-hidden="true"><Icon name="trophy" /></span>
      {status ? <span className={`reptile-hero-status${status.alert ? " is-alert" : ""}`}>{status.label}</span> : null}
      <div className="reptile-hero-copy">
        {superba ? (
          <img className="superba-hero-logo" src="/assets/superba-logo.webp" alt="Logo del Torneo della Superba" />
        ) : null}
        <span className="reptile-hero-kicker">Open · {state.school.city}{superba ? " · la Superba" : ""}</span>
        <h2 id="reptile-title">{tournamentName}</h2>
        <p>
          {superba
            ? "Avversari più forti del 25%. Chi la vince scopre un segreto."
            : "Un torneo a coppie con gironi svizzeri, migliori 16 alla fase finale e sfide alla meglio dei cinque."}
        </p>
      </div>
      <div className="reptile-hero-stats" aria-label={`Metriche del ${tournamentName}`}>
        <div>
          <Icon name="spark" />
          <span>Fama</span>
          <strong>{reptile.fameXp.toLocaleString("it-IT")}</strong>
          <small>livello {level}{level < 5 ? ` · prossimo a ${((level + 1) * 500).toLocaleString("it-IT")}` : " · massimo"}</small>
        </div>
        <div>
          <Icon name="people" />
          <span>Squadre</span>
          <strong>{teamCount}</strong>
          <small>{reptile.victories} vittorie della scuola · difficoltà {Math.round(difficulty)}</small>
        </div>
        <div data-tutorial-region="reptile-month">
          <Icon name="calendar" />
          <span>Torneo</span>
          <strong>{tournamentMonth === undefined ? "Sospeso" : "Luglio"}</strong>
          <small>
            {tournamentMonth === undefined
              ? "una barra è ferma"
              : `anno scolastico ${getSchoolYear(tournamentMonth)}${reptile.activeEdition ? "" : " · se organizzi ora"}`}
          </small>
        </div>
      </div>
    </section>
  );
}

function LoadMeter({ sector }: { sector: ReptileSector }) {
  const maximum = Math.max(...Object.values(REPTILE_BASE_LOADS));
  const filled = Math.max(1, Math.round((REPTILE_BASE_LOADS[sector] / maximum) * 5));
  return (
    <span className="reptile-load" aria-label={`Carico ${filled} su 5`}>
      {[1, 2, 3, 4, 5].map((index) => <i key={index} className={index <= filled ? "is-on" : ""} />)}
    </span>
  );
}

function OrganizePanel({ state, onOrganize }: { state: GameState; onOrganize: () => void }) {
  const tournamentName = getReptileTournamentName(state);
  const canOrganize = canOrganizeReptile(state);
  const heldThisJuly = state.tournaments.reptile.lastTournamentMonth === state.school.currentMonth;
  return (
    <section className="reptile-panel" aria-labelledby="reptile-organize-title" data-tutorial-region="reptile-preparation">
      <header className="reptile-panel-heading">
        <div>
          <span className="reptile-section-kicker">Nuova edizione</span>
          <h3 id="reptile-organize-title">Organizza il {tournamentName} di luglio</h3>
          <p>
            Ogni settore riempie la sua barra con metà del lavoro; chi è fermo dà tutto, chi è
            senza incarico aiuta la barra più indietro a metà. A barre piene la scuola torna al
            ritmo normale. Se non finiscono entro luglio, il torneo slitta al luglio dopo.
          </p>
        </div>
      </header>
      <div className="reptile-bars">
        {getReptilePreparationSectors(state).map((sector) => (
          <div key={sector} className="reptile-bar-row">
            <span className="reptile-bar-glyph"><Icon name={REPTILE_SECTOR_ICONS[sector]} /></span>
            <b>{REPTILE_SECTOR_LABELS[sector]}</b>
            <span className="reptile-bar-meta is-load">carico <LoadMeter sector={sector} /></span>
            <small>{REPTILE_SECTOR_ROLES[sector]}</small>
          </div>
        ))}
      </div>
      <footer className="reptile-panel-actions">
        <button type="button" className="primary" disabled={!canOrganize} onClick={onOrganize}>
          Organizza · {formatCurrency(GAME_CONFIG.reptileVenueCost)}
        </button>
        <span className="reptile-action-note">
          {state.school.euros < GAME_CONFIG.reptileVenueCost
            ? `Servono ${formatCurrency(GAME_CONFIG.reptileVenueCost)} per il palazzetto.`
            : heldThisJuly
              ? "Il torneo di quest'anno è appena finito: il prossimo sarà a luglio dell'anno dopo."
              : `Annullabile quando vuoi, con ${formatCurrency(GAME_CONFIG.reptileVenueCost * GAME_CONFIG.reptileCancelRefundShare)} di rimborso.`}
        </span>
      </footer>
    </section>
  );
}

function describePeople(entry: ReptileBarOutlook): string {
  if (entry.bar.completedAfterMs !== undefined) {
    return entry.rate.assigned > 0 ? "tornati al lavoro normale" : "completata";
  }
  if (entry.rate.assigned === 0) return "Nessuno assegnato";
  const parts = [`${entry.rate.assigned} al lavoro`];
  if (entry.rate.idle > 0) parts.push(`${entry.rate.idle} ${entry.rate.idle === 1 ? "fermo dà" : "fermi danno"} tutto`);
  if (entry.rate.helpers > 0) parts.push(`${entry.rate.helpers} senza incarico ${entry.rate.helpers === 1 ? "aiuta" : "aiutano"}`);
  return parts.join(" · ");
}

function BarRow({ entry, currentMonth }: { entry: ReptileBarOutlook; currentMonth: number }) {
  const full = entry.bar.completedAfterMs !== undefined;
  const percent = Math.floor(entry.share * 100);
  const eta = full
    ? "piena"
    : entry.stuck
      ? "ferma"
      : `piena ${whenLabel(currentMonth, currentMonth + Math.ceil(entry.monthsLeft))}`;
  return (
    <div className={`reptile-bar-row${entry.stuck ? " is-stuck" : ""}${full ? " is-full" : ""}`}>
      <span className="reptile-bar-glyph"><Icon name={REPTILE_SECTOR_ICONS[entry.sector]} /></span>
      <b>{REPTILE_SECTOR_LABELS[entry.sector]}</b>
      <span className="reptile-bar-meta"><strong>{percent}%</strong>{eta}</span>
      <small>{REPTILE_SECTOR_ROLES[entry.sector]} · {describePeople(entry)}</small>
      <span />
      <span
        className="reptile-bar-track"
        role="progressbar"
        aria-label={`Barra ${REPTILE_SECTOR_LABELS[entry.sector]}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <i style={{ width: `${entry.share * 100}%` }} />
      </span>
    </div>
  );
}

function PreparationPanel({
  state,
  edition,
  onCancel,
}: {
  state: GameState;
  edition: ReptileActiveEdition;
  onCancel: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const outlook = getReptileOutlook(state)!;
  const stuck = outlook.bars.filter((entry) => entry.stuck);
  const requiredSwords = edition.teamCount * 2;
  const freeSwords = getAvailableSwords(state.equipment);
  const refund = GAME_CONFIG.reptileVenueCost * GAME_CONFIG.reptileCancelRefundShare;
  const julyNow = outlook.complete && outlook.tournamentMonth === state.school.currentMonth;
  return (
    <section className="reptile-panel" aria-labelledby="reptile-preparation-title" data-tutorial-region="reptile-preparation">
      <header className="reptile-panel-heading">
        <div>
          <span className="reptile-section-kicker">
            {outlook.complete ? "Preparazione completata" : `Preparazione · da ${monthLabel(edition.organizedMonth)}`}
          </span>
          <h3 id="reptile-preparation-title">{outlook.complete ? "Tutto pronto per luglio" : "Ancora al lavoro"}</h3>
        </div>
        {stuck.length > 0 ? (
          <span className="reptile-status-mark is-alert">{stuck.map((entry) => REPTILE_SECTOR_LABELS[entry.sector]).join(", ")} {stuck.length === 1 ? "ferma" : "ferme"}</span>
        ) : outlook.complete ? <span className="reptile-status-mark">Pronto</span> : null}
      </header>
      <div className="reptile-summary">
        <div>
          <small>{outlook.complete ? "Settori" : "Barre piene"}</small>
          <strong>
            {outlook.complete
              ? "tornati al lavoro normale"
              : outlook.readyMonth === undefined
                ? "non finché una barra è ferma"
                : whenLabel(state.school.currentMonth, outlook.readyMonth)}
          </strong>
        </div>
        <div>
          <small>{outlook.complete ? "Resa della preparazione" : "Resa prevista"}</small>
          <strong>{outlook.projectedResa} · {getReptileQualityLabel(outlook.projectedResa)}</strong>
        </div>
        <div>
          <small>Torneo</small>
          <strong>
            {outlook.tournamentMonth === undefined
              ? "in sospeso"
              : julyNow
                ? "questo mese"
                : `luglio, anno ${getSchoolYear(outlook.tournamentMonth)}`}
          </strong>
        </div>
      </div>
      <div className="reptile-bars">
        {outlook.bars.map((entry) => <BarRow key={entry.sector} entry={entry} currentMonth={state.school.currentMonth} />)}
      </div>
      {stuck.map((entry) => (
        <p key={entry.sector} className="reptile-alert is-bad">
          Nessuno a {REPTILE_SECTOR_LABELS[entry.sector]}: la barra non si muove e il torneo non può partire. Assegna qualcuno al settore.
        </p>
      ))}
      {freeSwords < requiredSwords ? (
        <p className="reptile-alert">
          Il giorno del torneo servono {requiredSwords} spade libere, oggi ne hai {freeSwords}. Ogni spada che manca abbassa la resa, fino a metà.
        </p>
      ) : null}
      <footer className="reptile-panel-actions">
        {confirmCancel ? (
          <>
            <span className="reptile-action-note">Torneo annullato, rimborso di {formatCurrency(refund)}. Confermi?</span>
            <button type="button" className="secondary" onClick={() => { setConfirmCancel(false); onCancel(); }}>Sì, annulla</button>
            <button type="button" className="text-button" onClick={() => setConfirmCancel(false)}>No</button>
          </>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirmCancel(true)}>
            Annulla il torneo · rimborso {formatCurrency(refund)}
          </button>
        )}
      </footer>
    </section>
  );
}

function MinigameCard({
  edition,
  onPlay,
  onTutorial,
}: {
  edition: ReptileActiveEdition;
  onPlay: () => void;
  onTutorial: () => void;
}) {
  const minigame = edition.minigame;
  if (minigame.status === "completed") {
    return (
      <section className="reptile-minicard" aria-label="La giornata degli imprevisti" data-tutorial-region="reptile-minigame">
        <span className="reptile-section-kicker">La giornata degli imprevisti</span>
        <strong className="reptile-minicard-bonus">+{minigame.bonusPercent}%</strong>
        <p>Sulla resa del torneo. Tentativo usato.</p>
      </section>
    );
  }
  return (
    <section className="reptile-minicard" aria-labelledby="reptile-minigame-title" data-tutorial-region="reptile-minigame">
      <span className="reptile-section-kicker">Il preside in palazzetto</span>
      <h3 id="reptile-minigame-title">La giornata degli imprevisti</h3>
      <p>Aiuta i collaboratori a sbrogliare i guai della giornata. Non tocca le barre: alza la resa del torneo.</p>
      <dl className="reptile-minicard-facts">
        <div><dt>durata</dt><dd>30 s</dd></div>
        <div><dt>tentativo</dt><dd>1</dd></div>
        <div><dt>sulla resa</dt><dd>fino a +{GAME_CONFIG.reptileMinigameMaxBonusPercent}%</dd></div>
      </dl>
      <div className="reptile-panel-actions">
        <button type="button" className="secondary" onClick={onTutorial}>Tutorial</button>
        <button type="button" className="primary" onClick={onPlay} disabled={minigame.status === "running"}>Gioca</button>
      </div>
      <small className="reptile-action-note">Si gioca una volta sola, prima del torneo.</small>
    </section>
  );
}

export function ReptileRecapPanel({ result, onReplay }: { result: ReptileTournamentResult; onReplay: () => void }) {
  const winner = getReptileWinner(result);
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const homeCount = result.teams.filter((team) => team.home).length;
  return (
    <section className="reptile-panel" aria-labelledby="reptile-recap-title">
      <header className="reptile-panel-heading">
        <div>
          <span className="reptile-section-kicker">Edizione dell&apos;anno {result.schoolYear} · conclusa</span>
          <h3 id="reptile-recap-title">Vince {winner.schoolName}</h3>
          <p className="reptile-podium-line">
            {result.podiumTeamIds.slice(0, 3).map((id, index) => {
              const team = teamsById.get(id);
              return (
                <span key={id} className={team?.home ? "is-home" : ""}>
                  {index + 1} · {reptileTeamLabel(team)}{team?.home ? "" : `, ${team?.schoolName}`}
                </span>
              );
            })}
          </p>
        </div>
      </header>
      <div className="reptile-tiles">
        <div><small>Resa</small><strong>{result.resa}</strong></div>
        <div><small>Fama</small><strong>{signed(result.economy.fameDelta)}</strong></div>
        <div><small>Banchetto</small><strong>{formatCurrency(result.economy.gadgetGross)}</strong></div>
        <div><small>Follower</small><strong>+{result.economy.followersGained}</strong></div>
        <div><small>Coppie di casa</small><strong>{homeCount}</strong></div>
        {result.economy.missingSwords > 0 ? <div><small>Spade mancanti</small><strong>{result.economy.missingSwords}</strong></div> : null}
      </div>
      <footer className="reptile-panel-actions">
        <button type="button" className="secondary" onClick={onReplay}>Rivedi il giorno del torneo</button>
      </footer>
    </section>
  );
}

function HallPanel({ reptile }: { reptile: GameState["tournaments"]["reptile"] }) {
  return (
    <section className="reptile-hall-panel" aria-labelledby="reptile-hall-title">
      <header className="reptile-panel-heading">
        <div><span className="reptile-section-kicker">Memoria del torneo</span><h3 id="reptile-hall-title">Albo d&apos;oro</h3></div>
        <span className="reptile-count-mark">{reptile.hall.length} {reptile.hall.length === 1 ? "edizione" : "edizioni"}</span>
      </header>
      {reptile.hall.length > 0 ? (
        <div className="reptile-hall-list">
          {[...reptile.hall].reverse().slice(0, 12).map((entry) => (
            <div key={`${entry.schoolYear}-${entry.teamId}`}>
              <b>Anno {entry.schoolYear} · {entry.superba ? "Superba" : "Reptile"}</b>
              <span>{entry.athleteNames.join(" / ")}</span>
              <small>{entry.schoolName}</small>
            </div>
          ))}
        </div>
      ) : <p className="reptile-inline-note">Ancora nessuna edizione.</p>}
    </section>
  );
}

function selectReptileViewState(state: GameState): GameState {
  return state;
}

function haveSameReptileViewState(left: GameState, right: GameState): boolean {
  return left.tournaments.reptile === right.tournaments.reptile &&
    left.network.superbaTournament === right.network.superbaTournament &&
    left.school.currentMonth === right.school.currentMonth &&
    left.school.euros === right.school.euros &&
    left.equipment === right.equipment &&
    left.collaborators === right.collaborators &&
    left.unlocks.gadget === right.unlocks.gadget;
}

export function ReptileView({
  state: stateOverride,
  onOrganize,
  onCancel,
  onPlayMinigame,
  onOpenTutorial,
  onReplayDay,
}: {
  state?: GameState;
  onOrganize: () => void;
  onCancel: () => void;
  onPlayMinigame: () => void;
  onOpenTutorial: () => void;
  onReplayDay: () => void;
}) {
  const state = useGameSelector(selectReptileViewState, stateOverride, haveSameReptileViewState);
  const reptile = state.tournaments.reptile;
  const edition = reptile.activeEdition;
  const superba = isSuperbaTournament(state);
  return (
    <div className={superba ? "reptile-view is-superba" : "reptile-view"}>
      <ReptileHero state={state} />
      <div className="reptile-page">
        {!reptile.unlocked ? (
          <section className="reptile-step-locked">
            <Icon name="lock" />
            <div>
              <strong className="reptile-locked-label">{getReptileTournamentName(state)}</strong>
              <p>Vinci il Torneo Nazionale sia in Arena sia in Stile per sbloccare l&apos;organizzazione del primo Open della scuola.</p>
            </div>
          </section>
        ) : (
          <div className="reptile-page-grid">
            <div className="reptile-column">
              {!edition && reptile.latestRecap ? <ReptileRecapPanel result={reptile.latestRecap} onReplay={onReplayDay} /> : null}
              {edition
                ? <PreparationPanel state={state} edition={edition} onCancel={onCancel} />
                : <OrganizePanel state={state} onOrganize={onOrganize} />}
            </div>
            <div className="reptile-column">
              {edition ? <MinigameCard edition={edition} onPlay={onPlayMinigame} onTutorial={onOpenTutorial} /> : null}
              <HallPanel reptile={reptile} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
