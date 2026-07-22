import { memo } from "react";

import {
  getEffectiveDamagedSwords,
  getReservedSwords,
} from "../../game/equipment";
import type { GameState } from "../../game/types";

type EquipmentState = GameState["equipment"];

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
  if (condition.kind === "broken") return `${label}: rotta, 100/100 carico`;
  if (condition.kind === "reserved") return `${label}: riservata e non riparabile`;
  if (condition.load > 0) return `${label}: ${Math.round(condition.load)}/100 carico`;
  return `${label}: sana`;
}

function EquipmentConditionBarView({ equipment }: { equipment: EquipmentState }) {
  const conditions = getSwordConditions(equipment);
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const reservedSwords = getReservedSwords(equipment);
  const repairableSwords = Math.max(0, equipment.totalSwords - damagedSwords - reservedSwords);
  const normalLoad = Math.max(0, equipment.wear);
  const totalCapacity = Math.max(1, equipment.totalSwords * 100);
  const totalWear = Math.min(totalCapacity, damagedSwords * 100 + normalLoad);
  const healthyCapacity = Math.max(0, repairableSwords * 100 - normalLoad);
  const valueText = [
    `${damagedSwords} ${damagedSwords === 1 ? "spada rotta" : "spade rotte"}`,
    `${reservedSwords} ${reservedSwords === 1 ? "spada riservata" : "spade riservate"}`,
    `${Math.round(normalLoad)} punti di carico normale`,
    `${Math.round(healthyCapacity)} punti sani riparabili`,
  ].join(", ");

  return (
    <div className="equipment-condition">
      <div
        className="equipment-condition-bar"
        role="progressbar"
        aria-label="Usura complessiva attrezzatura"
        aria-valuemin={0}
        aria-valuemax={totalCapacity}
        aria-valuenow={Math.round(totalWear)}
        aria-valuetext={valueText}
      >
        {conditions.map((condition, index) => (
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
        ))}
      </div>
      <div className="equipment-condition-legend" aria-hidden="true">
        <span className="is-load"><i />Carico <strong>{Math.round(normalLoad)} pt</strong></span>
        <span className="is-broken"><i />Rotte <strong>{damagedSwords}</strong></span>
        <span className="is-reserved"><i />Riservate <strong>{reservedSwords}</strong></span>
        <span className="is-healthy"><i />Sano <strong>{Math.round(healthyCapacity)} pt</strong></span>
      </div>
    </div>
  );
}

export const EquipmentConditionBar = memo(EquipmentConditionBarView);
