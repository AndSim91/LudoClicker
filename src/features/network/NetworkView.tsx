import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ACHIEVEMENT_TOTAL } from "../../content/achievements";
import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { canFoundSchool, getPrestigeRequirements } from "../../game/progression";
import {
  REPUTATION_UPGRADES,
  REPUTATION_UPGRADE_IDS,
  getMonthlyNetworkRent,
  getPrestigeReputationPreview,
  getReputationLevel,
  type ReputationSpending,
} from "../../game/reputation";
import { getReptileTournamentName } from "../../game/reptileUnlock";
import type { GameState, SchoolFoundationDetails } from "../../game/types";
import { formatCurrency, formatStat } from "../../shared/formatters";
import { getDiscoveredLegendaryIds } from "../ludowiki/ludodexPresentation";
import { FoundationDialog } from "./FoundationDialog";
import { NetworkMap } from "./NetworkMap";

const points = (value: number) => `${value} ${value === 1 ? "punto" : "punti"}`;
const DIAL = 2 * Math.PI * 22;

export function NetworkView({
  state: stateOverride,
  onFoundSchool,
  onFoundationOpenChange,
}: {
  state?: GameState;
  onFoundSchool: (details: SchoolFoundationDetails, spending: ReputationSpending) => void;
  onFoundationOpenChange?: (open: boolean) => void;
}) {
  const state = useGameStateSlices(
    ["network", "school", "tournaments", "contacts", "collaborators", "upgrades", "legendaryCollaborators", "achievements", "secretUpgradeDiscoveries"],
    stateOverride,
  );
  const [founding, setFounding] = useState(false);
  useEffect(() => {
    onFoundationOpenChange?.(founding);
    return () => onFoundationOpenChange?.(false);
  }, [founding, onFoundationOpenChange]);

  const requirements = getPrestigeRequirements(state);
  const titled = requirements.currentNationalTitles >= requirements.nationalTitles;
  const ready = canFoundSchool(state);
  const preview = getPrestigeReputationPreview(state);
  const network = state.network;
  const nextFamePoint = (preview.famePoints + 1) ** 2 * GAME_CONFIG.reputationFameDivisor;
  const reptileName = getReptileTournamentName(state);
  const tournaments: [string, boolean][] = [
    ["Champion's Arena", preview.championsWin],
    [reptileName, Boolean(preview.reptileWin)],
    ["Chronicles of Ludosport", preview.chroniclesWin],
  ];
  const secretsEnrolled = Object.values(network.secretLegendaries)
    .filter((progress) => progress.status === "enrolled").length;
  const gadgetMasteries = Object.values(network.gadgetMastery ?? {})
    .reduce((total, rarities) => total + (rarities?.length ?? 0), 0);
  const keeps: [string, string][] = [
    ...(network.superbaTournament ? [["Torneo della Superba", ""] as [string, string]] : []),
    ...(state.secretUpgradeDiscoveries.includes("project-x") ? [["Corso X", "1 €"] as [string, string]] : []),
    ["Ludodex", `${getDiscoveredLegendaryIds(state).size}/${LUDODEX_LEGENDARIES.length}`],
    ...(secretsEnrolled > 0 ? [["Leggendari Segreti", `${secretsEnrolled}`] as [string, string]] : []),
    ...(gadgetMasteries > 0 ? [["Maestria dei gadget", `${gadgetMasteries}`] as [string, string]] : []),
    ["Traguardi", `${state.achievements.length}/${ACHIEVEMENT_TOTAL}`],
  ];

  return (
    <main className="overview-view network-view">
      <header>
        <Icon name="network" />
        <div>
          <h1>Rete delle Onde</h1>
          <p>{network.schoolCount === 0 ? "Una sede, per ora. La Reputazione è l'unica cosa che passa alla prossima." : `${formatStat(network.schoolCount + 1)} sedi, una sola Reputazione.`}</p>
        </div>
        <div className="network-reputation">
          <b>{formatStat(network.reputation)}</b>
          <small>Reputazione</small>
        </div>
      </header>

      <NetworkMap
        key={network.schoolCount}
        schools={network.schools}
        schoolCount={network.schoolCount}
        current={{ name: state.school.name, city: state.school.city, fame: state.school.fame }}
      />

      <div className="network-columns">
        <section className="network-panel network-ready" aria-labelledby="network-ready-title" data-tutorial-region="network-ready">
          <h2 id="network-ready-title">Se fondi ora</h2>
          <p className="network-big">
            <b>+{formatStat(preview.points)}</b>
            <span>{titled ? `punti, ${formatStat(network.reputation + preview.points)} in tutto` : "serve prima il titolo nazionale"}</span>
          </p>
          <ul className="network-points">
            <li className={titled ? "is-done" : undefined}>
              <span>Titolo nazionale<small>{titled ? "Arena o Stile, vinto" : "Vinci un Torneo Nazionale con questa scuola"}</small></span>
              <b>+{GAME_CONFIG.reputationNationalTitlePoints}</b>
            </li>
            <li className={preview.famePoints > 0 ? "is-done" : undefined}>
              <span>Fama {formatStat(state.school.fame)}<small>il prossimo punto a {formatStat(nextFamePoint)}</small></span>
              <b>+{preview.famePoints}</b>
            </li>
            {tournaments.map(([name, won]) => (
              <li key={name} className={won ? "is-done" : "is-open"}>
                <span>{name}</span>
                <b>{won ? `+${GAME_CONFIG.reputationTournamentPoints}` : `+${GAME_CONFIG.reputationTournamentPoints} possibili`}</b>
              </li>
            ))}
            {preview.letterPoints > 0 ? (
              <li className="is-done">
                <span>Lettere di raccomandazione</span>
                <b>+{preview.letterPoints}</b>
              </li>
            ) : null}
            {preview.councilDoubled ? (
              <li className="is-done">
                <span>Gran Consiglio<small>il totale vale doppio</small></span>
                <b>×2</b>
              </li>
            ) : null}
          </ul>
          <button type="button" className="network-found" data-tutorial-region="network-found" disabled={!ready} onClick={() => setFounding(true)}>
            Fonda una nuova scuola…
          </button>
          {titled && !ready ? <small className="network-note">Completa prima la prova del Leggendario in corso.</small> : null}
        </section>

        <section className="network-panel" aria-labelledby="network-upgrades-title" data-tutorial-region="network-upgrades">
          <h2 id="network-upgrades-title">Potenziamenti <small>+{Math.round(GAME_CONFIG.reputationStep * 100)}% a punto · massimo {GAME_CONFIG.reputationUpgradeMaxLevel}</small></h2>
          <div className="network-dials">
            {REPUTATION_UPGRADE_IDS.map((id) => {
              const level = getReputationLevel(state, id);
              return (
                <div key={id} className="network-dial" title={REPUTATION_UPGRADES[id].description}>
                  <svg viewBox="0 0 54 54" aria-hidden="true">
                    <circle className="track" cx="27" cy="27" r="22" />
                    <circle className="value" cx="27" cy="27" r="22" strokeDasharray={`${(DIAL * level) / GAME_CONFIG.reputationUpgradeMaxLevel} ${DIAL}`} />
                    <text x="27" y="31" textAnchor="middle">{level}</text>
                  </svg>
                  <span>{REPUTATION_UPGRADES[id].label}</span>
                  <small>+{Math.round(level * GAME_CONFIG.reputationStep * 100)}%</small>
                  {/* Outlook draws a row with a bar instead of the ring (06/10): hidden in Onde. */}
                  <em className="network-dial-desc">{REPUTATION_UPGRADES[id].description}</em>
                  <em className="network-dial-level">{level}/{GAME_CONFIG.reputationUpgradeMaxLevel}</em>
                  <em className="network-dial-bar" aria-hidden="true">
                    <i style={{ width: `${(level / GAME_CONFIG.reputationUpgradeMaxLevel) * 100}%` }} />
                  </em>
                </div>
              );
            })}
          </div>
          <p className="network-rent">
            <span>Rendita della rete<small>da scuole che non devi più gestire</small></span>
            <b>{formatCurrency(getMonthlyNetworkRent(state))}/mese</b>
          </p>
        </section>

        <section className="network-panel" aria-labelledby="network-keeps-title" data-tutorial-region="network-keeps">
          <h2 id="network-keeps-title">Resta per sempre</h2>
          <ul className="network-keeps">
            {keeps.map(([name, value]) => <li key={name}>{name}{value ? <b> {value}</b> : null}</li>)}
          </ul>
          <small className="network-note">Tutto il resto riparte da zero, Fama compresa. {points(network.reputation)} da spendere alla prossima fondazione.</small>
        </section>
      </div>

      {founding ? (
        <FoundationDialog
          state={state}
          preview={preview}
          onCancel={() => setFounding(false)}
          onConfirm={(details, spending) => {
            setFounding(false);
            onFoundSchool(details, spending);
          }}
        />
      ) : null}
    </main>
  );
}
