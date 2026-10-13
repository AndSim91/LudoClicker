import { describe, expect, it } from "vitest";
import type { GymRarity } from "../../content/gymStages";
import { pickSwapRarity } from "./gymRack";

const counts = { common: 70, rare: 20, "ultra-rare": 8, legendary: 2 };
const target: GymRarity[] = ["legendary", "ultra-rare", "rare", "common", "common", "common"];

describe("rack swap blade (concept C2)", () => {
  it("brings back a rarity of the school that left the mat", () => {
    const onMat: GymRarity[] = ["ultra-rare", "rare", "common", "common", "common"];
    expect(pickSwapRarity(onMat, target, counts, () => 0.99)).toBe("legendary");
  });

  it("draws by the members' share, favouring the blades the mat lacks", () => {
    const onMat: GymRarity[] = ["legendary", "ultra-rare", "rare", "common", "common"];
    const tally: Record<string, number> = {};
    for (let index = 0; index < 1_000; index += 1) {
      const rarity = pickSwapRarity(onMat, target, counts, () => (index + 0.5) / 1_000);
      tally[rarity] = (tally[rarity] ?? 0) + 1;
    }
    // Weights 140 : 20 : 8 : 2 over 170.
    expect(tally.common).toBeGreaterThan(800);
    expect(tally.common).toBeLessThan(850);
    expect(tally.rare).toBeGreaterThan(100);
    expect(tally.legendary).toBeGreaterThan(0);
  });
});
