import { memo } from "react";

import {
  getEffectiveDamagedSwords,
  getReservedSwords,
} from "../../game/equipment";
import type { GameState } from "../../game/types";

type EquipmentState = GameState["equipment"];

const INDIVIDUAL_SWORD_LIMIT = 20;

interface SwordCondition {
  kind: "broken" | "reserved" | "available";
  load: number;
}

function getSwordConditions(equipment: EquipmentState): SwordCondition[] {
  const totalSwords = Math.max(0, Math.floor(equipment.totalSwords));
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const reservedSwords = getReservedSwords(equipment);
  let remainingLoad = Math.max(0, equipment.wear);

  return Array.from({ length: totalSwords }, (_, index) => {
    if (index < damagedSwords) return { kind: "broken", load: 100 };
    if (index < damagedSwords + reservedSwords) {
      return { kind: "reserved", load: 0 };
    }
    const load = Math.min(100, remainingLoad);
    remainingLoad = Math.max(0, remainingLoad - load);
    return { kind: "available", load };
  });
}

function getSwordTitle(condition: SwordCondition, index: number): string {
  const label = `Spada ${index + 1}`;
  if (condition.kind === "broken") return `${label}: rotta, 100/100 usura`;
  if (condition.kind === "reserved") return `${label}: riservata e non riparabile`;
  if (condition.load > 0) return `${label}: ${Math.round(condition.load)}/100 usura`;
  return `${label}: disponibile`;
}

function EquipmentConditionBarView({
  equipment,
  title,
  compact = false,
  ariaLabel = "Usura complessiva attrezzatura",
}: {
  equipment: EquipmentState;
  title?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const totalSwords = Math.max(0, Math.floor(equipment.totalSwords));
  const showIndividualSwords = !compact && totalSwords <= INDIVIDUAL_SWORD_LIMIT;
  const conditions = showIndividualSwords ? getSwordConditions(equipment) : [];
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const reservedSwords = getReservedSwords(equipment);
  const repairableSwords = Math.max(0, totalSwords - damagedSwords - reservedSwords);
  const normalLoad = Math.max(0, equipment.wear);
  const totalCapacity = Math.max(1, totalSwords * 100);
  const totalWear = Math.min(totalCapacity, damagedSwords * 100 + normalLoad);
  const healthyCapacity = Math.max(0, repairableSwords * 100 - normalLoad);
  const brokenCapacity = Math.min(totalCapacity, damagedSwords * 100);
  const reservedCapacity = Math.min(
    totalCapacity - brokenCapacity,
    reservedSwords * 100,
  );
  const loadCapacity = Math.min(
    totalCapacity - brokenCapacity - reservedCapacity,
    normalLoad,
  );
  const aggregateHealthyCapacity = Math.max(
    0,
    totalCapacity - brokenCapacity - reservedCapacity - loadCapacity,
  );
  const capacityPercentage = (capacity: number) => {
    const percentage = Math.round((capacity / totalCapacity) * 1_000_000) / 10_000;
    return `${percentage}%`;
  };
  const valueText = [
    `${damagedSwords} ${damagedSwords === 1 ? "spada rotta" : "spade rotte"}`,
    `${reservedSwords} ${reservedSwords === 1 ? "spada riservata" : "spade riservate"}`,
    `${Math.round(normalLoad)} punti di usura normale`,
    `${Math.round(healthyCapacity)} punti disponibili`,
  ].join(", ");

  return (
    <div className={`equipment-condition${compact ? " is-compact" : ""}`}>
      {title ? <strong className="equipment-condition-title">{title}</strong> : null}
      <div
        className={`equipment-condition-bar${showIndividualSwords ? "" : " is-aggregate"}`}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={totalCapacity}
        aria-valuenow={Math.round(totalWear)}
        aria-valuetext={valueText}
      >
        {showIndividualSwords ? conditions.map((condition, index) => (
            <span
              className={`equipment-sword-cell is-${condition.kind}`}
              title={getSwordTitle(condition, index)}
              key={index}
            >
              {condition.kind === "available" && condition.load > 0 ? (
                <span
                  className="equipment-sword-load"
                  style={{ width: `${condition.load}%` }}
                />
              ) : null}
            </span>
          )) : (
            <>
              <span
                className="equipment-condition-segment is-broken"
                title={`Spade rotte: ${damagedSwords} · ${brokenCapacity} punti`}
                style={{ width: capacityPercentage(brokenCapacity) }}
              />
              <span
                className="equipment-condition-segment is-reserved"
                title={`Spade riservate: ${reservedSwords} · ${reservedCapacity} punti`}
                style={{ width: capacityPercentage(reservedCapacity) }}
              />
              <span
                className="equipment-condition-segment is-load"
                title={`Usura normale: ${Math.round(loadCapacity)} punti`}
                style={{ width: capacityPercentage(loadCapacity) }}
              />
              <span
                className="equipment-condition-segment is-healthy"
                title={`Capacità disponibile: ${Math.round(aggregateHealthyCapacity)} punti`}
                style={{ width: capacityPercentage(aggregateHealthyCapacity) }}
              />
            </>
          )}
      </div>
      {compact ? null : (
        <div className="equipment-condition-legend" aria-hidden="true">
          <span className="is-load"><i />Usura <strong>{Math.round(normalLoad)} pt</strong></span>
          <span className="is-broken"><i />Rotte <strong>{damagedSwords}</strong></span>
          <span className="is-reserved"><i />Riservate <strong>{reservedSwords}</strong></span>
          <span className="is-healthy"><i />Disponibile</span>
        </div>
      )}
    </div>
  );
}

export const EquipmentConditionBar = memo(EquipmentConditionBarView);
