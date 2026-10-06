import { GAME_CONFIG } from "./config";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import { createInitialState, gameReducer } from "./engine";
import { getReachedMomentKeys, queueMoments } from "./moments";
import { migrate } from "./saveMigrations";
import { foundSchool } from "./schoolProgressionFlow";
import type { GameState } from "./types";

const details = { name: "Ordine del Faro", city: "Trieste", motto: "", specialization: "redazione" as const };

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

  it("opens the Chronicles door at the first key of the playthrough only (05/10)", () => {
    const initial = withCareer(createInitialState(1_000), { championsWins: 1 });
    const keyed: GameState = {
      ...initial,
      tournaments: { ...initial.tournaments, chronicles: { unlocked: true, keys: 1 } },
    };
    const queued = queueMoments(keyed);
    expect(queued.moments.queue).toEqual(["victory:champions", "chronicles-key"]);
    // A new school starts locked; the key earned there finds the scene already seen.
    const nextSchool = queueMoments({
      ...queued,
      moments: { ...queued.moments, queue: [] },
      tournaments: { ...queued.tournaments, chronicles: { unlocked: false, keys: 0 } },
    });
    const keyedAgain = queueMoments({
      ...nextSchool,
      tournaments: { ...nextSchool.tournaments, chronicles: { unlocked: true, keys: 1 } },
    });
    expect(keyedAgain.moments.queue).toEqual([]);
  });

  it("plays the foundation at every new school and keeps what was seen", () => {
    const base = addAdminMembers(createInitialState(1_000), 125);
    const ready: GameState = {
      ...base,
      school: { ...base.school, fame: 10_000 },
      tournaments: { ...base.tournaments, nationalTitlesCurrentSchool: 1 },
      moments: { seen: [...getReachedMomentKeys(base), "victory:national", "council"], queue: [] },
    };
    const found = (state: GameState, now: number) =>
      gameReducer(state, { type: "FOUND_SCHOOL", details, now, spending: { upgrades: {}, rent: 0 } });
    const founded = found(ready, 2_000);
    expect(founded.moments.queue).toEqual(["foundation"]);
    expect(founded.moments.seen).toContain("victory:national");
    expect(founded.moments.seen).not.toContain("foundation");
    expect(foundSchool(ready, details, 2_000, { upgrades: {}, rent: 0 }).moments.queue).toEqual(["foundation"]);

    const again = found({
      ...gameReducer(founded, { type: "DISMISS_MOMENT" }),
      school: { ...founded.school, fame: 10_000 },
      tournaments: { ...founded.tournaments, nationalTitlesCurrentSchool: 1 },
    }, 3_000);
    expect(again.network.schoolCount).toBe(2);
    expect(again.moments.queue).toEqual(["foundation"]);
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

  it("plays the Consiglio when the sector view unlocks, not at the first collaborator", () => {
    const initial = createInitialState(1_000);
    expect(queueMoments({ ...initial, collaborators: [{} as GameState["collaborators"][number]] }).moments.queue)
      .toEqual([]);
    const council: GameState = {
      ...initial,
      collaboratorManagement: { ...initial.collaboratorManagement, aggregateViewUnlocked: true },
    };
    expect(queueMoments(council).moments.queue).toEqual(["council"]);
  });

  it("lets an old save see the Consiglio again if it saw it before the sector view (v93)", () => {
    const initial = createInitialState(1_000);
    const early = { ...initial, version: 92, moments: { seen: ["council", "victory:national"], queue: ["council"] } };
    expect((migrate(early) as GameState).moments).toEqual({ seen: ["victory:national"], queue: [] });
    const formed = {
      ...early,
      collaboratorManagement: { ...initial.collaboratorManagement, aggregateViewUnlocked: true },
    };
    expect((migrate(formed) as GameState).moments.seen).toContain("council");
  });

  it("plays the birth of the Superba once, after the Reptile victory scene", () => {
    const initial = withCareer(createInitialState(1_000), { reptileWins: 1 });
    const superba: GameState = { ...initial, network: { ...initial.network, superbaTournament: true } };
    const queued = queueMoments(superba);
    expect(queued.moments.queue).toEqual(["victory:reptile", "superba"]);
    expect(queueMoments(queued)).toBe(queued);
  });

  it("marks the Superba as seen for saves that already have it (v95)", () => {
    const initial = createInitialState(1_000);
    const saved = { ...initial, version: 94, network: { ...initial.network, superbaTournament: true } };
    expect((migrate(saved) as GameState).moments).toEqual({ seen: ["superba"], queue: [] });
    expect(queueMoments(migrate(saved) as GameState).moments.queue).toEqual([]);
    expect((migrate({ ...initial, version: 94 }) as GameState).moments.seen).not.toContain("superba");
  });

  it("plays the Laboratorio Gadget right after the Champion's Arena and the Social on its own (06/10)", () => {
    const initial = withCareer(createInitialState(1_000), { championsWins: 1 });
    const gadget = queueMoments({ ...initial, unlocks: { ...initial.unlocks, gadget: true } });
    expect(gadget.moments.queue).toEqual(["victory:champions", "gadget"]);
    const social = queueMoments({ ...gadget, unlocks: { ...gadget.unlocks, social: true } });
    expect(social.moments.queue).toEqual(["victory:champions", "gadget", "social"]);
    expect(queueMoments(social)).toBe(social);
  });

  it("marks Social and Gadget as seen for saves past them (v103)", () => {
    const initial = createInitialState(1_000);
    const opened = { ...initial, version: 102, unlocks: { ...initial.unlocks, social: true } };
    expect((migrate(opened) as GameState).moments.seen).toEqual(["social"]);
    // Gadget seen in an earlier school: the tutorial is done, the sector is locked again.
    const laterSchool = {
      ...initial,
      version: 102,
      tutorial: { ...initial.tutorial, completedSceneIds: ["gadget-laboratory"] },
    };
    expect((migrate(laterSchool) as GameState).moments.seen).toEqual(["gadget"]);
    expect((migrate({ ...initial, version: 102 }) as GameState).moments.seen).toEqual([]);
  });
});
