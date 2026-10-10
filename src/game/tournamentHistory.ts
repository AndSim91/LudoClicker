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
 * School year (September–August) a tournament belongs to. Scolastico, Accademico
 * and Nazionale of season S fall in school year S; the Champion's Arena of season
 * S is played in November of the next school year.
 */
export function getTournamentSchoolYear(
  result: Pick<TournamentResult, "level" | "season" | "schoolYear">,
): number {
  if (result.level === "chronicles") return result.schoolYear ?? result.season;
  return result.level === "champions" ? result.season + 1 : result.season;
}

/**
 * Keeps the details of the ordinary circuit for the latest two school years
 * (the Tornei page shows the current one, or the previous one while nothing has
 * been played yet) and only the latest Chronicles edition. A duplicate of the
 * same level and school year is replaced by the most recent result.
 */
export function compactDetailedTournamentResults(
  results: readonly TournamentResult[],
): TournamentResult[] {
  let latestSchoolYear: number | undefined;
  let latestChronicles: TournamentResult | undefined;
  for (const result of results) {
    if (result.level === "chronicles") {
      latestChronicles = result;
      continue;
    }
    const schoolYear = getTournamentSchoolYear(result);
    if (latestSchoolYear === undefined || schoolYear > latestSchoolYear) latestSchoolYear = schoolYear;
  }

  const selectedByKey = new Map<string, TournamentResult>();
  for (const result of results) {
    if (result.level === "chronicles" || latestSchoolYear === undefined) continue;
    const schoolYear = getTournamentSchoolYear(result);
    if (schoolYear >= latestSchoolYear - 1) selectedByKey.set(`${result.level}:${schoolYear}`, result);
  }
  if (latestChronicles) selectedByKey.set("chronicles", latestChronicles);

  const selectedIds = new Set([...selectedByKey.values()].map((result) => result.id));
  return results.filter((result) => selectedIds.has(result.id));
}
