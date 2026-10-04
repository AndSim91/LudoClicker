import { useId, type ButtonHTMLAttributes } from "react";

import {
  getAvailableSwords,
  getEffectiveDamagedSwords,
  getEquipmentRepairStatus,
  getReservedSwords,
  type EquipmentRepairStatus,
} from "../../game/equipment";
import type { GameState } from "../../game/types";
import { formatCurrency, formatShortCurrency } from "../../shared/formatters";

type EquipmentState = GameState["equipment"];

/** Wear is tiny next to the whole capacity: give it a sliver so it stays visible. */
const MINIMUM_VISIBLE_WEAR = 0.04;

function getHiltText(status: EquipmentRepairStatus): { label: string; price: string } {
  switch (status.kind) {
    case "none":
      return { label: "Spade in ordine", price: "" };
    case "blocked":
      return { label: "Riparazione non disponibile: l'usura è sulle spade in uso", price: "" };
    case "short":
      return { label: `Servono almeno ${formatCurrency(status.amount)} per riparare`, price: formatShortCurrency(status.amount) };
    case "partial":
      return { label: `Riparazione parziale · ${formatCurrency(status.amount)}`, price: formatShortCurrency(status.amount) };
    default:
      return { label: `Ripara tutto · ${formatCurrency(status.amount)}`, price: formatShortCurrency(status.amount) };
  }
}

function getBladeShares(equipment: EquipmentState) {
  const total = Math.max(1, Math.floor(equipment.totalSwords));
  const broken = getEffectiveDamagedSwords(equipment);
  const inUse = getReservedSwords(equipment);
  const free = getAvailableSwords(equipment);
  const capacity = total * 100;
  const realWear = Math.min(Math.max(0, equipment.wear), free * 100);
  const wear = realWear > 0 ? Math.min(free * 100, Math.max(realWear, capacity * MINIMUM_VISIBLE_WEAR)) : 0;
  const share = (points: number) => `${(points / capacity) * 100}%`;
  return {
    healthy: share(free * 100 - wear),
    wear: share(wear),
    inUse: share(inUse * 100),
    broken: share(broken * 100),
  };
}

const RIDGES = Array.from({ length: 15 }, (_, index) => 11 + index * 3.4);

/**
 * The school's sword: the hilt is the manual repair button (price on the grip,
 * a ring coloured by what the funds allow), the blade is the state of every
 * sword, from the hilt out: free, worn, in use, broken.
 */
export function SchoolSaber({
  equipment,
  euros,
  onRepair,
  size = "bar",
  bladeButton,
}: {
  equipment: EquipmentState;
  euros: number;
  onRepair: () => void;
  size?: "bar" | "large";
  bladeButton?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const id = useId();
  const status = getEquipmentRepairStatus(equipment, euros);
  const { label, price } = getHiltText(status);
  const canRepair = status.kind === "full" || status.kind === "partial";
  const blade = getBladeShares(equipment);
  const metal = `${id}-metal`;
  const grip = `${id}-grip`;

  const bladeBody = (
    <span className="school-saber-blade" aria-hidden="true">
      <span className="is-healthy" style={{ width: blade.healthy }} />
      <span className="is-wear" style={{ width: blade.wear }} />
      <span className="is-in-use" style={{ width: blade.inUse }} />
      <span className="is-broken" style={{ width: blade.broken }} />
    </span>
  );

  return (
    <span className={`school-saber is-${size} repair-${status.kind}`}>
      <button
        className="school-saber-hilt"
        type="button"
        aria-label={label}
        title={label}
        aria-disabled={!canRepair}
        onClick={canRepair ? onRepair : undefined}
      >
        {/* Proportions approved by Andrea (04/10): cap pommel, spool emitter; drawn at 87.5 px in the 45 px bar. */}
        <svg viewBox="0 0 87.7 24" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={metal} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e3e9ee" />
              <stop offset=".45" stopColor="#7d8b97" />
              <stop offset="1" stopColor="#26313b" />
            </linearGradient>
            <linearGradient id={grip} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a5662" />
              <stop offset=".5" stopColor="#1c252e" />
              <stop offset="1" stopColor="#0d141a" />
            </linearGradient>
          </defs>
          <rect x="1" y="5" width="7" height="14" rx="2.2" fill={`url(#${metal})`} stroke="rgb(0 0 0 / 50%)" strokeWidth=".6" />
          <rect x="5.6" y="5" width=".7" height="14" fill="rgb(0 0 0 / 40%)" />
          <rect x="7.5" y="5" width="57" height="14" rx="1.5" fill={`url(#${grip})`} stroke="rgb(0 0 0 / 50%)" strokeWidth=".8" />
          {RIDGES.map((x) => (
            <g key={x} fill="rgb(0 0 0 / 55%)">
              <rect x={x} y="5" width="1.3" height="2" />
              <rect x={x} y="17" width="1.3" height="2" />
            </g>
          ))}
          <g transform="translate(69.5 0) scale(.743 1) translate(-69.5 0) translate(0 3) scale(1 .75)">
            <rect x="69.3" y="3.6" width="3.2" height="16.8" rx=".8" fill={`url(#${metal})`} stroke="rgb(0 0 0 / 50%)" strokeWidth=".7" />
            <rect x="71.2" y="3.6" width=".7" height="16.8" fill="rgb(0 0 0 / 40%)" />
            <path d="M72.4 4.6 Q81.3 9 90.2 2.2 H94 V21.8 H90.2 Q81.3 15 72.4 19.4 Z" fill={`url(#${metal})`} stroke="rgb(0 0 0 / 50%)" strokeWidth=".7" />
            <rect x="90.2" y="2.2" width="1" height="19.6" fill="rgb(0 0 0 / 35%)" />
          </g>
          {/* The ring sits on top of the emitter: no gap, no visible overlap. */}
          <rect className="school-saber-ring" x="64.5" y="3" width="5" height="18" rx="1.6" />
        </svg>
        <span className="school-saber-price">{price}</span>
      </button>
      {bladeButton ? (
        <button className="school-saber-blade-button" type="button" {...bladeButton}>
          {bladeBody}
        </button>
      ) : (
        bladeBody
      )}
    </span>
  );
}
