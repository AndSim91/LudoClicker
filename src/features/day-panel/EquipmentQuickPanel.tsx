import { useState } from "react";

import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { EquipmentConditionBar } from "../../components/equipment/EquipmentConditionBar";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  getAvailableSwords,
  getEffectiveDamagedSwords,
  getEquipmentAutomaticRepairTarget,
  getEquipmentAutomaticRepairUnitCost,
  getEquipmentMaintenanceCost,
  getEquipmentMinimumMaintenanceCost,
  getOfficialSwordPurchaseCost,
  getReservedSwords,
} from "../../game/equipment";
import type { GameState } from "../../game/types";
import { isOfficialSwordSupplierVisible } from "../../game/unlocks";
import { formatCompactCurrency, formatCurrency } from "../../shared/formatters";

type PurchaseAmount = 1 | 10 | 100;

const PURCHASE_AMOUNTS: readonly PurchaseAmount[] = [1, 10, 100];

function formatMaintenanceValue(value: number): string {
  return value >= 1_000 ? formatCompactCurrency(value) : formatCurrency(value);
}

function getAffordablePurchaseAmounts(state: GameState): PurchaseAmount[] {
  return PURCHASE_AMOUNTS.filter(
    (amount) => amount === 1 || state.school.euros >= getOfficialSwordPurchaseCost(state, amount),
  );
}

