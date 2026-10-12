import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Icon } from "../../components/common/Icon";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  getUpgradeCategoryPoints,
  getUpgradeCost,
  getUpgradeDefinition,
  type UpgradeDefinition,
} from "../../content/upgrades";
import type { GameState, UpgradeId } from "../../game/types";
import { findCheapestPurchase, planBuyAllUpgrades } from "../../game/upgradeFlow";
import { formatCurrency } from "../../shared/formatters";
import {
  UpgradeDetailsDialog,
  isUpgradeCategoryVisible,
  isUpgradeHidden,
} from "../upgrades/UpgradesView";

const LANE_COLUMNS = 9;
const nodeY = (index: number) => (index % 2 === 0 ? 8 : 22);

/** The wave of a lane, segment by segment: lit up to the node after the last completed one, dashed past the visible ones. */
function LaneWave({ count, litTo, visibleTo, columns }: { count: number; litTo: number; visibleTo: number; columns: number }) {
  const segments = [];
  for (let index = 1; index < count; index += 1) {
    const x0 = (index - 1) * 100 + 50;
    const x1 = index * 100 + 50;
    const state = index <= litTo ? "lit" : index <= visibleTo ? "on" : "off";
    segments.push(
      <path
        key={index}
        className={`annual-up-wave is-${state}`}
        d={`M${x0},${nodeY(index - 1)} C${x0 + 50},${nodeY(index - 1)} ${x1 - 50},${nodeY(index)} ${x1},${nodeY(index)}`}
      />,
    );
  }
  return (
    <svg className="annual-up-waves" viewBox={`0 0 ${columns * 100} 30`} preserveAspectRatio="none" aria-hidden="true">
      {segments}
    </svg>
  );
}

/**
 * Upgrade nella Pianificazione (Andrea, 12/10, concept L2 + M1): the lanes of the
 * Upgrade page in small. The nodes «Compra tutto» would take carry their place in
 * the queue, the next one pulses; nodes bought in the plan turn gold. Paid with
 * the Fondi left after the rest of the plan, never with the debt.
 */
export function PlanUpgrades({
  base,
  view,
  onAdd,
}: {
  /** Levels before the plan. */
  base: GameState["upgrades"];
  /** The game after the plan, with the Fondi still free for upgrades. */
  view: GameState;
  onAdd: (upgradeIds: UpgradeId[]) => void;
}) {
  const [selection, setSelection] = useState<{ upgradeId: UpgradeId; anchor: HTMLButtonElement }>();
  const room = view.school.euros;
  const queue = useMemo(() => planBuyAllUpgrades(view), [view]);
  const next = useMemo(() => findCheapestPurchase(view), [view]);
  const rank = useMemo(() => {
    const places = new Map<UpgradeId, number>();
    queue.purchases.forEach((upgradeId, index) => { if (!places.has(upgradeId)) places.set(upgradeId, index + 1); });
    return places;
  }, [queue]);
  const selected = selection ? getUpgradeDefinition(selection.upgradeId) : undefined;
  const count = queue.purchases.length;

  const node = (definition: UpgradeDefinition, index: number) => {
    const style = { gridColumn: index + 1, "--node-y": `${nodeY(index)}px` } as CSSProperties;
    if (isUpgradeHidden(view, definition)) {
      return <span key={definition.id} className="annual-up-node is-hidden" style={style} aria-label="Da scoprire">?</span>;
    }
    const level = view.upgrades[definition.id];
    const planned = level - base[definition.id];
    const done = level >= definition.maxLevel;
    const cost = getUpgradeCost(definition, level, view.upgrades);
    const status = planned > 0 ? "planned" : done ? "done" : cost <= room ? "open" : "short";
    const place = rank.get(definition.id);
    return (
      <button
        key={definition.id}
        type="button"
        className={`annual-up-node is-${status}${place === 1 ? " is-next" : ""}${index % 2 ? " is-low" : ""}`}
        style={style}
        title={`${definition.title} · ${level}/${definition.maxLevel}${done ? "" : ` · ${formatCurrency(cost)}`}${planned > 0 ? ` · +${planned} nel piano` : ""}`}
        aria-label={`${definition.title}, livello ${level} di ${definition.maxLevel}`}
        onClick={(event) => {
          const anchor = event.currentTarget;
          setSelection((current) => current?.upgradeId === definition.id ? undefined : { upgradeId: definition.id, anchor });
        }}
      >
        {done && planned === 0 ? <Icon name="check" /> : null}
        {place ? <i className="annual-up-rank" aria-hidden="true">{place}</i> : null}
        {done ? null : <small aria-hidden="true">{level}/{definition.maxLevel}</small>}
      </button>
    );
  };

  return (
    <>
      <div className="annual-up-head">
        <span className="annual-up-icon" aria-hidden="true"><Icon name="spark" /></span>
        <div>
          <b>Upgrade</b>
          <small>Si pagano alla conferma del piano, con i Fondi rimasti</small>
        </div>
      </div>
      <div className="annual-up-body">
      <div className="annual-up-lanes">
        {UPGRADE_CATEGORIES.filter((category) => category.id !== "secrets" && isUpgradeCategoryVisible(view, category.id)).map((category) => {
          const definitions = UPGRADE_DEFINITIONS.filter((definition) => definition.category === category.id && !definition.hidden);
          const columns = Math.max(LANE_COLUMNS, definitions.length);
          const lastDone = definitions.reduce((last, definition, index) => view.upgrades[definition.id] >= definition.maxLevel ? index : last, -1);
          const visibleTo = definitions.reduce((last, definition, index) => isUpgradeHidden(view, definition) ? last : index, 0);
          return (
            <div key={category.id} className="annual-up-lane">
              <span className="annual-up-name">
                {category.title}
                {category.id === "network" ? null : <small>{getUpgradeCategoryPoints(view.upgrades, category.id)}</small>}
              </span>
              <div className="annual-up-track" style={{ "--lane-columns": columns } as CSSProperties}>
                <LaneWave count={definitions.length} litTo={lastDone < 0 ? 0 : Math.min(lastDone + 1, visibleTo)} visibleTo={visibleTo} columns={columns} />
                <div className="annual-up-nodes">{definitions.map(node)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="annual-up-side">
      <div className="annual-up-actions">
        <button type="button" disabled={!next || next.cost > room} onClick={() => next && onAdd([next.id])}>
          Compra il prossimo
          <small>{next ? `${getUpgradeDefinition(next.id)?.title ?? next.id} · ${formatCurrency(next.cost)}` : "Nessun upgrade da comprare"}</small>
        </button>
        <button type="button" disabled={count === 0} onClick={() => onAdd(queue.purchases)}>
          Compra tutto{count > 0 ? ` · ${count} ${count === 1 ? "livello" : "livelli"}` : ""}
          <small>{count > 0 ? `${formatCurrency(queue.total)} · restano ${formatCurrency(room - queue.total)}` : "Niente alla portata dei Fondi"}</small>
        </button>
      </div>
      <span className="annual-up-legend" aria-hidden="true">
        <span><i className="is-done" />Completati</span>
        <span><i className="is-open" />Da comprare</span>
        <span><i className="is-planned" />Nel piano</span>
        <span><i className="is-rank">1</i>Ordine di «Compra tutto»</span>
      </span>
      </div>
      </div>
      {selected && selection
        ? createPortal(
          <UpgradeDetailsDialog
            definition={selected}
            state={view}
            anchor={selection.anchor}
            onClose={() => setSelection(undefined)}
            onBuy={() => onAdd([selected.id])}
          />,
          document.body,
        )
        : null}
    </>
  );
}
