import type { GymRarity, GymRarityCounts } from "../../content/gymStages";

/**
 * The gym's rack swaps (13/10, concepts R1 + V2 + C2): every pair on the mat
 * stays 120–180 s, then walks to the rack and is replaced by a new pair. Uses Math.random on
 * purpose: nothing here touches the game state or its seeded RNG.
 */
export const GYM_LIFESPAN_MS: [number, number] = [120_000, 180_000];
/** On opening the page the clocks start already staggered, so nobody leaves together. */
export const GYM_FIRST_LIFESPAN_MS: [number, number] = [20_000, 180_000];
/** Pairs walking to each rack at the same time (13/10: the whole pair goes; 14/10: two racks from the Arena delle Onde). */
export const GYM_MAX_WALKING_PAIRS = 1;

export const between = (random: () => number, [min, max]: [number, number]) => min + random() * (max - min);

/**
 * Concept C2 «Estrazione pesata»: the new blade is drawn by the members' share
 * of each rarity, doubled for a rarity the mat lacks against `target` and halved
 * for one it already has too many of. A rarity of `target` missing from the mat
 * comes back first, so no rarity the school has disappears from the screen.
 * `onMat` are the blades left once the leaving athlete is gone.
 */
export function pickSwapRarity(
  onMat: GymRarity[],
  target: GymRarity[],
  counts: GymRarityCounts,
  random: () => number,
): GymRarity {
  const count = (list: GymRarity[], rarity: GymRarity) => list.filter((item) => item === rarity).length;
  const missing = [...new Set(target)].filter((rarity) => count(onMat, rarity) === 0);
  const pool = missing.length > 0 ? missing : (Object.keys(counts) as GymRarity[]).filter((rarity) => (counts[rarity] ?? 0) > 0);
  if (pool.length === 0) return target[0] ?? "common";
  const weights = pool.map((rarity) => {
    const gap = count(target, rarity) - count(onMat, rarity);
    return (counts[rarity] ?? 0) * (gap > 0 ? 2 : gap < 0 ? 0.5 : 1);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return pool[0];
  let roll = random() * total;
  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return pool[index];
  }
  return pool[pool.length - 1];
}
