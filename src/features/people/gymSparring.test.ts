import { describe, expect, it } from "vitest";
import { exchangeSteps, nextIdleMs, planBout, rollsBout, type Random } from "./gymSparring";

function seeded(seed: number): Random {
  let value = seed;
  return () => {
    value = (value * 1_103_515_245 + 12_345) % 2_147_483_648;
    return value / 2_147_483_648;
  };
}

describe("gym sparring", () => {
  it("plans bouts of a few seconds with varied exchanges", () => {
    const random = seeded(7);
    for (let bout = 0; bout < 200; bout += 1) {
      const exchanges = planBout(random);
      const duration = exchanges.reduce((sum, item) => sum + item.attackMs + item.recoverMs, 0);
      expect(duration).toBeGreaterThanOrEqual(2_500);
      expect(duration).toBeLessThan(5_800);
      for (const item of exchanges) expect(item.reach).toBeGreaterThanOrEqual(4);
    }
  });

  it("moves the attacker towards the partner and the defender away", () => {
    expect(exchangeSteps({ attacker: 0, reach: 10, attackMs: 200, recoverMs: 200, clash: true })).toEqual([10, 4]);
    expect(exchangeSteps({ attacker: 1, reach: 10, attackMs: 200, recoverMs: 200, clash: true })).toEqual([-4, -10]);
  });

  it("keeps a pair breathing about nine tenths of the time", () => {
    const random = seeded(42);
    let idle = 0;
    let sparring = 0;
    for (let cycle = 0; cycle < 5_000; cycle += 1) {
      idle += nextIdleMs(random);
      if (!rollsBout(random)) continue;
      sparring += planBout(random).reduce((sum, item) => sum + item.attackMs + item.recoverMs, 0);
    }
    const share = sparring / (idle + sparring);
    expect(share).toBeGreaterThan(0.06);
    expect(share).toBeLessThan(0.14);
  });
});