export function EquipmentQuickPanel({
  state: stateOverride,
  onMaintainEquipment,
  onBuyOfficialSwords,
}: {
  state?: GameState;
  onMaintainEquipment: () => void;
  onBuyOfficialSwords: (amount: PurchaseAmount) => void;
}) {
  const state = useGameStateSlices(
    ["automation", "collaborators", "equipment", "lightInflation", "school"],
    stateOverride,
  );
  const [purchaseIndex, setPurchaseIndex] = useState(0);
  const equipment = state.equipment;
  const availableSwords = getAvailableSwords(equipment);
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const reservedSwords = getReservedSwords(equipment);
  const maintenanceCost = getEquipmentMaintenanceCost(equipment);
  const minimumMaintenanceCost = getEquipmentMinimumMaintenanceCost(equipment);
  const needsMaintenance = equipment.wear > 0 || damagedSwords > 0;
  const hasRepairableEquipment = damagedSwords > 0 || (equipment.wear > 0 && availableSwords > 0);
  const canMaintain = hasRepairableEquipment && state.school.euros >= minimumMaintenanceCost;
  const affordableAmounts = getAffordablePurchaseAmounts(state);
  const purchaseAmount = affordableAmounts[purchaseIndex % affordableAmounts.length];
  const purchaseCost = getOfficialSwordPurchaseCost(state, purchaseAmount);
  const canBuy = state.school.euros >= purchaseCost;
  const showSupplier = isOfficialSwordSupplierVisible(state);
  const equipmentCollaborators = state.collaborators.filter(
    (collaborator) => collaborator.assignment === "equipment",
  ).length;
  const automaticTarget = getEquipmentAutomaticRepairTarget(equipment);
  const automaticUnitCost = automaticTarget
    ? getEquipmentAutomaticRepairUnitCost(automaticTarget)
    : 0;
  const automaticRepairBlocked =
    automaticTarget !== undefined && state.school.euros < automaticUnitCost;
  const automaticProgress =
    automaticTarget === "sword"
      ? Math.min(
          100,
          (state.automation.equipmentBuffer / GAME_CONFIG.equipmentSwordRepairWork) * 100,
        )
      : Math.min(100, state.automation.equipmentBuffer * 100);
  const condition = damagedSwords > 0 ? "critical" : equipment.wear > 0 ? "warning" : "healthy";
  const conditionLabel =
    damagedSwords > 0
      ? `${damagedSwords} ${damagedSwords === 1 ? "rotta" : "rotte"}`
      : equipment.wear > 0
        ? `${Math.round(equipment.wear)} pt usura`
        : "In ordine";

  let maintenanceLabel = `Ripara tutto \u00b7 ${formatCurrency(maintenanceCost)}`;
  let maintenanceValue = formatMaintenanceValue(maintenanceCost);
  if (!hasRepairableEquipment) {
    maintenanceLabel = needsMaintenance
      ? "Riparazione non disponibile"
      : "Nessuna riparazione necessaria";
    maintenanceValue = needsMaintenance ? "Bloccata" : "In ordine";
  } else if (state.school.euros < minimumMaintenanceCost) {
    maintenanceLabel = `Servono almeno ${formatCurrency(minimumMaintenanceCost)}`;
    maintenanceValue = "Fondi";
  } else if (state.school.euros < maintenanceCost) {
    maintenanceLabel = `Riparazione parziale \u00b7 ${formatCurrency(state.school.euros)}`;
    maintenanceValue = formatMaintenanceValue(state.school.euros);
  }

  let automaticLabel = "Controllo automatico attivo";
  if (automaticRepairBlocked) automaticLabel = "Riparazione automatica in attesa di fondi";
  else if (automaticTarget === "sword") automaticLabel = "Riparazione automatica di una spada";
  else if (automaticTarget === "wear") automaticLabel = "Riduzione automatica dell'usura";

  return (
    <section className={`equipment-quick-card is-${condition}`} aria-label="Gestione attrezzatura">
      <div className="equipment-quick-heading">
        <Icon name="wrench" />
        <span>
          <small>Attrezzatura</small>
          <strong>
            {availableSwords}/{equipment.totalSwords} spade libere
          </strong>
        </span>
        <b>{conditionLabel}</b>
      </div>

      <EquipmentConditionBar
        equipment={equipment}
        compact
        variant="saber"
        ariaLabel="Condizione delle spade della scuola"
      />

      <div
        className="equipment-quick-metrics has-maintenance-action"
        aria-label="Legenda e manutenzione spade"
      >
        <span className="is-reserved">
          <small>
            <i aria-hidden="true" />
            In uso
          </small>
          <strong>{reservedSwords}</strong>
        </span>
        <span className="is-load">
          <small>
            <i aria-hidden="true" />
            Usura
          </small>
          <strong>{Math.round(equipment.wear)} pt</strong>
        </span>
        <span className="is-broken">
          <small>
            <i aria-hidden="true" />
            Rotte
          </small>
          <strong>{damagedSwords}</strong>
        </span>
        <button
          className="equipment-maintenance-button"
          type="button"
          aria-label={maintenanceLabel}
          title={maintenanceLabel}
          disabled={!canMaintain}
          onClick={onMaintainEquipment}
        >
          <small>
            <Icon name="wrench" />
            Ripara
          </small>
          <strong>{maintenanceValue}</strong>
        </button>
      </div>

      {equipmentCollaborators > 0 ? (
        <div className="equipment-auto-repair">
          <div className="equipment-auto-repair-heading">
            <span>{automaticLabel}</span>
            <strong>
              {equipmentCollaborators} {equipmentCollaborators === 1 ? "addetto" : "addetti"}
            </strong>
          </div>
          <div className="equipment-auto-progress-slot">
            {automaticTarget && !automaticRepairBlocked ? (
              <ProgressBar
                className="equipment-auto-progress"
                label={automaticLabel}
                value={automaticProgress}
                valueText={`${Math.round(automaticProgress)}% completato`}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {showSupplier ? (
        <div className="equipment-purchase">
          <button
            className="equipment-purchase-quantity"
            type="button"
            disabled={affordableAmounts.length === 1}
            aria-label={`Quantit\u00e0 acquisto: \u00d7${purchaseAmount}. Premi per cambiare`}
            title={`Quantit\u00e0 disponibili: ${affordableAmounts.map((amount) => `\u00d7${amount}`).join(", ")}`}
            onClick={() => setPurchaseIndex((index) => (index + 1) % affordableAmounts.length)}
          >
            {"\u00d7"}
            {purchaseAmount}
          </button>
          <button
            className="equipment-purchase-button"
            type="button"
            disabled={!canBuy}
            onClick={() => onBuyOfficialSwords(purchaseAmount)}
          >
            <Icon name="plus" />
            <span>
              <strong>
                Acquista {purchaseAmount === 1 ? "1 spada" : `${purchaseAmount} spade`}
              </strong>
              <small>Polaris EVO Basic - {formatCurrency(purchaseCost)}</small>
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
