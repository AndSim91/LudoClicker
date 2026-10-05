import { it } from "vitest";
import { UPGRADE_DEFINITIONS, UPGRADE_PRICING, getUpgradeCost } from "../content/upgrades";
it.skipIf(!process.env.TREE_COST)("tree cost", () => {
  const nodes = UPGRADE_DEFINITIONS.filter((d) => !d.hidden && d.category !== "network" && d.category !== "secrets");
  for (const [g, s] of [[0, 1], [0.1, 1], [0.1, 0.5], [0.15, 0.35], [0.2, 0.5], [0.2, 0.25]]) {
    UPGRADE_PRICING.branchGrowth = g; UPGRADE_PRICING.baseScale = s;
    const levels: Record<string, number> = {};
    let total = 0; const last: string[] = [];
    for (const cat of [...new Set(nodes.map((d) => d.category))]) {
      const own = nodes.filter((d) => d.category === cat);
      let catTotal = 0;
      for (;;) {
        const next = own.filter((d) => (levels[d.id] ?? 0) < d.maxLevel)
          .map((d) => ({ d, c: getUpgradeCost(d, levels[d.id] ?? 0, levels as never) }))
          .sort((a, b) => a.c - b.c)[0];
        if (!next) break;
        catTotal += next.c; levels[next.d.id] = (levels[next.d.id] ?? 0) + 1;
      }
      total += catTotal; last.push(`${cat}:${(catTotal / 1e6).toFixed(1)}M`);
    }
    console.log(`${g * 100}% ×${s}: totale ${(total / 1e6).toFixed(0)}M | ${last.join(" ")}`);
  }
});
