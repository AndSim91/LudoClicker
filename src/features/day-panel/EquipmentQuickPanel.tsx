import { useState } from "react";

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
  const count = (value: number) => value.toLocaleString("it-IT");
  const conditionLabel =
    damagedSwords > 0
      ? `${count(damagedSwords)} ${damagedSwords === 1 ? "rotta" : "rotte"}`
      : equipment.wear > 0
        ? `${Math.round(equipment.wear)} pt di usura`
        : "In ordine";

  let maintenanceLabel = `Ripara tutto \u00b7 ${formatCurrency(maintenanceCost)}`;
  let maintenanceText = `Ripara \u00b7 ${formatMaintenanceValue(maintenanceCost)}`;
  if (!hasRepairableEquipment) {
    maintenanceLabel = needsMaintenance
      ? "Riparazione non disponibile"
      : "Nessuna riparazione necessaria";
    maintenanceText = needsMaintenance ? "Riparazione bloccata" : "Niente da riparare";
  } else if (state.school.euros < minimumMaintenanceCost) {
    maintenanceLabel = `Servono almeno ${formatCurrency(minimumMaintenanceCost)}`;
    maintenanceText = "Fondi insufficienti";
  } else if (state.school.euros < maintenanceCost) {
    maintenanceLabel = `Riparazione parziale \u00b7 ${formatCurrency(state.school.euros)}`;
    maintenanceText = `Ripara \u00b7 ${formatMaintenanceValue(state.school.euros)}`;
  }

  let automaticLabel = "Controllo automatico attivo";
  if (automaticRepairBlocked) automaticLabel = "Riparazione automatica in attesa di fondi";
  else if (automaticTarget === "sword") automaticLabel = "Riparazione automatica di una spada";
  else if (automaticTarget === "wear") automaticLabel = "Riduzione automatica dell'usura";

  // Fase 8: one big number, one line of context, one filled button.
  const note = [
    reservedSwords > 0 ? `${count(reservedSwords)} in uso.` : "",
    equipmentCollaborators > 0
      ? automaticRepairBlocked
        ? "Gli addetti aspettano i fondi per riparare."
        : `${count(equipmentCollaborators)} ${equipmentCollaborators === 1 ? "addetto ripara" : "addetti riparano"} da ${equipmentCollaborators === 1 ? "solo" : "soli"}.`
      : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={`equipment-quick-card is-${condition}`} aria-label="Gestione attrezzatura">
      <div className="equipment-quick-heading">
        <h3>Spade</h3>
        <b>{conditionLabel}</b>
      </div>
      <p className="equipment-quick-total">
        <strong>{count(availableSwords)}</strong>
        <span>libere su {count(equipment.totalSwords)}</span>
      </p>

      <EquipmentConditionBar
        equipment={equipment}
        compact
        variant="saber"
        ariaLabel="Condizione delle spade della scuola"
      />

      {note ? <p className="equipment-quick-note">{note}</p> : null}
      {equipmentCollaborators > 0 ? (
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
      ) : null}

      <div className="equipment-quick-actions">
        <button
          className="equipment-maintenance-button"
          type="button"
          aria-label={maintenanceLabel}
          title={maintenanceLabel}
          disabled={!canMaintain}
          onClick={onMaintainEquipment}
        >
          {maintenanceText}
        </button>
        {showSupplier ? (
          <span className="equipment-purchase">
            <button
              className="equipment-purchase-button"
              type="button"
              disabled={!canBuy}
              title={`Polaris EVO Basic, ${formatCurrency(getOfficialSwordPurchaseCost(state, 1))} l'una`}
              onClick={() => onBuyOfficialSwords(purchaseAmount)}
            >
              Acquista {purchaseAmount === 1 ? "1 spada" : `${purchaseAmount} spade`} {"\u00b7"} {formatCurrency(purchaseCost)}
            </button>
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
          </span>
        ) : null}
      </div>
    </section>
  );
}
