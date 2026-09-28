import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { getFoundationRentPreview, getMonthlyNetworkRent } from "../../game/networkRent";
import { canFoundSchool, getPrestigeRequirements } from "../../game/progression";
import type { GameState, SchoolFoundationDetails, SchoolSpecialization } from "../../game/types";
import { formatCurrency, formatDateTime } from "../../shared/formatters";

const SPECIALIZATIONS: [SchoolSpecialization, string][] = [
  ["redazione", "Redazione · +10% scrittura"],
  ["eventi", "Eventi · +10% pubblico"],
  ["accoglienza", "Accoglienza · +10% conversioni"],
];

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function NetworkPanel({
  state: stateOverride,
  onFoundSchool,
}: {
  state?: GameState;
  onFoundSchool: (details: SchoolFoundationDetails) => void;
}) {
  const state = useGameStateSlices(
    ["network", "school", "tournaments", "contacts", "collaborators", "upgrades"],
    stateOverride,
  );
  const [armed, setArmed] = useState(false);
  const requirements = getPrestigeRequirements(state);
  const ready = canFoundSchool(state);
  const preview = getFoundationRentPreview(state);
  const schools = state.network.schools;
  const bonus = schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const tournamentName = state.network.superbaTournament ? "Superba" : "Reptile";
  const trialPending = requirements.currentNationalTitles >= requirements.nationalTitles && !ready;

  return (
    <section className="network-sheet" aria-labelledby="settings-network-title">
      <header className="network-heading">
        <div>
          <Icon name="people" />
          <span>
            <strong id="settings-network-title">Rete dell'Ordine</strong>
            <small>Ogni scuola lasciata alle spalle continua a versare una rendita fissa.</small>
          </span>
        </div>
        <b>Reputazione {state.network.reputation}</b>
      </header>

      <div className="prestige-requirements">
        <div className={requirements.currentNationalTitles >= requirements.nationalTitles ? "completed" : undefined}>
          <span>Titolo nazionale (Arena o Stile)</span>
          <strong>{Math.min(requirements.currentNationalTitles, requirements.nationalTitles)}/{requirements.nationalTitles}</strong>
          <small>{requirements.currentNationalTitles >= requirements.nationalTitles ? "Requisito raggiunto" : "Vinci un Torneo Nazionale"}</small>
        </div>
        <div>
          <span>Se fondi ora</span>
          <strong>{formatCurrency(preview.rent)}/mese</strong>
          <small>
            {percent(preview.share)} di {formatCurrency(preview.memberFees)} di quote · max {percent(GAME_CONFIG.networkRentShare + 2 * GAME_CONFIG.networkRentBonusPerTournament)} con Champions e {tournamentName}
          </small>
        </div>
        <div>
          <span>Rete attuale</span>
          <strong>{formatCurrency(getMonthlyNetworkRent(state))}/mese</strong>
          <small>Bonus permanente +{percent(bonus)} · +{percent(GAME_CONFIG.prestigeBonusPerSchool)} per scuola</small>
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
          });
          setArmed(false);
        }}
      >
        <h3>Fonda una nuova scuola</h3>
        <p>
          {trialPending
            ? "Completa prima la prova del leggendario in corso."
            : `${state.school.name} entrerà nella rete con la rendita qui sopra. La nuova scuola riparte da zero, con i Percorsi Segreti scoperti e il bonus di rete.`}
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
        <button type="submit" disabled={!ready} className={armed ? "danger" : undefined}>
          {armed ? "Conferma: fonda la scuola" : "Fonda la nuova scuola"}
        </button>
      </form>
    </section>
  );
}
