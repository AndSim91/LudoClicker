import type { TournamentResult } from "./types";

/**
 * Mantiene i dettagli delle ultime due stagioni del circuito ordinario (la
 * Panoramica mostra quella precedente, 12/10/2026) e soltanto l'ultima
 * edizione delle Chronicles. Eventuali duplicati dello stesso livello e
 * stagione vengono sovrascritti dal risultato piu recente.
 */
export function compactDetailedTournamentResults(
  results: readonly TournamentResult[],
): TournamentResult[] {
  let latestOrdinarySeason: number | undefined;
  let latestChronicles: TournamentResult | undefined;
  for (const result of results) {
    if (result.level === "chronicles") {
      latestChronicles = result;
    } else if (
      latestOrdinarySeason === undefined ||
      result.season > latestOrdinarySeason
    ) {
      latestOrdinarySeason = result.season;
    }
  }

  const selectedByKey = new Map<string, TournamentResult>();
  for (const result of results) {
    if (result.level === "chronicles") continue;
    if (latestOrdinarySeason !== undefined && result.season >= latestOrdinarySeason - 1) {
      selectedByKey.set(`${result.level}:${result.season}`, result);
    }
  }
  if (latestChronicles) selectedByKey.set("chronicles", latestChronicles);

  const selectedIds = new Set(
    [...selectedByKey.values()].map((result) => result.id),
  );
  return results.filter((result) => selectedIds.has(result.id));
}
