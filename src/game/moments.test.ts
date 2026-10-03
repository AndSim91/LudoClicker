import { GAME_CONFIG } from "./config";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import { createInitialState, gameReducer } from "./engine";
import { getReachedMomentKeys, queueMoments } from "./moments";
import { migrate } from "./saveMigrations";
import { foundSchool } from "./schoolProgressionFlow";
import type { GameState } from "./types";

const details = { name: "Ordine del Faro", city: "Trieste", accentColor: "#7652b3", motto: "", specialization: "redazione" as const };

function withCareer(state: GameState, career: Partial<NonNullable<GameState["statistics"]["career"]>>): GameState {
  return { ...state, statistics: { ...state.statistics, career: { ...state.statistics.career!, ...career } } };
}

describe("moments (4.2)", () => {
  it("queues each moment once per save and dismisses them in order", () => {
    const initial = withCareer(createInitialState(1_000), { nationalTitles: 1, reptileWins: 2 });
    const queued = queueMoments(initial);
    expect(queued.moments.queue).toEqual(["victory:national", "victory:reptile"]);
    expect(queueMoments(queued)).toBe(queued);

    const dismissed = gameReducer(queued, { type: "DISMISS_MOMENT" });
    expect(dismissed.moments.queue).toEqual(["victory:reptile"]);
    const empty = gameReducer(dismissed, { type: "DISMISS_MOMENT" });
    expect(empty.moments).toEqual({ seen: ["victory:national", "victory:reptile"], queue: [] });
    // A second win never replays the scene.
    expect(queueMoments(withCareer(empty, { nationalTitles: 2 })).moments.queue).toEqual([]);
  });

  it("plays the foundation once and keeps what was seen in the new school", () => {
    const base = addAdminMembers(createInitialState(1_000), 125);
    const ready: GameState = {
      ...base,
      school: { ...base.school, fame: 10_000 },
      tournaments: { ...base.tournaments, nationalTitlesCurrentSchool: 1 },
      moments: { seen: [...getReachedMomentKeys(base), "victory:national"], queue: [] },
    };
    const founded = gameReducer(ready, { type: "FOUND_SCHOOL", details, now: 2_000, spending: { upgrades: {}, rent: 0 } });
    expect(founded.moments.queue).toEqual(["foundation"]);
    expect(founded.moments.seen).toContain("victory:national");
    expect(foundSchool(ready, details, 2_000, { upgrades: {}, rent: 0 }).moments).toEqual(ready.moments);
  });

  it("marks what an old save already reached as seen (v88)", () => {
    const initial = createInitialState(1_000);
    const saved = {
      ...initial,
      version: 87,
      moments: undefined,
      statistics: { ...initial.statistics, career: { ...initial.statistics.career!, championsWins: 1 } },
      legendaryCollaborators: { ...initial.legendaryCollaborators, enrolledProfileIds: ["eva-parodi"] },
    };
    const migrated = migrate(saved) as GameState;
    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.moments).toEqual({ seen: ["victory:champions", "legendary:eva-parodi"], queue: [] });
    expect(migrated.legendaryCollaborators.enrollmentCounts).toEqual({ "eva-parodi": 1 });
  });
});
