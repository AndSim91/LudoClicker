import { expect, it } from "vitest";
import { createInitialState } from "./engine";
import { simulateTournament } from "./tournamentSimulation";

const probe = import.meta.env.RUN_TOURNAMENT_BALANCE === "1" ? it : it.skip;

probe("reports Champion's Arena win rates", () => {
  const strengths = [200, 210, 220, 224, 230, 240, 250];
  const runs = 500;
  const rates: Record<number, number> = {};
  const podiumRates: Record<number, number> = {};
  for (const strength of strengths) {
    let victories = 0;
    let podiums = 0;
    for (let run = 0; run < runs; run += 1) {
      const initial = createInitialState(1_000 + run, "Balance");
      const athlete = {
        ...initial.contacts[0],
        id: `athlete-${strength}-${run}`,
        status: "enrolled" as const,
        forms: [],
        arenaBase: strength,
        styleBase: 1,
        tournamentExperience: 0,
      };
      const state = {
        ...initial,
        randomSeed: (run * 104_729 + strength * 65_537) | 0,
        contacts: [athlete],
      };
      const result = simulateTournament(state, "champions", 1, 1_000_000 + run, [athlete]);
      if (result.result.arenaRanking[0] === `owned-${athlete.id}`) victories += 1;
      if (result.result.arenaRanking.slice(0, 3).includes(`owned-${athlete.id}`)) podiums += 1;
    }
    rates[strength] = victories / runs;
    podiumRates[strength] = podiums / runs;
  }
  console.log("TOURNAMENT_BALANCE", JSON.stringify({ victories: rates, podiums: podiumRates }));
  expect(rates[224]).toBeGreaterThan(0.20);
  expect(rates[250]).toBeGreaterThan(0.75);
}, 120_000);
