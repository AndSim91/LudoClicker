import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { SchoolSaber } from "../../components/equipment/SchoolSaber";
import { getFormDefinition } from "../../content/forms";
import { isSISTechnicianCourseUnlocked } from "../../content/upgrades";
import {
  getFullRepairCost,
  getNextCourseCost,
  getPlanSwordPrice,
  type AnnualForecast,
  type PlanItem,
  type PlanOutcome,
} from "../../game/annualPlanning";
import { getGameMonthName } from "../../game/calendar";
import { isDebtBlocked } from "../../game/debt";
import {
  getAvailableSwords,
  getEffectiveDamagedSwords,
  getReservedSwords,
} from "../../game/equipment";
import { getTeacherCourseCandidates, type QuickTrainingKind } from "../../game/quickTeacherTraining";
import type { AnnualPlan, FormId, GameState } from "../../game/types";
import { isOfficialSwordSupplierVisible } from "../../game/unlocks";
import { formatCurrency } from "../../shared/formatters";
import { FormCoverageMap } from "../people/FormPathMap";
import { getFormCoverageCounts } from "../people/instructorGroupPresentation";

export const SIS_LOGO = "/assets/sis-logo.webp";
const NO_ACTIVITY = new Map();
const MAX_SEATS = 10;

export interface PlanContext {
  state: GameState;
  plan: AnnualPlan;
  outcome: PlanOutcome;
  now: number;
  /** What the plan may still spend: Fondi left plus what may be borrowed. */
  headroom: number;
  canBorrow: boolean;
  capacity: number;
  forecast: AnnualForecast;
  /** Installment of the whole debt after the plan. */
  installment: number;
  onCourse: (formId: FormId, track: QuickTrainingKind, change: "add" | "remove" | "all" | "clear") => void;
  onRepair: (repair: boolean) => void;
  onSwords: (swords: number) => void;
  onClear: () => void;
}

const count = (value: number) => value.toLocaleString("it-IT");
const shortMonth = (month: number) => getGameMonthName(month).slice(0, 3);

/** Il conto dei candidati diventa al massimo 10 sagome; con tanti candidati ogni sagoma è un gruppo. */
function Seats({ planned, total }: { planned: number; total: number }) {
  const seats = Math.min(MAX_SEATS, total);
  const per = Math.ceil(total / Math.max(1, seats));
  return (
    <span className="annual-seats" title={per > 1 ? `ogni sagoma = ${per} candidati` : undefined} aria-hidden="true">
      {Array.from({ length: seats }, (_, index) => {
        const fill = Math.max(0, Math.min(1, (planned - index * per) / Math.min(per, total - index * per)));
        const seat = <svg viewBox="0 0 20 24"><circle cx="10" cy="7" r="4.2" /><path d="M2 23c.4-5.6 3.8-8.6 8-8.6s7.6 3 8 8.6z" /></svg>;
        return (
          <span key={index} className="annual-seat" style={{ "--fill": `${Math.round(fill * 100)}%` } as CSSProperties}>
            {seat}{seat}
          </span>
        );
      })}
    </span>
  );
}

