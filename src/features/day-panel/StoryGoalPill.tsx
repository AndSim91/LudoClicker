import { Icon } from "../../components/common/Icon";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import {
  getStoryGoalLabel,
  getStoryGoalTip,
  isStoryGoalReady,
  selectStoryGoal,
  type StoryGoal,
} from "./storyGoal";

const SLICES = [
  "contacts",
  "collaborators",
  "collaboratorManagement",
  "school",
  "tournaments",
  "unlocks",
  "tutorial",
] as const;
const COUNTDOWN_INTERVAL_MS = 1_000;

function useStoryGoal(state?: GameState, now?: number): StoryGoal | null {
  const sliced = useGameStateSlices(SLICES, state);
  // The clock ticks only for the countdown to the Scolastico.
  const countingDown = sliced.unlocks.tournaments &&
    !sliced.tournaments.results.some((result) => result.level === "school");
  const liveNow = useGameTime(now === undefined && countingDown, COUNTDOWN_INTERVAL_MS);
  return selectStoryGoal(sliced, now ?? liveNow);
}

function GoalTip({ goal }: { goal: StoryGoal }) {
  const tip = getStoryGoalTip(goal);
  return (
    <span className="school-goal-tip" role="tooltip">
      <strong>{tip.title}</strong>
      {tip.text}
    </span>
  );
}

function GoalLabel({ goal }: { goal: StoryGoal }) {
  return (
    <>
      <Icon name={goal.kind === "collaborators" ? "people" : "trophy"} />
      {getStoryGoalLabel(goal)}
    </>
  );
}

function className(base: string, goal: StoryGoal): string {
  return isStoryGoalReady(goal) ? `${base} is-ready` : base;
}

/** C «Linguetta» (08/10): in the heading of «La mia giornata»; the tip on hover, or on tap (focus). */
export function StoryGoalPill({ state, now }: { state?: GameState; now?: number }) {
  const goal = useStoryGoal(state, now);
  if (!goal) return null;
  const tip = getStoryGoalTip(goal);
  return (
    <button className={className("school-goal-pill", goal)} type="button" aria-label={`${tip.title}: ${tip.text}`}>
      <GoalLabel goal={goal} />
      <GoalTip goal={goal} />
    </button>
  );
}

/**
 * N3 (08/10): the second half of the «Giornata» switch when the column is closed.
 * The tip only on hover; a tap is a tap on the switch and opens the column.
 */
export function StoryGoalCount() {
  const goal = useStoryGoal();
  if (!goal) return null;
  return (
    <span className={className("school-goal-count", goal)}>
      <GoalLabel goal={goal} />
      <GoalTip goal={goal} />
    </span>
  );
}
