import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { getSecretLegendaryProfile } from "../content/secretLegendaries";
import { TOURNAMENT_DEFINITIONS } from "../content/tournaments";
import { formatCurrency } from "../shared/formatters";
import { getCalendarMonth, getGameMonthName, getSchoolYear } from "./calendar";
import { getCareer } from "./career";
import { isDebtBlocked } from "./debt";
import { getEffectiveDamagedSwords } from "./equipment";
import { getSourceSummaries } from "./historyArchive";
import { getEverEnrolledLegendaryIds } from "./moments";
import type {
  AnnualGrade,
  AnnualGradeRow,
  AnnualHighlight,
  AnnualLedger,
  AnnualMark,
  AnnualMonth,
  AnnualReport,
  AnnualSnapshot,
  AnnualSubject,
  Contact,
  GameState,
  IncomeSource,
  SecretLegendaryId,
  SpecialCollaboratorId,
  TournamentLevel,
  TournamentResult,
} from "./types";

/*
 * Report annuale e pagella della Pianificazione delle Onde (Andrea, 07–08/10).
 * The ledger keeps the counters at the start of the school year and closes
 * each month (income, new members, Highlight candidates). At the start of
 * August the year becomes a pagella: six subjects graded A–E, the Highlight
 * annuale, the months for the forecast. In September the ledger starts over.
 */

export const ANNUAL_SUBJECTS: readonly AnnualSubject[] = [
  "enrollment",
  "loyalty",
  "teaching",
  "tournaments",
  "administration",
  "finances",
];

