import { useEffect, useState } from "react";
import { GAME_CONFIG } from "../../game/config";
import {
  REPUTATION_UPGRADES,
  REPUTATION_UPGRADE_IDS,
  getReputationLevel,
  getSpentReputation,
  isValidReputationSpending,
  type PrestigeReputationPreview,
  type ReputationSpending,
  type ReputationUpgradeId,
} from "../../game/reputation";
import type { GameState, SchoolFoundationDetails } from "../../game/types";
import { formatCurrency, formatStat } from "../../shared/formatters";

const STEPS = ["Nuova scuola", "Reputazione", "Conferma"] as const;
const percent = (level: number) => `+${Math.round(level * GAME_CONFIG.reputationStep * 100)}%`;

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
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<SchoolFoundationDetails>({ name: "", city: "", accentColor: state.school.accentColor });
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
  const valid = isValidReputationSpending(state, spending, available);
  const named = details.name.trim() !== "" && details.city.trim() !== "";
  const change = (key: ReputationUpgradeId | "rent", delta: number) =>
    setAdded((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));
  const canAdd = (id?: ReputationUpgradeId) =>
    left > 0 && (!id || getReputationLevel(state, id) + (added[id] ?? 0) < GAME_CONFIG.reputationUpgradeMaxLevel);
  const rentAmount = Math.round(preview.rentPerPoint * spending.rent);

  return (
    <div className="foundation-backdrop">
      <form
        className="foundation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="foundation-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) setStep(step + 1);
          else onConfirm({ ...details, name: details.name.trim(), city: details.city.trim() }, spending);
        }}
      >
        <header>
          <h2 id="foundation-title">Fonda una nuova scuola</h2>
          <ol className="foundation-steps">
            {STEPS.map((label, index) => (
              <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : undefined} aria-current={index === step ? "step" : undefined}>
                {index + 1} · {label}
              </li>
            ))}
          </ol>
        </header>

        {step === 0 ? (
          <div className="foundation-body">
            <label>Nome della scuola
              <input name="name" required maxLength={60} autoFocus placeholder="Ordine delle Onde" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} />
            </label>
            <label>Città
              <input name="city" required maxLength={40} placeholder="Genova" value={details.city} onChange={(event) => setDetails({ ...details, city: event.target.value })} />
            </label>
            <label className="foundation-color">Colore
              <input type="color" name="accentColor" value={details.accentColor} onChange={(event) => setDetails({ ...details, accentColor: event.target.value })} />
            </label>
          </div>
        ) : step === 1 ? (
          <div className="foundation-body">
            <p className="foundation-budget">
              <span>{formatStat(state.network.reputation)} in tasca + {formatStat(preview.points)} da {state.school.name}</span>
              <b className={left < 0 ? "is-over" : undefined}>{points(left)} da spendere su {formatStat(available)}</b>
            </p>
            {REPUTATION_UPGRADE_IDS.map((id) => {
              const level = getReputationLevel(state, id);
              const extra = added[id] ?? 0;
              return (
                <div key={id} className="foundation-row">
                  <span>{REPUTATION_UPGRADES[id].label}<small>{REPUTATION_UPGRADES[id].description} · {percent(level)}{extra > 0 ? ` → ${percent(level + extra)}` : ""}</small></span>
                  <Stepper label={REPUTATION_UPGRADES[id].label} value={extra} onDown={() => change(id, -1)} onUp={() => change(id, 1)} canUp={canAdd(id)} />
                </div>
              );
            })}
            <div className="foundation-row">
              <span>Rendita della rete<small>Si consuma: ogni punto blocca {formatCurrency(Math.round(preview.rentPerPoint))}/mese da {state.school.name}{rentAmount > 0 ? `, ${formatCurrency(rentAmount)} in tutto` : ""}.</small></span>
              <Stepper label="Rendita della rete" value={spending.rent} onDown={() => change("rent", -1)} onUp={() => change("rent", 1)} canUp={canAdd()} />
            </div>
          </div>
        ) : (
          <div className="foundation-body foundation-summary">
            <p><b>{state.school.name}</b> entra nella Rete con Fama {formatStat(state.school.fame)}{rentAmount > 0 ? ` e ti versa ${formatCurrency(rentAmount)} al mese` : ""}.</p>
            <p><b>{details.name.trim()}</b> apre a {details.city.trim()} e riparte da zero: Fama, fondi, iscritti, collaboratori e Upgrade della scuola. Un Leggendario a caso ti segue, senza niente in tasca.</p>
            <p>Restano la Reputazione e i suoi potenziamenti, {left > 0 ? `${points(left)} da spendere la prossima volta, ` : ""}Torneo della Superba, Corso X, Ludodex e Traguardi.</p>
          </div>
        )}

        <footer>
          {step === 0
            ? <button type="button" className="secondary" onClick={onCancel}>Annulla</button>
            : <button type="button" className="secondary" onClick={() => setStep(step - 1)}>Indietro</button>}
          <span>{step === 1 ? "I punti non spesi restano per la prossima volta." : step === 2 ? "Non si torna indietro." : ""}</span>
          <button type="submit" className={step === 2 ? "danger" : undefined} disabled={(step === 0 && !named) || (step > 0 && !valid)}>
            {step === 2 ? `Fonda ${details.name.trim()}` : "Avanti"}
          </button>
        </footer>
      </form>
    </div>
  );
}

const points = (value: number) => `${formatStat(value)} ${value === 1 ? "punto" : "punti"}`;

function Stepper({ label, value, onDown, onUp, canUp }: {
  label: string;
  value: number;
  onDown: () => void;
  onUp: () => void;
  canUp: boolean;
}) {
  return (
    <span className="foundation-stepper">
      <button type="button" aria-label={`Togli un punto da ${label}`} disabled={value === 0} onClick={onDown}>−</button>
      <b className={value > 0 ? "is-added" : undefined}>{value > 0 ? `+${value}` : 0}</b>
      <button type="button" aria-label={`Aggiungi un punto a ${label}`} disabled={!canUp} onClick={onUp}>+</button>
    </span>
  );
}
