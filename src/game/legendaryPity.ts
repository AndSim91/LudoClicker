const CHANCE_PER_PITY_POINT = 0.01;

export function applyLegendaryPityBonus(
  enrollmentChance: number,
  legendaryPity: number,
): number {
  return Math.min(1, enrollmentChance + legendaryPity * CHANCE_PER_PITY_POINT);
}

export function incrementLegendaryPity(legendaryPity: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, legendaryPity + 1);
}

export function updateLegendaryPityAfterTrial(
  legendaryPity: number,
  enrolled: boolean,
  isLegendaryTrial: boolean,
): number {
  if (enrolled) return isLegendaryTrial ? 0 : legendaryPity;
  return incrementLegendaryPity(legendaryPity);
}
