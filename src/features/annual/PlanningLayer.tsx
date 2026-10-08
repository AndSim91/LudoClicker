import { useCallback, useMemo, useState } from "react";

import {
  EMPTY_ANNUAL_PLAN,
  getAnnualForecast,
  getDebtCapacity,
  simulateAnnualPlan,
} from "../../game/annualPlanning";
import { getCashAdvanceRate, getDebtTotal, isDebtBlocked } from "../../game/debt";
import type { QuickTrainingKind } from "../../game/quickTeacherTraining";
import type { AnnualPlan, FormId, GameState } from "../../game/types";
import { AnnualWindow } from "./AnnualWindow";
import { describeSchoolYear } from "./annualLabels";
import { PagellaPage } from "./PagellaPage";
import { PlanPage, type PlanContext } from "./PlanPage";

function withCourse(plan: AnnualPlan, formId: FormId, track: QuickTrainingKind, count: number): AnnualPlan {
  const others = plan.courses.filter((course) => course.formId !== formId || course.track !== track);
  return { ...plan, courses: count > 0 ? [...others, { formId, track, count }] : others };
}

/**
 * Pianificazione delle Onde (Andrea, 08/10): at the start of July the game
 * stops on the pagella of the year and on the plan for the next one. Nothing
 * is spent until «Conferma il piano». The Consigli page (A.N.D.E.R. and
 * M.A.K.I.) comes later: Andrea is still working on it.
 */
export function PlanningLayer({
  state,
  now,
  onConfirm,
  page,
  planningToggle,
}: {
  state: GameState;
  now: number;
  onConfirm: (plan: AnnualPlan) => void;
  /** Shown by the tutorial while its step is on screen. */
  page?: "pagella" | "plan";
  planningToggle?: { enabled: boolean; onChange: (enabled: boolean) => void };
}) {
  const [plan, setPlan] = useState<AnnualPlan>(EMPTY_ANNUAL_PLAN);
  const report = state.annual?.report;
  const forecast = useMemo(() => getAnnualForecast(state), [state]);
  const capacity = useMemo(() => getDebtCapacity(state, forecast.total), [state, forecast.total]);
  const outcome = useMemo(() => simulateAnnualPlan(state, plan, now), [state, plan, now]);
  const budget = Math.max(0, state.school.euros) + capacity;
  const headroom = budget - outcome.cost;
  const rate = getCashAdvanceRate(state.upgrades);
  const borrowed = Math.max(0, outcome.cost - Math.max(0, state.school.euros));
  const installment = (getDebtTotal(state) + borrowed * (1 + (rate ?? 0))) / 12;

  const changeCourse = useCallback((formId: FormId, track: QuickTrainingKind, change: "add" | "remove" | "all" | "clear") => {
    setPlan((current) => {
      const started = simulateAnnualPlan(state, current, now).items
        .find((item) => item.key === `${track}:${formId}`)?.count ?? 0;
      if (change === "clear") return withCourse(current, formId, track, 0);
      if (change === "remove") return withCourse(current, formId, track, started - 1);
      if (change === "add") return withCourse(current, formId, track, started + 1);
      // «Tutti»: one more each time, while candidates and Fondi (or the debt limit) allow.
      let next = withCourse(current, formId, track, started);
      for (let planned = started + 1; planned <= 1_000; planned += 1) {
        const candidate = withCourse(next, formId, track, planned);
        const simulated = simulateAnnualPlan(state, candidate, now);
        const reached = simulated.items.find((item) => item.key === `${track}:${formId}`)?.count ?? 0;
        if (reached < planned || simulated.cost > budget + 0.005) break;
        next = candidate;
      }
      return next;
    });
  }, [budget, now, state]);

  const context: PlanContext = {
    state,
    plan,
    outcome,
    now,
    headroom,
    canBorrow: rate !== undefined && !isDebtBlocked(state),
    capacity,
    forecast,
    installment: installment > 0.005 ? installment : 0,
    onCourse: changeCourse,
    onRepair: (repair) => setPlan((current) => ({ ...current, repair })),
    onSwords: (swords) => setPlan((current) => ({ ...current, swords: Math.max(0, swords) })),
    onClear: () => setPlan(EMPTY_ANNUAL_PLAN),
  };

  return (
    <AnnualWindow
      title="Pianificazione delle Onde"
      subtitle={report ? `Pagella ${describeSchoolYear(report)} · prima del nuovo anno scolastico` : "Prima del nuovo anno scolastico"}
      pages={[
        ...(report ? [{ title: "Pagella", render: () => <PagellaPage report={report} /> }] : []),
        { title: "Pianificazione", render: () => <PlanPage context={context} /> },
      ]}
      forcedPage={page === undefined ? undefined : page === "plan" && report ? 1 : 0}
      planningToggle={planningToggle}
      finalLabel="Conferma il piano"
      finalDisabled={headroom < -0.005}
      onFinal={() => onConfirm(plan)}
    />
  );
}
