import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { simulateBalanceGame } from "./balanceSimulation";
import { UPGRADE_DEFINITIONS, UPGRADE_PRICING } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { getMonthlyOperationalIncome } from "./membershipEconomy";

const V = process.env.VARIANT!;
const [growth, scale, formBonus] = V.split(",").map(Number);
const SEEDS = (process.env.SEEDS ?? "1,2").split(",").map(Number);
const HOURS = Number(process.env.HOURS ?? 6);
const OUT = process.env.OUT!;

it.skipIf(!process.env.VARIANT)("curve experiment", () => {
  UPGRADE_PRICING.branchGrowth = growth;
  UPGRADE_PRICING.baseScale = scale;
  const config = GAME_CONFIG as unknown as Record<string, number>;
  if (!formBonus) {
    config.monthlyMemberFormBonus = 0;
    config.monthlyMemberInstructorBonus = 0;
    config.monthlyMemberTechnicianBonus = 0;
  }
  const counted = UPGRADE_DEFINITIONS.filter((d) => !d.hidden && d.category !== "network");
  const totalLevels = counted.reduce((t, d) => t + d.maxLevel, 0);
  const out: unknown[] = [];
  for (const seed of SEEDS) {
    const priority = simulateBalanceGame({ seed, pace: "intense", horizonMs: 3 * 3_600_000 });
    const snapshots: unknown[] = [];
    const surplus = simulateBalanceGame({
      seed, pace: "intense", horizonMs: HOURS * 3_600_000, spendSurplus: true, continueAfterPrestige: true,
      onTick: (state, elapsed) => {
        if (elapsed % 3_600_000 !== 0 || elapsed === 0) return;
        const byBranch: Record<string, string> = {};
        for (const d of counted) {
          const [b, m] = (byBranch[d.category] ?? "0/0").split("/").map(Number);
          byBranch[d.category] = `${b + (state.upgrades[d.id] ?? 0)}/${m + d.maxLevel}`;
        }
        const bought = counted.reduce((t, d) => t + (state.upgrades[d.id] ?? 0), 0);
        snapshots.push({
          h: elapsed / 3_600_000,
          levels: `${bought}/${totalLevels} (${Math.round((100 * bought) / totalLevels)}%)`,
          earned: Math.round(state.statistics.eurosEarned),
          funds: Math.round(state.school.euros),
          monthly: Math.round(getMonthlyOperationalIncome(state)),
          members: state.school.activeMembers,
          byBranch,
        });
      },
    });
    out.push({
      seed,
      prestigeMin: priority.prestigeReadyAtMs && +(priority.prestigeReadyAtMs / 60_000).toFixed(1),
      prestigeMinSurplus: surplus.prestigeReadyAtMs && +(surplus.prestigeReadyAtMs / 60_000).toFixed(1),
      snapshots,
    });
  }
  writeFileSync(OUT, JSON.stringify({ variant: V, out }, null, 1));
}, 3 * 3_600_000);
