import { PERSON_RARITIES } from "../../content/rarities";
import { getEmailBookingChance, getEnrollmentChance } from "../../game/formulas";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState, PersonRarity } from "../../game/types";
import { formatPercent } from "../../shared/formatters";

const RARITY_ORDER: PersonRarity[] = ["common", "rare", "ultra-rare", "legendary"];

export function RarityOverview({ state: stateOverride }: { state?: GameState }) {
  const state = useGameStateSlices(["collaborators", "school", "upgrades"], stateOverride);
  return (
    <section className="rarity-overview" aria-label="Sistema di rarità">
      <div>
        <strong>Probabilità e rarità</strong>
        <span>Valori base ed efficacia attuale con i tuoi Upgrade</span>
      </div>
      {RARITY_ORDER.map((rarity) => {
        const definition = PERSON_RARITIES[rarity];
        return (
          <article className={rarity === "common" ? undefined : rarity} key={rarity}>
            <strong>{definition.label}</strong>
            <span>Comparsa: {formatPercent(definition.queueAppearanceChance)}</span>
            <span title="Dipende dalla rarità e dai punti Creatività (Upgrade)">Prova dopo l'email: {formatPercent(getEmailBookingChance(state, rarity))}</span>
            <span>
              Iscrizione: {formatPercent(definition.baseEnrollmentChance)} base · {formatPercent(getEnrollmentChance(state, rarity))} attuale · max {formatPercent(definition.maxEnrollmentChance)}
            </span>
            <span>
              Effettiva base email → iscritto: {formatPercent(definition.baseTrialBookingChance * definition.baseEnrollmentChance)}
            </span>
            <span>{definition.collaboratorDescription}</span>
          </article>
        );
      })}
    </section>
  );
}
