import { Icon, type IconName } from "../../components/common/Icon";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  getUpgradeCost,
  getUpgradeEffectTotal,
  type UpgradeCategory,
  type UpgradeDefinition,
} from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { selectIncomePerMinute } from "../../game/selectors";
import type { GameState, UpgradeId } from "../../game/types";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

const categoryIcons: Record<UpgradeCategory, IconName> = {
  speed: "spark",
  charisma: "people",
  writing: "mail",
  welcome: "contact",
  social: "people",
  equipment: "settings",
  organization: "tasks",
};

function getCategorySummary(state: GameState, category: UpgradeCategory) {
  switch (category) {
    case "speed":
      return `${state.player.writingPower} caratteri per input`;
    case "charisma":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier") * 100)}% contatti`;
    case "writing":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "bookingMultiplier") * 100)}% prenotazioni`;
    case "welcome":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier") * 100)}% iscrizioni`;
    case "social":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "socialMultiplier") * 100)}% produzione`;
    case "equipment":
      return `${state.equipment.totalSwords} spade · -${Math.round(getUpgradeEffectTotal(state.upgrades, "equipmentWearReduction") * 100)}% usura`;
    case "organization":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "automationMultiplier") * 100)}% automazione`;
  }
}

function getPurchaseLabel(state: GameState, definition: UpgradeDefinition) {
  const level = state.upgrades[definition.id];
  if (level >= definition.maxLevel) return "Completato";
  if (state.school.historicMembers < definition.requiredHistoricMembers) {
    return `Richiede ${definition.requiredHistoricMembers} iscritti`;
  }
  const cost = getUpgradeCost(definition, level);
  if (state.school.euros < cost) return "Fondi insufficienti";
  return "Acquista";
}

export function UpgradesView({
  state,
  onBuyUpgrade,
}: {
  state: GameState;
  onBuyUpgrade: (upgradeId: UpgradeId) => void;
}) {
  const incomePerMinute = selectIncomePerMinute(state);

  return (
    <main className="overview-view shop-view">
      <header><Icon name="spark" /><div><h1>Miglioramenti</h1><p>Strumenti e procedure per far crescere l'Ordine delle Onde</p></div></header>
      <section className="income-summary" aria-label="Entrate dell'Ordine">
        <div><span>Entrate previste</span><strong>{euro.format(incomePerMinute)} <small>al minuto</small></strong></div>
        <p>{state.school.activeMembers} {state.school.activeMembers === 1 ? "iscritto attivo" : "iscritti attivi"} × {euro.format(GAME_CONFIG.memberFee)} ogni minuto</p>
        <div className="income-balance"><span>Disponibilità attuale</span><b>{euro.format(state.school.euros)}</b></div>
      </section>
      {UPGRADE_CATEGORIES.map((category) => (
        <section className="shop-section" key={category.id}>
          <div className="section-title"><div><h2>{category.title}</h2><p>{category.description}</p></div><span>{getCategorySummary(state, category.id)}</span></div>
          {UPGRADE_DEFINITIONS.filter((definition) => definition.category === category.id).map(
            (definition) => {
              const level = state.upgrades[definition.id];
              const cost = getUpgradeCost(definition, level);
              const unlocked =
                state.school.historicMembers >= definition.requiredHistoricMembers;
              const canBuy =
                unlocked && level < definition.maxLevel && state.school.euros >= cost;
              const purchaseLabel = getPurchaseLabel(state, definition);
              return (
                <div className="upgrade-row" key={definition.id}>
                  <div className="upgrade-icon"><Icon name={categoryIcons[category.id]} /></div>
                  <div className="upgrade-description"><strong>{definition.title}</strong><span>{definition.description}</span></div>
                  <div className="upgrade-effect"><strong>Livello {level}/{definition.maxLevel}</strong><span>{definition.effectLabel}</span></div>
                  <div className="upgrade-price">
                    <span>Prezzo</span>
                    <strong>{level >= definition.maxLevel ? "—" : euro.format(cost)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade(definition.id)}
                    disabled={!canBuy}
                    aria-label={`${purchaseLabel} — ${definition.title}`}
                  >
                    {purchaseLabel}
                  </button>
                </div>
              );
            },
          )}
        </section>
      ))}
    </main>
  );
}