/** Q1 con le sagome di Q3 (Andrea, 08/10): tutta la scheda iscrive un candidato; «−» e «Tutti» fanno altro. */
function CourseCard({ context, formId, track }: { context: PlanContext; formId: FormId; track: QuickTrainingKind }) {
  const { outcome, now, headroom, canBorrow, state } = context;
  const name = track === "technician" ? "Corso Tecnici" : "Corso Istruttori";
  const item = outcome.items.find((entry) => entry.key === `${track}:${formId}`);
  const planned = item?.count ?? 0;
  const remaining = getTeacherCourseCandidates(outcome.state, formId, track).length;
  const total = planned + remaining;
  const blocked = isDebtBlocked(state);
  const icon = track === "technician"
    ? <span className="annual-course-sis">SIS</span>
    : <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="6.5" r="3" /><path d="M4 17c.6-3.3 3-5 6-5s5.4 1.7 6 5" /></svg>;

  if (total === 0 || blocked) {
    return (
      <div className={`annual-course is-off${track === "technician" ? " is-technician" : ""}`}>
        <span className="annual-course-line">{icon}<span>{name}</span></span>
        <span className="annual-course-detail">
          <b className="is-off">Non disponibile</b> · {blocked ? "il debito è scaduto" : "nessun candidato per questa Forma"}
        </span>
      </div>
    );
  }
  const unit = remaining > 0 ? getNextCourseCost(outcome.state, formId, track, now) : undefined;
  const full = remaining === 0 || unit === undefined;
  const broke = !full && headroom + 0.005 < (unit ?? 0);
  const canAdd = !full && !broke;
  const add = () => { if (canAdd) context.onCourse(formId, track, "add"); };
  return (
    <div
      className={`annual-course${track === "technician" ? " is-technician" : ""}${canAdd ? " can-add" : ""}`}
      {...(canAdd ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `Iscrivi un candidato al ${name}`,
        onClick: add,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); add(); }
        },
      } : {})}
    >
      <span className="annual-course-line">
        {icon}<span>{name}</span>
        <span className="annual-course-count">{planned}<small> / {total}</small></span>
      </span>
      <span className="annual-course-detail">
        {full ? <><b>Partecipanti al massimo</b> · </> : broke ? <><b className="is-no">{canBorrow ? "Limite del debito" : "Fondi esauriti"}</b> · </> : null}
        <span className="annual-course-total">{formatCurrency(item?.cost ?? 0)}</span>
      </span>
      <span className="annual-course-row">
        <Seats planned={planned} total={total} />
        <button
          type="button"
          className="annual-course-minus"
          aria-label="Un partecipante in meno"
          disabled={planned === 0}
          onClick={(event) => { event.stopPropagation(); context.onCourse(formId, track, "remove"); }}
        >−</button>
        <button
          type="button"
          className="annual-course-all"
          disabled={!canAdd}
          onClick={(event) => { event.stopPropagation(); context.onCourse(formId, track, "all"); }}
        >Tutti</button>
      </span>
    </div>
  );
}

/**
 * Lo schema delle Forme non va mai a capo: se non ci sta, si rimpicciolisce (Andrea, 08/10).
 * A transform does not change the layout it measures, so measure and scale can
 * never chase each other (the CSS zoom of the first version did: crash 08/10, React #185).
 */
