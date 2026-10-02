import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { canFoundSchool, getPrestigeRequirements } from "../../game/progression";
import {
  REPUTATION_UPGRADES,
  REPUTATION_UPGRADE_IDS,
  getMonthlyNetworkRent,
  getPrestigeReputationPreview,
  getReputationLevel,
  getSpentReputation,
  isValidReputationSpending,
  type ReputationSpending,
} from "../../game/reputation";
import type { GameState, SchoolFoundationDetails, SchoolSpecialization } from "../../game/types";
import { formatCurrency, formatDateTime } from "../../shared/formatters";

const SPECIALIZATIONS: [SchoolSpecialization, string][] = [
  ["redazione", "Redazione · email già al 20%, Flusso più stabile"],
  ["eventi", "Eventi · stesso evento due volte insieme"],
  ["accoglienza", "Accoglienza · seconda prova, −25% abbandoni"],
];

const percent = (level: number) => `+${Math.round(level * GAME_CONFIG.reputationStep * 100)}%`;
const points = (value: number) => `${value} ${value === 1 ? "punto" : "punti"}`;

export function NetworkPanel({
  state: stateOverride,
  onFoundSchool,
}: {
  state?: GameState;
  onFoundSchool: (details: SchoolFoundationDetails, spending: ReputationSpending) => void;
}) {
  const state = useGameStateSlices(
    ["network", "school", "tournaments", "contacts", "collaborators", "upgrades"],
    stateOverride,
  );
  const [armed, setArmed] = useState(false);
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const requirements = getPrestigeRequirements(state);
  const ready = canFoundSchool(state);
  const preview = getPrestigeReputationPreview(state);
  const schools = state.network.schools;
  const trialPending = requirements.currentNationalTitles >= requirements.nationalTitles && !ready;
  const tournamentPoints = preview.points - preview.famePoints;

  const spending: ReputationSpending = {
    upgrades: Object.fromEntries(REPUTATION_UPGRADE_IDS.map((id) => [id, allocation[id] ?? 0])),
    rent: allocation.rent ?? 0,
  };
  const available = state.network.reputation + preview.points;
  const left = available - getSpentReputation(spending);
  const validSpending = isValidReputationSpending(state, spending, available);
  const allocate = (key: string, value: string) => {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    setAllocation((current) => ({ ...current, [key]: amount }));
  };

  return (
    <section className="network-sheet" aria-labelledby="settings-network-title">
      <header className="network-heading">
        <div>
          <Icon name="people" />
          <span>
            <strong id="settings-network-title">Rete dell'Ordine</strong>
            <small>La Reputazione è l'unico valore che passa da una scuola all'altra.</small>
          </span>
        </div>
        <b>Reputazione: {points(state.network.reputation)}</b>
      </header>

      <div className="prestige-requirements">
        <div className={requirements.currentNationalTitles >= requirements.nationalTitles ? "completed" : undefined}>
          <span>Titolo nazionale (Arena o Stile)</span>
          <strong>{Math.min(requirements.currentNationalTitles, requirements.nationalTitles)}/{requirements.nationalTitles}</strong>
          <small>{requirements.currentNationalTitles >= requirements.nationalTitles ? "Requisito raggiunto" : "Vinci un Torneo Nazionale"}</small>
        </div>
        <div>
          <span>Se fondi ora</span>
          <strong>+{points(preview.points)}</strong>
          <small>
            {preview.famePoints} dalla Fama ({state.school.fame.toLocaleString("it-IT")}) · {tournamentPoints} dai tornei
          </small>
        </div>
        <div>
          <span>Rendita della rete</span>
          <strong>{formatCurrency(getMonthlyNetworkRent(state))}/mese</strong>
          <small>{schools.length} {schools.length === 1 ? "scuola lasciata" : "scuole lasciate"}</small>
        </div>
      </div>

      {schools.length > 0 ? (
        <div className="school-archive">
          {schools.map((school, index) => (
            <article key={school.id}>
              <div>
                <strong>{school.name}{index === 0 ? " · Sede madre" : ""}</strong>
                <small>
                  {school.city} · {school.membersAtTransfer} iscritti
                  {school.championsWin ? " · Champions" : ""}
                  {school.reptileWin === "superba" ? " · Superba" : school.reptileWin ? " · Reptile" : ""}
                  {school.chroniclesWin ? " · Chronicles" : ""}
                </small>
              </div>
              <div>
                <b>{formatCurrency(school.monthlyRent ?? 0)}/mese</b>
                <time dateTime={new Date(school.transferredAt).toISOString()}>{formatDateTime(school.transferredAt)}</time>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <form
        className="foundation-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!armed) {
            setArmed(true);
            return;
          }
          const form = new FormData(event.currentTarget);
          const text = (key: string) => String(form.get(key) ?? "").trim();
          onFoundSchool({
            name: text("name"),
            city: text("city"),
            accentColor: text("accentColor") || state.school.accentColor,
            motto: text("motto"),
            specialization: text("specialization") as SchoolSpecialization,
          }, spending);
          setArmed(false);
          setAllocation({});
        }}
      >
        <h3>Fonda una nuova scuola</h3>
        <p>
          {trialPending
            ? "Completa prima la prova del leggendario in corso."
            : `${state.school.name} entrerà nella rete. La nuova scuola riparte da zero, Fama compresa: restano la Reputazione con i suoi potenziamenti, Torneo della Superba, Corso X e Ludodex.`}
        </p>
        <fieldset className="foundation-fields" disabled={!ready} onChange={() => setArmed(false)}>
          <label>Nome della scuola<input name="name" required maxLength={60} /></label>
          <label>Città<input name="city" required maxLength={40} /></label>
          <label>
            Specializzazione
            <select name="specialization" defaultValue="redazione">
              {SPECIALIZATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Colore<input type="color" name="accentColor" defaultValue={state.school.accentColor} /></label>
          <label className="motto-field">Motto (facoltativo)<input name="motto" maxLength={80} /></label>
        </fieldset>

        <fieldset className="reputation-shop" disabled={!ready} onChange={() => setArmed(false)}>
          <legend>
            Spendi la Reputazione
            <span className={left < 0 ? "over-budget" : undefined}>{points(left)} da spendere su {available}</span>
          </legend>
          <p>La spesa è definitiva. Ogni punto vale +{Math.round(GAME_CONFIG.reputationStep * 100)}% del valore base, fino a {GAME_CONFIG.reputationUpgradeMaxLevel} punti per potenziamento.</p>
          {REPUTATION_UPGRADE_IDS.map((id) => {
            const level = getReputationLevel(state, id);
            const added = allocation[id] ?? 0;
            return (
              <label key={id}>
                <span>
                  <strong>{REPUTATION_UPGRADES[id].label}</strong>
                  <small>{REPUTATION_UPGRADES[id].description} · {percent(level)}{added > 0 ? ` → ${percent(level + added)}` : ""}</small>
                </span>
                <input
                  type="number"
                  name={`reputation-${id}`}
                  min={0}
                  max={GAME_CONFIG.reputationUpgradeMaxLevel - level}
                  step={1}
                  value={added}
                  onChange={(event) => allocate(id, event.target.value)}
                />
              </label>
            );
          })}
          <label className="reputation-rent">
            <span>
              <strong>Rendita della rete</strong>
              <small>
                Si consuma: blocca per sempre {formatCurrency(Math.round(preview.rentPerPoint * spending.rent))}/mese da {state.school.name}, poi la scuola nuova riparte da 0%.
              </small>
            </span>
            <input
              type="number"
              name="reputation-rent"
              min={0}
              step={1}
              value={spending.rent}
              onChange={(event) => allocate("rent", event.target.value)}
            />
          </label>
        </fieldset>

        <button type="submit" disabled={!ready || !validSpending} className={armed ? "danger" : undefined}>
          {armed ? "Conferma: fonda la scuola" : "Fonda la nuova scuola"}
        </button>
      </form>
    </section>
  );
}
