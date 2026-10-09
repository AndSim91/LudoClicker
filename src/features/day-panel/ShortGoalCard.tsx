import { memo, useEffect, useState } from "react";
import {
  SHORT_GOALS,
  createShortGoalFromStatistics,
  getShortGoalProgress,
  getShortGoalReward,
  getShortGoalSeries,
  isShortGoalActive,
} from "../../content/shortGoals";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState, ShortGoalProgress } from "../../game/types";
import { ProgressBar } from "../../components/common/ProgressBar";

/** How long the completed mission stays on screen before the next one arrives (concept C «Scintille»). */
export const SHORT_GOAL_DONE_MS = 2_000;
const SPARKS = 8;

export const ShortGoalCard = memo(function ShortGoalCard({
  state: stateOverride,
}: {
  state?: GameState;
}) {
  const state = useGameStateSlices(["shortGoal", "statistics"], stateOverride);
  const count = state.shortGoal.completedCount;
  // The game swaps in the next mission the moment one is completed: show the one
  // just finished for the effect. It is rebuilt from the count (missions follow a
  // fixed order), and mounting (e.g. reopening the day panel) never replays it.
  const [seenCount, setSeenCount] = useState(count);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  if (count !== seenCount) {
    setSeenCount(count);
    setDoneCount(count > seenCount ? count - 1 : null);
  }

  useEffect(() => {
    if (doneCount === null) return;
    const timer = window.setTimeout(() => setDoneCount(null), SHORT_GOAL_DONE_MS);
    return () => window.clearTimeout(timer);
  }, [doneCount]);

  if (doneCount !== null) {
    const finished = createShortGoalFromStatistics(state.statistics, doneCount, 0);
    return (
      <section className="short-goal-card is-done" aria-label="Obiettivo breve" aria-live="polite">
        <ShortGoalBody goal={finished} progress={finished.target} done />
      </section>
    );
  }
  if (!isShortGoalActive(state)) return null;
  return (
    <section
      // A new key per mission restarts the arrival animation after every completion.
      key={count}
      className={count > 0 ? "short-goal-card is-arriving" : "short-goal-card"}
      aria-label="Obiettivo breve"
    >
      <ShortGoalBody
        goal={state.shortGoal}
        progress={Math.min(state.shortGoal.target, getShortGoalProgress(state))}
      />
    </section>
  );
});

function ShortGoalBody({
  goal,
  progress,
  done = false,
}: {
  goal: ShortGoalProgress;
  progress: number;
  done?: boolean;
}) {
  const { title, description } = SHORT_GOALS[goal.definitionId];
  const reward = getShortGoalReward(goal);
  return (
    <>
      <div className="short-goal-heading">
        <span>Missioni delle Onde</span>
        <b>Serie {getShortGoalSeries(goal.completedCount)}</b>
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      <div className="short-goal-track">
        <ProgressBar
          className="short-goal-progress"
          label={`Progresso: ${title}`}
          value={progress}
          max={goal.target}
        />
        {done ? (
          <span className="short-goal-sparks" aria-hidden="true">
            {Array.from({ length: SPARKS }, (_, index) => <i key={index} />)}
          </span>
        ) : null}
      </div>
      <div className="short-goal-footer">
        <span className={done ? "short-goal-done-count" : undefined}>
          {done ? "Compiuta!" : `${progress}/${goal.target}`}
        </span>
        <strong>Premio € {reward}</strong>
      </div>
      {done ? (
        <div className="short-goal-done-note">✓ Missione compiuta</div>
      ) : null}
    </>
  );
}
