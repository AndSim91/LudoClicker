import { PERSON_RARITIES } from "../../content/rarities";
import { getEmailBookingChance, getEnrollmentChance } from "../../game/formulas";
import type { GameState, PersonRarity } from "../../game/types";
import { formatPercent } from "../../shared/formatters";

const RARITY_ORDER: PersonRarity[] = ["common", "rare", "ultra-rare", "legendary"];

export function RarityOverview({ state }: { state: GameState }) {
  return (
    <section className="rarity-overview" aria-label="Sistema di rarità">
      <div>
        <strong>Probabilità e rarità</strong>
        <span>Valori base ed efficacia attuale con i tuoi potenziamenti</span>
      </div>
      {RARITY_ORDER.map((rarity) => {
        const definition = PERSON_RARITIES[rarity];
        return (
          <article className={rarity === "common" ? undefined : rarity} key={rarity}>
            <strong>{definition.label}</strong>
            <span>Comparsa: {formatPercent(definition.queueAppearanceChance)}</span>
            <span>Prova dopo la mail: {formatPercent(getEmailBookingChance(state, rarity))}</span>
            <span>
              Iscrizione: {formatPercent(definition.baseEnrollmentChance)} base · {formatPercent(getEnrollmentChance(state, rarity))} attuale · max {formatPercent(definition.maxEnrollmentChance)}
            </span>
            <span>
              Effettiva base mail → iscritto: {formatPercent(definition.baseTrialBookingChance * definition.baseEnrollmentChance)}
            </span>
            <span>{definition.collaboratorDescription}</span>
          </article>
        );
      })}
    </section>
  );
}
