import { describe, expect, it } from "vitest";
import { migrateLegendaryBase80State } from "./legendaryBase80";
import type { MigratableState } from "./types";

describe("migrateLegendaryBase80State", () => {
  it("alza di +5 i Leggendari ordinari e lascia stare gli altri", () => {
    const state = {
      version: 109,
      contacts: [
        { rarity: "legendary", arenaBase: 76, styleBase: 75 },
        { rarity: "legendary", secretLegendaryId: "marco-palena", arenaBase: 85, styleBase: 95 },
        { rarity: "common", arenaBase: 40, styleBase: 90 },
      ],
      legendaryCollaborators: { retainedProgress: { "eva-parodi": { arenaBase: 75, styleBase: 77 }, "marco-palena": { arenaBase: 85, styleBase: 95 } } },
    } as unknown as MigratableState;
    const next = migrateLegendaryBase80State(state) as any;
    expect(next.version).toBe(110);
    expect(next.contacts.map((c: any) => [c.arenaBase, c.styleBase])).toEqual([[81, 80], [85, 95], [40, 90]]);
    expect(next.legendaryCollaborators.retainedProgress["eva-parodi"]).toEqual({ arenaBase: 80, styleBase: 82 });
    expect(next.legendaryCollaborators.retainedProgress["marco-palena"]).toEqual({ arenaBase: 85, styleBase: 95 });
  });
});
