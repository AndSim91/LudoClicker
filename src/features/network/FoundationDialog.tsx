import { useEffect, useState } from "react";
import { GAME_CONFIG } from "../../game/config";
import {
  REPUTATION_UPGRADES,
  REPUTATION_UPGRADE_IDS,
  formatReputationEffect,
  getReputationLevel,
  getMonthlyNetworkRent,
  getSpentReputation,
  isValidReputationSpending,
  type PrestigeReputationPreview,
  type ReputationSpending,
  type ReputationUpgradeId,
} from "../../game/reputation";
import type { GameState, SchoolFoundationDetails } from "../../game/types";
import { formatCurrency, formatStat } from "../../shared/formatters";

const points = (value: number) => `${formatStat(value)} ${value === 1 ? "punto" : "punti"}`;

export function FoundationDialog({
  state,
  preview,
  onCancel,
  onConfirm,
}: {
  state: Pick<GameState, "network" | "school">;
  preview: PrestigeReputationPreview;
  onCancel: () => void;
  onConfirm: (details: SchoolFoundationDetails, spending: ReputationSpending) => void;
}) {
  const [details, setDetails] = useState<SchoolFoundationDetails>({ name: "", city: "" });
  const [added, setAdded] = useState<Partial<Record<ReputationUpgradeId | "rent", number>>>({});

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  const spending: ReputationSpending = {
    upgrades: Object.fromEntries(REPUTATION_UPGRADE_IDS.map((id) => [id, added[id] ?? 0])),
    rent: added.rent ?? 0,
  };
  const available = state.network.reputation + preview.points;
  const left = available - getSpentReputation(spending);
  const name = details.name.trim();
  const city = details.city.trim();
  const valid = name !== "" && city !== "" && isValidReputationSpending(state, spending, available);
  // Points spent in earlier schools are the floor: only the ones added now can be taken back.
  const change = (key: ReputationUpgradeId | "rent", delta: number) =>
    setAdded((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));
  const canAdd = (id?: ReputationUpgradeId) =>
    left > 0 && (!id || getReputationLevel(state, id) + (added[id] ?? 0) < GAME_CONFIG.reputationUpgradeMaxLevel);
  const rentNow = getMonthlyNetworkRent(state);
  const rentAdded = Math.round(preview.rentPerPoint * spending.rent);

  return (
    <div className="foundation-backdrop">
      <form
        className="foundation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="foundation-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm({ name, city }, spending);
        }}
      >
        <header>
          <h2 id="foundation-title">Fonda una nuova scuola</h2>
          <p>{state.school.name} entra nel Network con Fama {formatStat(state.school.fame)}. La nuova scuola riparte da zero; restano la Reputazione e i suoi potenziamenti.</p>
        </header>

        <div className="foundation-body">
          <div className="foundation-names">
            <label>Nome della scuola
              <input name="name" required maxLength={60} autoFocus placeholder="Ordine delle Onde" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} />
            </label>
            <label>Città
              <input name="city" required maxLength={40} placeholder="Genova" value={details.city} onChange={(event) => setDetails({ ...details, city: event.target.value })} />
            </label>
          </div>

          <p className="foundation-budget">
            <span>{formatStat(state.network.reputation)} in tasca + {formatStat(preview.points)} da {state.school.name}</span>
            <b className={left < 0 ? "is-over" : undefined}>{points(left)} da spendere su {formatStat(available)}</b>
          </p>
          {REPUTATION_UPGRADE_IDS.map((id) => {
            const level = getReputationLevel(state, id);
            const extra = added[id] ?? 0;
            return (
              <div key={id} className="foundation-row">
                <LevelRing base={level} extra={extra} />
                <span>{REPUTATION_UPGRADES[id].label}<small>{REPUTATION_UPGRADES[id].description} · <Change from={formatReputationEffect(id, level)} to={formatReputationEffect(id, level + extra)} changed={extra > 0} /></small></span>
                <Stepper label={REPUTATION_UPGRADES[id].label} base={level} added={extra} onDown={() => change(id, -1)} onUp={() => change(id, 1)} canUp={canAdd(id)} />
              </div>
            );
          })}
          <div className="foundation-row">
            <LevelRing base={0} extra={spending.rent} infinite />
            <span>Rendita del Network<small>Si consuma: ogni punto blocca {formatCurrency(Math.round(preview.rentPerPoint))}/mese da {state.school.name} · <Change from={formatCurrency(rentNow)} to={formatCurrency(rentNow + rentAdded)} unit="/mese" changed={spending.rent > 0} /></small></span>
            <Stepper label="Rendita del Network" base={0} added={spending.rent} onDown={() => change("rent", -1)} onUp={() => change("rent", 1)} canUp={canAdd()} />
          </div>
        </div>

        <footer>
          <button type="button" className="secondary" onClick={onCancel}>Annulla</button>
          <span>Non si torna indietro. I punti non spesi restano per la prossima volta.</span>
          <button type="submit" className="danger" disabled={!valid}>{name ? `Fonda ${name}` : "Fonda la scuola"}</button>
        </footer>
      </form>
    </div>
  );
}

/** Current value, or "current → new" with the new one in gold once points are added (concept E, 13/10). */
function Change({ from, to, changed, unit = "" }: { from: string; to: string; changed: boolean; unit?: string }) {
  if (!changed) return <>{from}{unit}</>;
  return <><span className="foundation-was">{from}</span> → <b className="foundation-now">{to}{unit}</b></>;
}

const RING_R = 17;
const RING_L = 2 * Math.PI * RING_R;

/** The Network page dial: wave arc for the levels already active, gold for the ones added now; ∞ for the rent. */
function LevelRing({ base, extra, infinite = false }: { base: number; extra: number; infinite?: boolean }) {
  const max = GAME_CONFIG.reputationUpgradeMaxLevel;
  const baseLen = (RING_L * base) / max;
  return (
    <svg className="foundation-ring" viewBox="0 0 44 44" aria-hidden="true">
      {infinite ? (
        <circle className={extra > 0 ? "is-added" : "is-base"} cx="22" cy="22" r={RING_R} />
      ) : (
        <>
          <circle className="track" cx="22" cy="22" r={RING_R} />
          <circle className="is-base" cx="22" cy="22" r={RING_R} strokeDasharray={`${baseLen} ${RING_L}`} />
          <circle className="is-added" cx="22" cy="22" r={RING_R} strokeDasharray={`0 ${baseLen} ${(RING_L * extra) / max} ${RING_L}`} />
        </>
      )}
      <text x="22" y={infinite ? 29 : 26.5} textAnchor="middle" className={`${infinite ? "is-infinite " : ""}${extra > 0 ? "is-added" : ""}`}>
        {infinite ? "∞" : formatStat(base + extra)}
      </text>
    </svg>
  );
}

/** The level already spent in white, the points added now as a gold "+n" beside it. */
function Stepper({ label, base, added, onDown, onUp, canUp }: {
  label: string;
  base: number;
  added: number;
  onDown: () => void;
  onUp: () => void;
  canUp: boolean;
}) {
  return (
    <span className="foundation-stepper">
      <button type="button" aria-label={`Togli un punto da ${label}`} disabled={added === 0} onClick={onDown}>−</button>
      <b aria-label={`${label}: ${base + added}`}>
        {formatStat(base)}{added > 0 ? <sup className="is-added">+{formatStat(added)}</sup> : null}
      </b>
      <button type="button" aria-label={`Aggiungi un punto a ${label}`} disabled={!canUp} onClick={onUp}>+</button>
    </span>
  );
}