function FittedMap({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height?: number }>({ scale: 1 });
  useLayoutEffect(() => {
    const box = boxRef.current;
    const map = box?.firstElementChild as HTMLElement | null | undefined;
    if (!box || !map) return;
    const measure = () => {
      if (map.offsetWidth === 0) return;
      const scale = Math.min(1, box.clientWidth / map.offsetWidth);
      const height = Math.ceil(map.offsetHeight * scale);
      setFit((current) => Math.abs(current.scale - scale) > 0.005 || current.height !== height ? { scale, height } : current);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="annual-map-fit" style={{ height: fit.height }}>
      <div className="annual-map-scale" style={{ transform: `scale(${fit.scale})` }}>{children}</div>
    </div>
  );
}

function PlanCourses({ context, selected, onSelect }: {
  context: PlanContext;
  selected: FormId;
  onSelect: (formId: FormId) => void;
}) {
  const { state, outcome } = context;
  const technicians = isSISTechnicianCourseUnlocked(state.upgrades);
  const instructors = useMemo(
    () => outcome.state.collaborators.filter((collaborator) => collaborator.assignment === "instructor"),
    [outcome.state.collaborators],
  );
  const counts = useMemo(() => getFormCoverageCounts(instructors), [instructors]);
  if (!state.unlocks.forms) {
    return (
      <section className="annual-box" data-tutorial-region="planning-sis">
        <h3 className="annual-box-title">SIS · Scuola Internazionale Superiore</h3>
        <div className="annual-soon">
          <div>
            <img src={SIS_LOGO} alt="Logo della SIS" />
            <strong>Prossimamente</strong>
          </div>
        </div>
      </section>
    );
  }
  const now = counts.get(selected);
  const formName = getFormDefinition(selected)?.longName ?? selected;
  return (
    <section className="annual-box" data-tutorial-region="planning-sis">
      <div className="annual-sis">
        <img src={SIS_LOGO} alt="Logo della SIS" />
        <div>
          <b>SIS · Scuola Internazionale Superiore</b>
          <span>Qui i tuoi atleti diventano Istruttori e Tecnici. Partono alla conferma del piano.</span>
        </div>
      </div>
      <FittedMap>
        <FormCoverageMap
          counts={counts}
          activity={NO_ACTIVITY}
          showTechnicians={technicians}
          selected={selected}
          onSelect={onSelect}
        />
      </FittedMap>
      <div className="annual-form-detail">
        <span className="annual-form-name">
          {formName}
          <small>
            {now?.instructors ?? 0} {(now?.instructors ?? 0) === 1 ? "Istruttore" : "Istruttori"}
            {technicians ? ` · ${now?.technicians ?? 0} ${(now?.technicians ?? 0) === 1 ? "Tecnico" : "Tecnici"}` : ""}
          </small>
        </span>
        <div className={`annual-courses${technicians ? "" : " is-single"}`}>
          <CourseCard context={context} formId={selected} track="instructor" />
          {technicians ? <CourseCard context={context} formId={selected} track="technician" /> : null}
        </div>
      </div>
    </section>
  );
}

type Quantity = 1 | 10 | 100 | "max";

/** «Spade della Scuola»: la stessa scheda della finestra delle spade del gioco. */
function PlanSwords({ context }: { context: PlanContext }) {
  const { state, plan, outcome, headroom, canBorrow } = context;
  const [quantityIndex, setQuantityIndex] = useState(0);
  const equipment = state.equipment;
  const planned = outcome.state.equipment;
  const damaged = getEffectiveDamagedSwords(equipment);
  const needsRepair = damaged > 0 || equipment.wear > 0;
  const repairCost = getFullRepairCost(state);
  const repairAffordable = plan.repair || headroom + 0.005 >= repairCost;
  const free = getAvailableSwords(equipment);
  const price = getPlanSwordPrice(state);
  const blocked = isDebtBlocked(state);
  const maxSwords = Math.floor(Math.max(0, headroom) / price);
  const amounts: Quantity[] = ([1, 10, 100] as const).filter(
    (amount) => amount === 1 || canBorrow || headroom >= amount * price,
  );
  if (maxSwords > 1 && !amounts.includes(maxSwords as Quantity)) amounts.push("max");
  const quantity = amounts[quantityIndex % amounts.length];
  const amount = quantity === "max" ? maxSwords : quantity;
  const canBuy = !blocked && amount > 0 && headroom + 0.005 >= amount * price;
  const condition = damaged > 0 && !plan.repair
    ? `${count(damaged)} ${damaged === 1 ? "rotta" : "rotte"}`
    : equipment.wear > 0 && !plan.repair ? `${Math.round(equipment.wear)} pt di usura` : "In ordine";
  const hint = !needsRepair ? "" : plan.repair
    ? "Riparazione in programma"
    : repairAffordable ? "Premi l'elsa per riparare le spade" : "Riparazione non possibile - Fondi esauriti";

  return (
    <div className="title-equipment-popover annual-swords" data-tutorial-region="planning-swords">
    <section className={`equipment-quick-card is-${condition === "In ordine" ? "healthy" : damaged > 0 ? "critical" : "warning"}`} aria-label="Spade della Scuola">
      <div className="equipment-quick-heading">
        <h3>Spade della Scuola</h3>
        <b>{condition}</b>
      </div>
      <p className="equipment-quick-total">
        <strong>{count(free)}</strong>
        <span>
          libere su {count(equipment.totalSwords)}
          {plan.swords > 0 ? <> · <em className="annual-swords-arriving">+{count(plan.swords)} in arrivo</em></> : null}
        </span>
      </p>
      <SchoolSaber
        equipment={planned}
        euros={plan.repair || repairAffordable ? Math.max(headroom, repairCost) : 0}
        onRepair={() => context.onRepair(true)}
        size="large"
      />
      {hint ? (
        <p className={`equipment-repair-hint${!plan.repair && !repairAffordable ? " is-short" : ""}`}>{hint}</p>
      ) : null}
      <ul className="equipment-legend">
        <li className="is-healthy">Libere <strong>{count(getAvailableSwords(planned))}</strong></li>
        <li className="is-in-use">In uso <strong>{count(getReservedSwords(planned))}</strong></li>
        <li className="is-broken">Rotte <strong>{count(getEffectiveDamagedSwords(planned))}</strong></li>
        <li className="is-wear">Usura <strong>{Math.round(planned.wear)} pt</strong></li>
      </ul>
      <div className="equipment-quick-actions">
        {!isOfficialSwordSupplierVisible(state) ? (
          <p className="annual-swords-locked">
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
            Spade acquistabili solo dopo aver sbloccato «Fornitore ufficiale» negli Upgrade
          </p>
        ) : (
          <span className="equipment-purchase">
            <button
              className="equipment-purchase-button"
              type="button"
              disabled={!canBuy}
              title={blocked ? "Acquisto fermo finché il debito non è saldato" : `${formatCurrency(price)} l'una, al prezzo di oggi`}
              onClick={() => context.onSwords(plan.swords + amount)}
            >
              Acquista {amount === 1 ? "1 spada" : `${count(amount)} spade`} {"·"}{" "}
              <span className="equipment-purchase-price">{formatCurrency(amount * price)}</span>
            </button>
            <button
              className="equipment-purchase-quantity"
              type="button"
              disabled={amounts.length === 1}
              aria-label={`Quantità acquisto: ${quantity === "max" ? "massimo" : `×${quantity}`}. Premi per cambiare`}
              onClick={() => setQuantityIndex((index) => (index + 1) % amounts.length)}
            >
              {quantity === "max" ? "Max" : `×${quantity}`}
            </button>
          </span>
        )}
      </div>
    </section>
    </div>
  );
}

const ITEM_COLORS: Record<string, string> = {
  instructor: "var(--ap-ist)",
  technician: "var(--ap-tec)",
  repair: "#6ed38a",
  swords: "var(--ap-gold)",
};

function PlanFunds({ context }: { context: PlanContext }) {
  const { state, outcome, canBorrow, capacity } = context;
  const after = state.school.euros - outcome.cost;
  const undo = (item: PlanItem) => {
    if (item.kind === "repair") context.onRepair(false);
    else if (item.kind === "swords") context.onSwords(0);
    else if (item.formId && item.track) context.onCourse(item.formId, item.track, "clear");
  };
  return (
    <section className="annual-box" data-tutorial-region="planning-funds">
      <div className="annual-funds">
        <div><span>Fondi oggi</span><b>{formatCurrency(state.school.euros)}</b></div>
        <span className="arrow" aria-hidden="true">→</span>
        <div>
          <span>Dopo il piano</span>
          <b className={after < 0 ? "is-negative" : undefined}>{formatCurrency(after)}</b>
          {canBorrow ? <small>limite {formatCurrency(-capacity)}</small> : null}
        </div>
      </div>
      {outcome.items.length > 0 ? (
        <>
          <ul className="annual-items">
            {outcome.items.map((item) => (
              <li key={item.key} className="annual-item">
                <i style={{ background: ITEM_COLORS[item.track ?? item.kind] }} />
                <span>{item.label}</span>
                <span>{formatCurrency(item.cost)}</span>
                <button type="button" aria-label={`Togli ${item.label}`} onClick={() => undo(item)}>×</button>
              </li>
            ))}
          </ul>
          <div className="annual-items-foot">
            <span>Spese provvisorie ancora da confermare</span>
            <button type="button" onClick={context.onClear}>Annulla tutto</button>
          </div>
        </>
      ) : (
        <p className="annual-note">Nessuna spesa in programma.</p>
      )}
    </section>
  );
}

const axis = (value: number) => value >= 1_000 ? `${Math.round(value / 100) / 10}k` : `${Math.round(value)}`;

/** Barre verdi delle entrate previste; la rata del debito in rosso, dal basso (Andrea, 08/10). */
export function ForecastChart({ forecast, installment }: { forecast: AnnualForecast; installment: number }) {
  const [hover, setHover] = useState<number>();
  const plotRef = useRef<HTMLDivElement>(null);
  const W = 400, L = 6, R = 352, T = 10, B = 132, H = 150;
  const values = forecast.months.map((month) => month.income);
  const top = Math.max(1, ...values, installment, forecast.lastAverage) * 1.08;
  const y = (value: number) => B - (value / top) * (B - T);
  const step = (R - L) / 12;
  const width = step * 0.62;
  const hovered = hover === undefined ? undefined : forecast.months[hover];
  return (
    <div ref={plotRef} className="annual-plot" onMouseLeave={() => setHover(undefined)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Entrate previste mese per mese${installment > 0 ? ", in rosso la rata del debito" : ""}`}>
        {[0, 1, 2, 3].map((line) => {
          const value = (top * line) / 3;
          return (
            <g key={line}>
              <line className="grid" x1={L} x2={R} y1={y(value)} y2={y(value)} />
              <text className="axis" x={R + 6} y={y(value) + 3}>{axis(value)}</text>
            </g>
          );
        })}
        {forecast.months.map((month, index) => {
          const x = L + step * index + (step - width) / 2;
          return (
            <g key={month.month}>
              <rect className="bar-in" x={x} y={y(month.income)} width={width} height={B - y(month.income)} rx={2} />
              {installment > 0 ? <rect className="bar-debt" x={x} y={y(installment)} width={width} height={B - y(installment)} rx={2} /> : null}
              <text className="axis" x={x + width / 2} y={H - 3} textAnchor="middle">{shortMonth(month.month)}</text>
              <rect
                className="hit"
                x={L + step * index}
                y={T}
                width={step}
                height={B - T}
                tabIndex={0}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(undefined)}
              />
            </g>
          );
        })}
        {forecast.lastAverage > 0 ? <line className="average" x1={L} x2={R} y1={y(forecast.lastAverage)} y2={y(forecast.lastAverage)} /> : null}
      </svg>
      {hovered && hover !== undefined ? (
        <div className="annual-tip" style={{ left: `clamp(0px, calc(${((L + step * hover + step / 2) / W) * 100}% - 75px), calc(100% - 150px))` }}>
          <b>{getGameMonthName(hovered.month)} · previsto</b>
          <span><i className="k-in" />Entrate<em>{formatCurrency(hovered.income)}</em></span>
          {installment > 0 ? (
            <>
              <span><i className="k-debt" />Rata del debito<em>−{formatCurrency(installment)}</em></span>
              <span className="net">Restano<em className={hovered.income - installment < 0 ? "is-negative" : undefined}>{formatCurrency(hovered.income - installment)}</em></span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PlanMarket({ context }: { context: PlanContext }) {
  const { forecast, installment, state } = context;
  const nextYear = state.annual?.report ? state.annual.report.schoolYear + 1 : undefined;
  const change = Math.round(forecast.change * 100);
  return (
    <section className="annual-market" data-tutorial-region="planning-forecast">
      <span className="annual-market-symbol">GUADAGNI PREVISTI{nextYear !== undefined ? ` · ANNO ${nextYear}` : ""}</span>
      <div className="annual-market-total">
        {formatCurrency(forecast.total)}
        {forecast.lastAverage > 0 ? (
          <span className={`annual-market-change ${change >= 0 ? "is-up" : "is-down"}`}>
            {change >= 0 ? `▲ +${change}%` : `▼ ${change}%`}
          </span>
        ) : null}
      </div>
      <ForecastChart forecast={forecast} installment={installment} />
      <div className="annual-legend">
        <span><i className="k-in" />entrate</span>
        {installment > 0 ? <span><i className="k-debt" />rata del debito</span> : null}
        {forecast.lastAverage > 0 ? <span><i className="avg" />media anno scorso</span> : null}
      </div>
    </section>
  );
}

export function PlanPage({ context }: { context: PlanContext }) {
  // Si apre sulla prima Forma che qualcuno può prendere.
  const [selected, setSelected] = useState<FormId>(() =>
    (["form-1", "form-2", "course-y"] as FormId[]).find((formId) =>
      getTeacherCourseCandidates(context.state, formId, "instructor").length > 0) ?? "form-1");
  return (
    <div className="annual-plan">
      <div className="annual-column">
        <PlanCourses context={context} selected={selected} onSelect={setSelected} />
        <PlanSwords context={context} />
      </div>
      <div className="annual-column">
        <PlanFunds context={context} />
        <PlanMarket context={context} />
      </div>
    </div>
  );
}
