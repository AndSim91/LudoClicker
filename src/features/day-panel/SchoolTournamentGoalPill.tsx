import { Icon } from "../../components/common/Icon";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import {
  getSchoolTournamentGoalText,
  selectSchoolTournamentGoal,
  type SchoolTournamentGoal,
} from "./schoolTournamentGoal";

const SLICES = ["contacts", "collaborators", "tournaments", "unlocks", "tutorial"] as const;

function useSchoolTournamentGoal(state?: GameState): SchoolTournamentGoal | null {
  return selectSchoolTournamentGoal(useGameStateSlices(SLICES, state));
}

function GoalTip({ goal }: { goal: SchoolTournamentGoal }) {
  return (
    <span className="school-goal-tip" role="tooltip">
      <strong>Ander Games</strong>
      {getSchoolTournamentGoalText(goal)}
    </span>
  );
}

/** C «Linguetta» (08/10): in the heading of «La mia giornata»; the tip on hover, or on tap (focus). */
export function SchoolTournamentGoalPill({ state }: { state?: GameState }) {
  const goal = useSchoolTournamentGoal(state);
  if (!goal) return null;
  return (
    <button
      className={goal.athletes >= goal.target ? "school-goal-pill is-ready" : "school-goal-pill"}
      type="button"
      aria-label={`Ander Games: ${getSchoolTournamentGoalText(goal)}`}
    >
      <Icon name="trophy" />
      {goal.athletes}/{goal.target}
      <GoalTip goal={goal} />
    </button>
  );
}

/**
 * N3 (08/10): the second half of the «Giornata» switch when the column is closed.
 * The tip only on hover; a tap is a tap on the switch and opens the column.
 */
export function SchoolTournamentGoalCount() {
  const goal = useSchoolTournamentGoal();
  if (!goal) return null;
  return (
    <span className={goal.athletes >= goal.target ? "school-goal-count is-ready" : "school-goal-count"}>
      <Icon name="trophy" />
      {goal.athletes}/{goal.target}
      <GoalTip goal={goal} />
    </span>
  );
}
