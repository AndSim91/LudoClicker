// "La palestra che cresce": the gym fills up as the school gains active members.
// Six stages (06/10, Andrea): the rented room, the rack, the Order's standard,
// group training, the official Arena with its judges and, at 500, the
// palazzetto with the scoreboard (thresholds of 07/10). The caption names the stage and the next
// threshold, so the picture doubles as a progress signal.
export const GYM_STAGES = [
  { threshold: 0, name: "Sala in affitto" },
  { threshold: 25, name: "Prima rastrelliera" },
  { threshold: 50, name: "Vessillo dell'Ordine" },
  { threshold: 100, name: "Allenamento di gruppo" },
  { threshold: 250, name: "Arena e giudici" },
  { threshold: 500, name: "Palazzetto" },
] as const;

/** Athletes on the mat: one, a pair with the rack, three pairs with group training. */
export const getGymFighterCount = (activeMembers: number) =>
  activeMembers >= GYM_STAGES[3].threshold ? 6 : activeMembers >= GYM_STAGES[1].threshold ? 2 : activeMembers >= 1 ? 1 : 0;

export function getGymStageIndex(activeMembers: number): number {
  let index = 0;
  GYM_STAGES.forEach((stage, stageIndex) => {
    if (activeMembers >= stage.threshold) index = stageIndex;
  });
  return index;
}

export type GymRarity = "common" | "rare" | "ultra-rare" | "legendary" | "secret-legendary";
export type GymRarityCounts = Partial<Record<GymRarity, number>>;

// Blade colour of an athlete on the mat, by the rarity they stand for.
export const GYM_SABER_COLORS: Record<GymRarity, string> = {
  common: "#6fb6ff",
  rare: "#6bf0b0",
  "ultra-rare": "#d4aeff",
  legendary: "#ffd166",
  "secret-legendary": "#ff6b6b",
};

// Rarest first: every rarity the school has gets one athlete on the mat while
// slots last; the remaining slots follow the member share of each rarity
// (largest remainder), so a school of commons stays mostly blue.
const RAREST_FIRST: GymRarity[] = ["secret-legendary", "legendary", "ultra-rare", "rare"];

export function getGymSaberRarities(counts: GymRarityCounts, slots: number): GymRarity[] {
  const remaining: Record<GymRarity, number> = {
    common: counts.common ?? 0,
    rare: counts.rare ?? 0,
    "ultra-rare": counts["ultra-rare"] ?? 0,
    legendary: counts.legendary ?? 0,
    "secret-legendary": counts["secret-legendary"] ?? 0,
  };
  const picked: GymRarity[] = [];
  for (const rarity of RAREST_FIRST) {
    if (picked.length < slots && remaining[rarity] > 0) {
      picked.push(rarity);
      remaining[rarity] -= 1;
    }
  }

  const free = slots - picked.length;
  const total = Object.values(remaining).reduce((sum, count) => sum + count, 0);
  if (free <= 0) return picked;
  if (total === 0) return [...picked, ...Array<GymRarity>(free).fill("common")];

  const shares = (Object.keys(remaining) as GymRarity[]).map((rarity) => {
    const exact = (remaining[rarity] / total) * free;
    return { rarity, whole: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = free - shares.reduce((sum, share) => sum + share.whole, 0);
  for (const share of [...shares].sort((a, b) => b.rest - a.rest)) {
    if (left === 0) break;
    share.whole += 1;
    left -= 1;
  }
  const proportional = shares.flatMap((share) => Array<GymRarity>(share.whole).fill(share.rarity));
  // Commons last, so rarer blades sit in the central pair.
  proportional.sort((a, b) => Number(a === "common") - Number(b === "common"));
  return [...picked, ...proportional];
}