export const ANNUAL_SUBJECT_LABELS: Record<AnnualSubject, string> = {
  enrollment: "Iscrizioni",
  loyalty: "Fidelizzazione",
  teaching: "Didattica",
  tournaments: "Risultati Agonistici",
  administration: "Amministrazione",
  finances: "Finanze",
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource | "other", string> = {
  fees: "quote",
  network: "Network",
  social: "Social",
  gadgets: "gadget",
  other: "premi e altro",
};

const GRADES: readonly AnnualGrade[] = ["A", "B", "C", "D", "E"];
const PLANNING_CALENDAR_MONTH = 8;
const MEMBER_RECORDS = [25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000];
/** Rank of a title, for «a title higher than before». */
const TITLE_RANK: Partial<Record<TournamentLevel, number>> = {
  school: 1,
  academy: 2,
  national: 3,
  champions: 4,
};
const TITLE_PLACE: Record<number, string> = {
  1: "allo Scolastico",
  2: "all'Accademico: l'Ordine si accorge di noi",
};

const nf = (value: number) => Math.round(value).toLocaleString("it-IT");
export const monthLabel = (month: number) => getGameMonthName(month).toLowerCase();

function ownedParticipantIds(result: TournamentResult): Set<string> {
  return new Set(result.participants.filter((p) => p.ownedContactId).map((p) => p.id));
}

/** Best place of the school's athletes in Arena or Stile (1 = winner), Infinity if none. */
export function getSchoolBestPlace(result: TournamentResult): number {
  const owned = ownedParticipantIds(result);
  let best = Infinity;
  for (const ranking of [result.arenaRanking, result.styleRanking]) {
    const index = ranking.findIndex((id) => owned.has(id));
    if (index >= 0) best = Math.min(best, index + 1);
  }
  return best;
}

function getBestTitleRank(state: GameState): number {
  let best = 0;
  for (const result of state.tournaments.results) {
    const rank = TITLE_RANK[result.level];
    if (rank && rank > best && getSchoolBestPlace(result) === 1) best = rank;
  }
  return best;
}

function getEnrolledSecretLegendaryIds(state: GameState): SecretLegendaryId[] {
  return (Object.entries(state.network.secretLegendaries) as [SecretLegendaryId, { status: string }][])
    .filter(([, progress]) => progress.status === "enrolled")
    .map(([id]) => id);
}

export function takeAnnualSnapshot(state: GameState, now: number): AnnualSnapshot {
  const career = getCareer(state);
  return {
    at: now,
    month: state.school.currentMonth,
    activeMembers: state.school.activeMembers,
    peakActiveMembers: state.school.peakActiveMembers,
    membersEnrolled: state.statistics.membersEnrolled,
    membersDeparted: state.statistics.membersDeparted,
    formsCompleted: state.statistics.formsCompleted,
    trialsCompleted: state.statistics.trialsCompleted,
    trialsCancelled: state.statistics.trialsCancelled ?? 0,
    eventsCompleted: state.statistics.eventsCompleted,
    eurosEarned: state.statistics.eurosEarned,
    euros: state.school.euros,
    income: { ...state.statistics.incomeBySource },
    totalSwords: state.equipment.totalSwords,
    collaborators: state.collaborators.length,
    instructors: state.collaborators.filter((c) => c.instructorForms.length > 0).length,
    technicians: state.collaborators.filter((c) => (c.technicianForms?.length ?? 0) > 0).length,
    schoolCount: state.network.schoolCount,
    nationalTitles: career.nationalTitles,
    championsWins: career.championsWins,
    reptileEditions: state.tournaments.reptile.hall.length,
    council: state.collaboratorManagement.aggregateViewUnlocked === true,
    schoolTournamentPlayed: state.tournaments.results.some((result) => result.level === "school") ||
      state.tournaments.hall.some((entry) => entry.level === "school"),
    bestTitleRank: getBestTitleRank(state),
    legendaries: [
      ...getEverEnrolledLegendaryIds(state),
      ...getEnrolledSecretLegendaryIds(state).map((id) => `secret:${id}`),
    ],
  };
}

export function createAnnualLedger(state: GameState, now: number): AnnualLedger {
  const start = takeAnnualSnapshot(state, now);
  return {
    schoolYear: getSchoolYear(state.school.currentMonth),
    start,
    last: start,
    months: [],
    marks: [],
    startSources: getSourceSummaries(state.contacts, state.historyArchive.contactsBySource),
  };
}

function legendaryName(key: string): { name: string; secret: boolean } {
  if (key.startsWith("secret:")) {
    const profile = getSecretLegendaryProfile(key.slice(7) as SecretLegendaryId);
    return { name: `${profile.firstName} ${profile.lastName}`, secret: true };
  }
  const profile = SPECIAL_COLLABORATORS.find((p) => p.id === (key as SpecialCollaboratorId));
  return { name: profile ? `${profile.firstName} ${profile.lastName}` : "un Leggendario", secret: false };
}

/** What happened between two snapshots, as Highlight candidates of `month`. */
export function findAnnualMarks(before: AnnualSnapshot, after: AnnualSnapshot, month: number): AnnualMark[] {
  const marks: AnnualMark[] = [];
  const add = (category: AnnualMark["category"], title: string, rarity = 0) =>
    marks.push({ category, title, month, rarity });

  if (!before.council && after.council) add(1, "Nasce il Consiglio delle Onde");
  const firstSchoolTitle = before.bestTitleRank < 1 && after.bestTitleRank >= 1;
  const firstSchoolTournament = !before.schoolTournamentPlayed && after.schoolTournamentPlayed;
  if (firstSchoolTournament) add(1, firstSchoolTitle ? "Il primo Torneo Scolastico: campioni!" : "Il primo Torneo Scolastico");
  if (before.nationalTitles === 0 && after.nationalTitles > 0) add(1, "Campioni d'Italia al Nazionale");
  if (before.reptileEditions === 0 && after.reptileEditions > 0) add(1, "Il primo Reptile della scuola");
  if (before.championsWins === 0 && after.championsWins > 0) add(1, "Campioni alla Champion's Arena");

  const titlePlace = TITLE_PLACE[after.bestTitleRank];
  const titleCounted = firstSchoolTournament && after.bestTitleRank === 1;
  if (after.bestTitleRank > before.bestTitleRank && titlePlace && !titleCounted) add(2, `Primo titolo ${titlePlace}`);

  for (const key of after.legendaries) {
    if (before.legendaries.includes(key)) continue;
    const { name, secret } = legendaryName(key);
    add(3, `Arriva un Leggendario${secret ? " Segreto" : ""}: ${name} è dei nostri`, secret ? 2 : 1);
  }

  if (before.collaborators === 0 && after.collaborators > 0) add(4, "Il primo collaboratore entra in squadra");
  if (before.formsCompleted === 0 && after.formsCompleted > 0) add(4, "La prima Forma insegnata");
  if (before.instructors === 0 && after.instructors > 0) add(4, "Il primo Istruttore della scuola");
  if (before.technicians === 0 && after.technicians > 0) add(4, "Il primo Tecnico della scuola");

  const record = [...MEMBER_RECORDS].reverse()
    .find((threshold) => before.peakActiveMembers < threshold && after.peakActiveMembers >= threshold);
  if (record) add(5, record === 1_000 ? "Mille iscritti: serve una palestra più grande" : `${nf(record)} iscritti`, record);
  return marks;
}

function scoreToGrade(value: number, thresholds: readonly [number, number, number, number]): AnnualGrade {
  const index = thresholds.findIndex((threshold) => value >= threshold);
  return GRADES[index < 0 ? 4 : index];
}

function lowerGrade(grade: AnnualGrade): AnnualGrade {
  return GRADES[Math.min(4, GRADES.indexOf(grade) + 1)];
}

function placeScore(place: number, level: TournamentLevel): number {
  const base = place === 1 ? 0.85 : place === 2 ? 0.7 : place <= 4 ? 0.55 : place <= 8 ? 0.4 : place <= 16 ? 0.25 : 0.1;
  return base + 0.05 * ((TITLE_RANK[level] ?? 1) - 1);
}

function averageEarned(months: readonly AnnualMonth[]): number {
  return months.length ? months.reduce((sum, month) => sum + month.earned, 0) / months.length : 0;
}

/** Numbers of the year so far, by subject: the «Dati» of the Report annuale. */
export interface AnnualYearData {
  schoolYear: number;
  start: AnnualSnapshot;
  now: AnnualSnapshot;
  months: AnnualMonth[];
  marks: AnnualMark[];
  enrolled: number;
  departed: number;
  forms: number;
  trials: number;
  cancelled: number;
  events: number;
  earned: number;
  income: Partial<Record<IncomeSource | "other", number>>;
  swordsBought: number;
  tournaments: { result: TournamentResult; place: number }[];
  sources: { source: Contact["source"]; total: number; enrolled: number }[];
}

export function getAnnualYearData(state: GameState, now: number, ledger = state.annual?.ledger): AnnualYearData {
  const current = takeAnnualSnapshot(state, now);
  const start = ledger?.start ?? current;
  const delta = (key: keyof AnnualSnapshot) => Math.max(0, (current[key] as number) - (start[key] as number));
  const earned = delta("eurosEarned");
  const income: AnnualYearData["income"] = {};
  let tracked = 0;
  for (const source of ["fees", "network", "social", "gadgets"] as IncomeSource[]) {
    const value = Math.max(0, (current.income[source] ?? 0) - (start.income[source] ?? 0));
    if (value > 0) income[source] = value;
    tracked += value;
  }
  if (earned - tracked >= 1) income.other = earned - tracked;

  const sourcesNow = getSourceSummaries(state.contacts, state.historyArchive.contactsBySource);
  const sourcesStart = ledger?.startSources;
  return {
    schoolYear: ledger?.schoolYear ?? getSchoolYear(state.school.currentMonth),
    start,
    now: current,
    months: ledger?.months ?? [],
    marks: ledger?.marks ?? [],
    enrolled: delta("membersEnrolled"),
    departed: delta("membersDeparted"),
    forms: delta("formsCompleted"),
    trials: delta("trialsCompleted"),
    cancelled: delta("trialsCancelled"),
    events: delta("eventsCompleted"),
    earned,
    income,
    swordsBought: delta("totalSwords"),
    tournaments: state.tournaments.results
      .filter((result) => result.completedAt >= start.at)
      .sort((left, right) => left.completedAt - right.completedAt)
      .map((result) => ({ result, place: getSchoolBestPlace(result) })),
    sources: (Object.keys(sourcesNow) as Contact["source"][])
      .map((source) => ({
        source,
        total: Math.max(0, sourcesNow[source].total - (sourcesStart?.[source]?.total ?? 0)),
        enrolled: Math.max(0, sourcesNow[source].enrolled - (sourcesStart?.[source]?.enrolled ?? 0)),
      }))
      .filter((entry) => entry.total > 0),
  };
}

export function describeIncome(income: AnnualYearData["income"]): string {
  return (Object.entries(income) as [IncomeSource | "other", number][])
    .filter(([, euros]) => euros >= 1)
    .sort((left, right) => right[1] - left[1])
    .map(([source, euros]) => `${INCOME_SOURCE_LABELS[source]} ${formatCurrency(Math.round(euros))}`)
    .join(", ");
}

/** One line of numbers per subject, the same with or without grades. */
export function describeAnnualSubjects(state: GameState, data: AnnualYearData): Record<AnnualSubject, string> {
  // The result the grade looks at: the best place, weighed by the level.
  const best = data.tournaments
    .filter((entry) => Number.isFinite(entry.place))
    .sort((left, right) => placeScore(right.place, right.result.level) - placeScore(left.place, left.result.level))[0];
  const sources = describeIncome(data.income);
  return {
    enrollment: `${nf(data.now.activeMembers)} ${data.now.activeMembers === 1 ? "Iscritto" : "Iscritti"}, ${nf(data.enrolled)} ${data.enrolled === 1 ? "arrivato" : "arrivati"} nell'anno`,
    loyalty: `${nf(data.departed)} ${data.departed === 1 ? "andato" : "andati"} via, ${nf(data.now.activeMembers)} ${data.now.activeMembers === 1 ? "rimasto" : "rimasti"}`,
    teaching: state.unlocks.forms ? `${nf(data.forms)} ${data.forms === 1 ? "Forma insegnata" : "Forme insegnate"} nell'anno` : "Le Forme non sono ancora aperte",
    tournaments: best
      ? `${TOURNAMENT_DEFINITIONS[best.result.level].label}: ${best.place}° posto${data.tournaments.length > 1 ? `, ${data.tournaments.length} tornei disputati` : ""}`
      : "Nessun torneo disputato",
    administration: `${nf(data.trials)} ${data.trials === 1 ? "prova fatta" : "prove fatte"}, ${data.cancelled > 0 ? `${nf(data.cancelled)} ${data.cancelled === 1 ? "annullata" : "annullate"}` : "nessuna annullata"}; ${nf(data.events)} ${data.events === 1 ? "evento" : "eventi"}`,
    finances: `${formatCurrency(Math.round(data.earned))} guadagnati${sources ? `: ${sources}` : ""}`,
  };
}

/** The grades (Andrea, 08/10). ponytail: thresholds are first guesses, to tune with play. */
export function gradeAnnualYear(
  state: GameState,
  data: AnnualYearData,
  previous?: AnnualReport,
): Partial<Record<AnnualSubject, AnnualGrade>> {
  const base = data.start.activeMembers + data.enrolled;
  const grades: Partial<Record<AnnualSubject, AnnualGrade>> = {
    enrollment: scoreToGrade(data.enrolled / Math.max(10, data.start.activeMembers), [0.8, 0.5, 0.3, 0.15]),
    loyalty: scoreToGrade(1 - data.departed / Math.max(1, base), [0.9, 0.8, 0.7, 0.55]),
  };
  if (state.unlocks.forms) {
    grades.teaching = scoreToGrade(data.forms / Math.max(1, data.now.activeMembers), [1, 0.6, 0.35, 0.15]);
  }
  const played = data.tournaments.filter((entry) => Number.isFinite(entry.place));
  if (played.length > 0) {
    const score = Math.max(...played.map((entry) => placeScore(entry.place, entry.result.level)));
    grades.tournaments = scoreToGrade(score, [0.8, 0.6, 0.45, 0.3]);
  }
  const cancelledShare = data.cancelled / Math.max(1, data.trials + data.cancelled);
  let administration = scoreToGrade(-cancelledShare, [-0.02, -0.05, -0.1, -0.2]);
  if (getEffectiveDamagedSwords(state.equipment) > state.equipment.totalSwords / 4) {
    administration = lowerGrade(administration);
  }
  grades.administration = administration;

  // Income per month against last year, or within the year for the first one.
  const average = averageEarned(data.months);
  const previousAverage = previous ? averageEarned(previous.months) : 0;
  const growth = previousAverage > 0
    ? average / previousAverage - 1
    : averageEarned(data.months.slice(-2)) / Math.max(1, averageEarned(data.months.slice(0, 2))) - 1;
  let finances = scoreToGrade(growth, [0.3, 0.1, -0.05, -0.2]);
  if (isDebtBlocked(state)) finances = lowerGrade(finances);
  grades.finances = finances;
  return grades;
}

const NUMBER_OF_THE_YEAR: Record<AnnualSubject, (data: AnnualYearData) => string> = {
  enrollment: (data) => `L'anno delle iscrizioni: ${nf(data.enrolled)} nuovi Iscritti`,
  loyalty: (data) => `L'anno della fedeltà: ${nf(data.now.activeMembers)} Iscritti rimasti`,
  teaching: (data) => `L'anno delle Forme: ${nf(data.forms)} Forme insegnate`,
  tournaments: (data) => `L'anno dei tornei: ${nf(data.tournaments.length)} tornei disputati`,
  administration: (data) => `L'anno delle prove: ${nf(data.trials)} prove fatte`,
  finances: (data) => `L'anno dei Fondi: ${formatCurrency(data.earned)} guadagnati`,
};

function compareMarks(left: AnnualMark, right: AnnualMark): number {
  return left.category - right.category || right.rarity - left.rarity || right.month - left.month;
}

/** Highest category wins; ties: rarer, then more recent. Categories 3–5 never twice in a row. */
export function pickAnnualHighlight(
  marks: readonly AnnualMark[],
  grades: Partial<Record<AnnualSubject, AnnualGrade>>,
  data: AnnualYearData,
  lastCategory?: number,
): AnnualHighlight {
  const sorted = [...marks].sort(compareMarks);
  const repeats = (mark: AnnualMark) => mark.category >= 3 && mark.category <= 5 && mark.category === lastCategory;
  const winner = sorted.find((mark) => !repeats(mark));
  const mentions = sorted.filter((mark) => mark !== winner).slice(0, 2)
    .map((mark) => `${mark.title} · ${monthLabel(mark.month)}`);
  if (winner) return { category: winner.category, title: winner.title, month: winner.month, mentions };

  const bestSubject = ANNUAL_SUBJECTS
    .filter((subject) => grades[subject])
    .sort((left, right) => GRADES.indexOf(grades[left]!) - GRADES.indexOf(grades[right]!))[0] ?? "enrollment";
  return { category: 6, title: NUMBER_OF_THE_YEAR[bestSubject](data), mentions };
}

export function buildAnnualReport(state: GameState, now: number): AnnualReport {
  const ledger = state.annual?.ledger;
  const previous = state.annual?.report;
  const data = getAnnualYearData(state, now, ledger);
  const texts = describeAnnualSubjects(state, data);
  const grades = gradeAnnualYear(state, data, previous);
  const rows: AnnualGradeRow[] = ANNUAL_SUBJECTS.map((subject) => ({
    subject,
    text: texts[subject],
    ...(grades[subject] ? { grade: grades[subject] } : {}),
  }));
  const previousGrades = previous
    ? Object.fromEntries(previous.grades.flatMap((row) => row.grade ? [[row.subject, row.grade]] : []))
    : undefined;
  return {
    schoolYear: data.schoolYear,
    month: state.school.currentMonth,
    grades: rows,
    ...(previousGrades ? { previousGrades } : {}),
    highlight: pickAnnualHighlight(data.marks, grades, data, state.annual?.lastHighlightCategory),
    months: data.months,
  };
}

/**
 * End of `closedMonth` (called by collectFees after the month advanced): books
 * the month, writes the pagella at the start of August and opens the
 * Pianificazione, starts a new ledger with the school year.
 */
export function closeAnnualMonth(state: GameState, closedMonth: number, now: number): GameState {
  const annual = state.annual ?? {};
  const previousLedger = annual.ledger ?? createAnnualLedger(state, now);
  const snapshot = takeAnnualSnapshot(state, now);
  const before = previousLedger.last;
  const ledger: AnnualLedger = annual.ledger
    ? {
        ...previousLedger,
        last: snapshot,
        months: [...previousLedger.months, {
          month: closedMonth,
          earned: Math.max(0, snapshot.eurosEarned - before.eurosEarned),
          enrolled: Math.max(0, snapshot.membersEnrolled - before.membersEnrolled),
        }],
        marks: [...previousLedger.marks, ...findAnnualMarks(before, snapshot, closedMonth)],
      }
    : previousLedger;
  let next: GameState = { ...state, annual: { ...annual, ledger } };

  const newMonth = closedMonth + 1;
  // A plan left open (a long absence) is replaced by the new year's.
  if (getCalendarMonth(newMonth) === PLANNING_CALENDAR_MONTH) {
    const report = buildAnnualReport(next, now);
    next = {
      ...next,
      annual: {
        ...next.annual,
        report,
        planningOpen: true,
        lastHighlightCategory: report.highlight?.category,
      },
    };
  }
  if (getSchoolYear(newMonth) !== ledger.schoolYear) {
    next = { ...next, annual: { ...next.annual, ledger: createAnnualLedger(next, now) } };
  }
  return next;
}
