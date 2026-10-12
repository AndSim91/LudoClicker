import type {
  TournamentDiscipline,
  TournamentHallEntry,
  TournamentResult,
} from "./types";

function getWinnerName(
  result: TournamentResult,
  discipline: TournamentDiscipline,
): string | undefined {
  const ranking = discipline === "arena" ? result.arenaRanking : result.styleRanking;
  const podium = discipline === "arena" ? result.arenaPodium : result.stylePodium;
  const participantId = ranking[0] ?? podium.find((entry) => entry.position === 1)?.participantId;
  const winner = result.participants.find((participant) => participant.id === participantId);
  if (!winner?.ownedContactId) return undefined;
  return `${winner.firstName} ${winner.lastName}`.trim();
}

export function createTournamentHallEntry(
  result: TournamentResult,
): TournamentHallEntry | undefined {
  const arenaWinner = getWinnerName(result, "arena");
  const styleWinner = getWinnerName(result, "style");
  if (!arenaWinner && !styleWinner) return undefined;
  return {
    level: result.level,
    season: result.season,
    ...(arenaWinner ? { arenaWinner } : {}),
    ...(styleWinner ? { styleWinner } : {}),
  };
}

function hallEntryKey(entry: Pick<TournamentHallEntry, "level" | "season">): string {
  return `${entry.level}:${entry.season}`;
}

export function replaceTournamentHallEntry(
  hall: readonly TournamentHallEntry[],
  result: TournamentResult,
): TournamentHallEntry[] {
  const key = hallEntryKey(result);
  const retained = hall.filter((entry) => hallEntryKey(entry) !== key);
  const nextEntry = createTournamentHallEntry(result);
  return nextEntry ? [...retained, nextEntry] : retained;
}

export function buildTournamentHall(
  results: readonly TournamentResult[],
): TournamentHallEntry[] {
  return results.reduce<TournamentHallEntry[]>(
    (hall, result) => replaceTournamentHallEntry(hall, result),
    [],
  );
}

/**
 * Mantiene i dettagli dell'ultima stagione del circuito ordinario e soltanto
 * l'ultima edizione delle Chronicles. Eventuali duplicati dello stesso livello
 * vengono sovrascritti dal risultato piu recente.
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

  const selectedByLevel = new Map<TournamentResult["level"], TournamentResult>();
  for (const result of results) {
    if (result.level === "chronicles") continue;
    if (result.season === latestOrdinarySeason) selectedByLevel.set(result.level, result);
  }
  if (latestChronicles) selectedByLevel.set("chronicles", latestChronicles);

  const selectedIds = new Set(
    [...selectedByLevel.values()].map((result) => result.id),
  );
  return results.filter((result) => selectedIds.has(result.id));
}
