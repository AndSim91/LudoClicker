import { useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  getUpgradeCost,
  getUpgradeEffectTotal,
  type UpgradeCategory,
  type UpgradeDefinition,
} from "../../content/upgrades";
import { getGameMonthName } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { getOfflineLimitMs } from "../../game/offline";
import { selectAvailableContacts, selectIncomePerMonth } from "../../game/selectors";
import type { GameState, UpgradeId } from "../../game/types";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

type ShopFilter = "recommended" | "available" | "all";

const categoryIcons: Record<UpgradeCategory, IconName> = {
  speed: "spark",
  charisma: "people",
  writing: "mail",
  welcome: "contact",
  social: "people",
  equipment: "settings",
  organization: "tasks",
};

const recommendationReasons: Record<UpgradeCategory, string> = {
  speed: "smaltisce più rapidamente la coda di contatti",
  charisma: "rende più produttivo il prossimo evento",
  writing: "aumenta il rendimento delle email già disponibili",
  welcome: "protegge la conversione finale del funnel",
  social: "mantiene attiva l'acquisizione automatica",
  equipment: "riduce i rallentamenti dovuti all'usura",
  organization: "rafforza automazione ed entrate ricorrenti",
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
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "automationMultiplier") * 100)}% automazione · ${Math.round(getOfflineLimitMs(state) / 3_600_000)} h offline`;
  }
}

function getPurchaseLabel(state: GameState, definition: UpgradeDefinition) {
  const level = state.upgrades[definition.id];
  if (level >= definition.maxLevel) return "Completato";
  if (state.school.historicMembers < definition.requiredHistoricMembers) {
    return `Richiede ${definition.requiredHistoricMembers} iscritti`;
  }
  const cost = getUpgradeCost(definition, level, state.network.schools.length);
  if (state.school.euros < cost) return "Fondi insufficienti";
  return "Acquista";
}

function getCategoryPriority(state: GameState): UpgradeCategory[] {
  const availableContacts = selectAvailableContacts(state);
  const categories: UpgradeCategory[] = availableContacts > 8
    ? ["speed", "writing", "welcome", "charisma", "organization", "equipment", "social"]
    : ["charisma", "speed", "writing", "welcome", "organization", "equipment", "social"];

  if (state.scheduledTrials.some((trial) => trial.status === "scheduled")) {
    categories.splice(categories.indexOf("welcome"), 1);
    categories.unshift("welcome");
  }
  if (state.equipment.wear >= 25) {
    categories.splice(categories.indexOf("equipment"), 1);
    categories.unshift("equipment");
  }
  return categories;
}

function getRecommendedUpgradeIds(state: GameState): Set<UpgradeId> {
  const categoryPriority = getCategoryPriority(state);
  const candidates = categoryPriority.flatMap((category) => {
    const candidate = UPGRADE_DEFINITIONS.find((definition) =>
      definition.category === category &&
      definition.requiredHistoricMembers <= state.school.historicMembers &&
      state.upgrades[definition.id] < definition.maxLevel
    );
    return candidate ? [candidate] : [];
  });
  candidates.sort((a, b) => {
    const aCost = getUpgradeCost(a, state.upgrades[a.id], state.network.schools.length);
    const bCost = getUpgradeCost(b, state.upgrades[b.id], state.network.schools.length);
    const affordability = Number(bCost <= state.school.euros) - Number(aCost <= state.school.euros);
    return affordability || categoryPriority.indexOf(a.category) - categoryPriority.indexOf(b.category);
  });
  return new Set(candidates.slice(0, 4).map((definition) => definition.id));
}

export function UpgradesView({
  state,
  onBuyUpgrade,
}: {
  state: GameState;
  onBuyUpgrade: (upgradeId: UpgradeId) => void;
}) {
  const [filter, setFilter] = useState<ShopFilter>("recommended");
  const incomePerMonth = selectIncomePerMonth(state);
  const monthName = getGameMonthName(state.school.currentMonth);
  const secondsToNextMonth = Math.max(
    0,
    Math.ceil((state.school.nextFeeAt - state.automation.lastProcessedAt) / 1_000),
  );
  const recommendedIds = getRecommendedUpgradeIds(state);
  const availableCount = UPGRADE_DEFINITIONS.filter((definition) =>
    definition.requiredHistoricMembers <= state.school.historicMembers &&
    state.upgrades[definition.id] < definition.maxLevel
  ).length;
  const nextUnlockThreshold = Math.min(
    ...UPGRADE_DEFINITIONS
      .filter((definition) => definition.requiredHistoricMembers > state.school.historicMembers)
      .map((definition) => definition.requiredHistoricMembers),
  );
  const nextUnlockCount = Number.isFinite(nextUnlockThreshold)
    ? UPGRADE_DEFINITIONS.filter(
        (definition) => definition.requiredHistoricMembers === nextUnlockThreshold,
      ).length
    : 0;
  const visibleDefinitions = UPGRADE_DEFINITIONS.filter((definition) => {
    if (filter === "all") return true;
    if (filter === "recommended") return recommendedIds.has(definition.id);
    return definition.requiredHistoricMembers <= state.school.historicMembers &&
      state.upgrades[definition.id] < definition.maxLevel;
  });

  return (
    <main className="overview-view shop-view">
      <header><Icon name="spark" /><div><h1>Miglioramenti</h1><p>Strumenti e procedure per far crescere l'Ordine delle Onde</p></div></header>
      <section className="income-summary" aria-label="Entrate dell'Ordine">
        <div><span>Entrate di {monthName}</span><strong>{euro.format(incomePerMonth)} <small>al mese</small></strong></div>
        <p>{state.school.activeMembers} {state.school.activeMembers === 1 ? "iscritto attivo" : "iscritti attivi"} × {euro.format(GAME_CONFIG.monthlyMemberFee)} di quota mensile · prossimo mese tra {secondsToNextMonth} s</p>
        <div className="income-balance"><span>Disponibilità attuale</span><b>{euro.format(state.school.euros)}</b></div>
      </section>

      <section className="shop-guide" aria-label="Guida ai miglioramenti">
        <div className="shop-filters" role="tablist" aria-label="Filtra miglioramenti">
          <FilterButton active={filter === "recommended"} onClick={() => setFilter("recommended")} label={`Consigliati (${recommendedIds.size})`} />
          <FilterButton active={filter === "available"} onClick={() => setFilter("available")} label={`Disponibili (${availableCount})`} />
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label={`Catalogo completo (${UPGRADE_DEFINITIONS.length})`} />
        </div>
        {nextUnlockCount > 0 ? (
          <p><strong>Prossimo sblocco:</strong> {nextUnlockCount} miglioramenti a {nextUnlockThreshold} iscritti storici.</p>
        ) : <p><strong>Catalogo completato:</strong> tutti i rami sono disponibili.</p>}
      </section>

      {UPGRADE_CATEGORIES.map((category) => {
        const definitions = visibleDefinitions.filter(
          (definition) => definition.category === category.id,
        );
        return definitions.length === 0 ? null : (
          <section className="shop-section" key={category.id}>
            <div className="section-title"><div><h2>{category.title}</h2><p>{category.description}</p></div><span>{getCategorySummary(state, category.id)}</span></div>
            {definitions.map((definition) => {
              const level = state.upgrades[definition.id];
              const cost = getUpgradeCost(definition, level, state.network.schools.length);
              const unlocked = state.school.historicMembers >= definition.requiredHistoricMembers;
              const canBuy = unlocked && level < definition.maxLevel && state.school.euros >= cost;
              const purchaseLabel = getPurchaseLabel(state, definition);
              const recommended = recommendedIds.has(definition.id);
              return (
                <div className={`upgrade-row${recommended ? " recommended" : ""}`} key={definition.id}>
                  <div className="upgrade-icon"><Icon name={categoryIcons[category.id]} /></div>
                  <div className="upgrade-description">
                    <strong>{definition.title}</strong>
                    <span>{definition.description}</span>
                    {recommended ? <small>Consigliato: {recommendationReasons[category.id]}.</small> : null}
                  </div>
                  <div className="upgrade-effect"><strong>Livello {level}/{definition.maxLevel}</strong><span>{definition.effectLabel}</span></div>
                  <div className="upgrade-price"><span>Prezzo</span><strong>{level >= definition.maxLevel ? "—" : euro.format(cost)}</strong></div>
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
            })}
          </section>
        );
      })}
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}
