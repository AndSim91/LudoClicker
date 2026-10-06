import { ProgressBar } from "../../components/common/ProgressBar";
import { formatCompactNumber } from "../../components/outlook-shell/resourceFormatting";
import { GADGET_DEFINITIONS, GADGET_PRODUCT_ORDER } from "../../content/gadgets";
import { getMonthlySocialIncome, getSocialEventPromotionBonus } from "../../game/social";
import type { CollaboratorMasteryRole, GameState } from "../../game/types";
import { formatCurrency, formatPercent } from "../../shared/formatters";
import type { CollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { SectorScene } from "./SectorScene";

const MAX_EVENT_ROWS = 2;

function SceneRow({ row }: { row: CollaboratorAutomationPresentation }) {
  return (
    <div className={`sector-scene-row${row.inactive ? " is-inactive" : ""}`}>
      <span>
        <strong title={row.title}>{row.title}</strong>
        {row.progress !== undefined
          ? <small>{Math.round(row.progress)}%</small>
          : row.detail ? <small>{row.detail}</small> : null}
      </span>
      {row.progress !== undefined ? (
        <ProgressBar
          label={row.progressLabel ?? row.title}
          value={row.progress}
          durationMs={row.durationMs}
        />
      ) : null}
    </div>
  );
}

function SceneFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="sector-scene-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getRunningEventRows(state: GameState, now: number): CollaboratorAutomationPresentation[] {
  return state.acquisitionEvents
    .filter((event) => event.status === "running" && event.collaboratorId)
    .sort((a, b) => a.resolvesAt - b.resolvesAt)
    .slice(0, MAX_EVENT_ROWS)
    .map((event) => {
      const duration = event.resolvesAt - event.startedAt;
      return {
        title: `${event.title} · ${event.location}`,
        progress: duration <= 0 ? 100 : Math.min(100, Math.max(0, (now - event.startedAt) / duration * 100)),
        progressLabel: event.title,
        durationMs: duration,
      };
    });
}

function getMonthlyGadgetSales(state: GameState) {
  const { monthlyRevenue } = state.gadgets;
  const current = monthlyRevenue.month === state.school.currentMonth;
  const total = current
    ? GADGET_PRODUCT_ORDER.reduce((sum, productId) => sum + monthlyRevenue.totals[productId], 0)
    : 0;
  const leader = current && total > 0
    ? [...GADGET_PRODUCT_ORDER].sort((a, b) => monthlyRevenue.totals[b] - monthlyRevenue.totals[a])[0]
    : undefined;
  return { total, leader: leader ? { name: GADGET_DEFINITIONS[leader].name, revenue: monthlyRevenue.totals[leader] } : undefined };
}

/**
 * The body of a sector card in Modalità Onde: the animated scene, then the
 * work in progress as one or two bars. Same height for every sector.
 */
export function OndeSectorBody({
  state,
  role,
  idle,
  activity,
  socialActivities,
  now,
}: {
  state: GameState;
  role: CollaboratorMasteryRole;
  idle: boolean;
  activity: CollaboratorAutomationPresentation;
  socialActivities?: CollaboratorAutomationPresentation[];
  now: number;
}) {
  if (role === "writing") {
    return (
      <>
        <SectorScene role={role} idle={idle}>
          {state.unlocks.social ? (
            <>
              <span className="sector-scene-chip is-top-left">{formatCompactNumber(state.school.followers ?? 0)} follower</span>
              <span className="sector-scene-chip is-top-right">{formatCurrency(getMonthlySocialIncome(state))}/mese</span>
              <span className="sector-scene-chip is-top-right is-second is-teal">
                +{formatPercent(getSocialEventPromotionBonus(state.school.followers ?? 0))} Eventi
              </span>
            </>
          ) : null}
        </SectorScene>
        <div className="sector-scene-data">
          {(socialActivities ?? [activity]).map((row) => <SceneRow key={row.title} row={row} />)}
        </div>
      </>
    );
  }

  if (role === "events") {
    const rows = getRunningEventRows(state, now);
    return (
      <>
        <SectorScene role={role} idle={idle} />
        <div className="sector-scene-data">
          {(rows.length > 0 ? rows : [activity]).map((row) => <SceneRow key={row.title} row={row} />)}
        </div>
      </>
    );
  }

  if (role === "gadget") {
    const sales = getMonthlyGadgetSales(state);
    return (
      <>
        <SectorScene role={role} idle={idle}>
          <span className="sector-scene-chip is-top-right">{formatCurrency(sales.total)}/mese</span>
        </SectorScene>
        <div className="sector-scene-data">
          <SceneRow row={activity} />
          {sales.leader
            ? <SceneFact label="Più venduto del mese" value={`${sales.leader.name} · ${formatCurrency(sales.leader.revenue)}`} />
            : null}
        </div>
      </>
    );
  }

  return (
    <>
      <SectorScene role={role} idle={idle} />
      <div className="sector-scene-data">
        <SceneRow row={activity} />
        {role === "equipment"
          ? <SceneFact label="Usura attrezzatura" value={`${Math.round(state.equipment.wear)}/100`} />
          : null}
      </div>
    </>
  );
}
