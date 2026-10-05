import { useEffect, useRef, useState } from "react";

import { EquipmentDetailPanel } from "../equipment/EquipmentDetailPanel";
import { SchoolSaber } from "../equipment/SchoolSaber";
import { getAvailableSwords, getEffectiveDamagedSwords } from "../../game/equipment";
import type { GameState } from "../../game/types";
import { formatExactNumber } from "./resourceFormatting";

/**
 * Swords in the title bar: the hilt repairs, the label and the blade open the
 * detail with the purchase, which closes on Esc or a click elsewhere.
 */
export function TitleEquipment({
  equipment,
  euros,
  onMaintainEquipment,
  onBuyOfficialSwords,
}: {
  equipment: GameState["equipment"];
  euros: number;
  onMaintainEquipment: () => void;
  onBuyOfficialSwords: (amount: 1 | 10 | 100) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const availableSwords = getAvailableSwords(equipment);
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const status = damagedSwords > 0 ? "critical" : equipment.wear > 0 ? "warning" : "healthy";
  const toggle = () => setIsOpen((open) => !open);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className={`title-equipment is-${status}`} ref={rootRef} data-tutorial-region="title-equipment">
      <button
        className="title-equipment-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Spade disponibili: ${availableSwords} su ${equipment.totalSwords}; ${damagedSwords} rotte; ${Math.round(equipment.wear)} punti di usura`}
        onClick={toggle}
      >
        <small>Spade</small>
        <strong>{formatExactNumber(availableSwords)}</strong>
        <span>su {formatExactNumber(equipment.totalSwords)}</span>
      </button>
      <SchoolSaber
        equipment={equipment}
        euros={euros}
        onRepair={onMaintainEquipment}
        bladeButton={{
          "aria-label": "Dettaglio delle spade",
          "aria-expanded": isOpen,
          onClick: toggle,
        }}
      />
      {isOpen ? (
        <div className="title-equipment-popover" role="dialog" aria-label="Spade della scuola">
          <EquipmentDetailPanel
            onMaintainEquipment={onMaintainEquipment}
            onBuyOfficialSwords={onBuyOfficialSwords}
          />
        </div>
      ) : null}
    </div>
  );
}
