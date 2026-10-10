import { getOfficialStatsVisibilityTier, isCourseXUnlocked } from "../../content/upgrades";
import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import {
  TOURNAMENT_DEFINITIONS,
  getNextTournamentLevel,
} from "../../content/tournaments";
import {
  getContactPreparation,
  hasUnlockedOfficialStats,
} from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { useGameSelector } from "../../game/GameStateContext";
import {
  getEligibleSchoolContactsFromRoster,
  selectSchoolTournamentEntrantsFromRoster,
} from "../../game/tournamentSimulation";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import {
  findUpcomingTournament,
  formatTournamentCountdown,
  getUpcomingDelegationContactIds,
  monthShortLabel,
} from "./tournamentPresentation";
import { TournamentContactIdentity } from "./TournamentAthleteIdentity";
import { formatStat } from "../../shared/formatters";
import { getSchoolYear } from "../../game/calendar";
import { getReptileTournamentName } from "../../game/reptileUnlock";
import {
  YEAR_ENTRY_LABEL,
  findEntry,
  getDefaultEntry,
  getTournamentYearView,
  type YearEntry,
} from "./schoolYearTournaments";
import { TournamentYearCalendar } from "./TournamentYearCalendar";
import { TournamentYearPanel } from "./TournamentYearPanel";

interface TournamentOverviewProps {
  state?: GameState;
  /** Row picked in the calendar (shared with Risultati). */
  selectedKey?: string;
  onSelectEntry: (key: string) => void;
  /** «Tabellone completo»: the same tournament in Risultati. */
  onOpenResults: (key: string) => void;
}

function selectTournamentOverviewState(state: GameState): GameState {
  return state;
}

function haveSameTournamentOverviewState(left: GameState, right: GameState): boolean {
  return left.contacts === right.contacts &&
    left.tournaments === right.tournaments &&
    left.school.currentMonth === right.school.currentMonth &&
    left.school.name === right.school.name &&
    left.school.city === right.school.city &&
    left.school.nextFeeAt === right.school.nextFeeAt &&
    left.network.superbaTournament === right.network.superbaTournament &&
    left.upgrades["talent-eye"] === right.upgrades["talent-eye"] &&
    left.collaborators.length === right.collaborators.length &&
    left.collaborators.every((collaborator, index) => {
      const current = right.collaborators[index];
      return collaborator.id === current.id &&
        collaborator.contactId === current.contactId &&
        collaborator.forms === current.forms;
    });
}

export function TournamentOverview({
  state: stateOverride,
  selectedKey,
  onSelectEntry,
  onOpenResults,
}: TournamentOverviewProps) {
  const state = useGameSelector(
    selectTournamentOverviewState,
    stateOverride,
    haveSameTournamentOverviewState,
  );
  const upcoming = findUpcomingTournament(state);
  const now = useGameTime(
    Boolean(upcoming),
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const upcomingDefinition = upcoming ? TOURNAMENT_DEFINITIONS[upcoming.level] : undefined;
  const qualification = state.tournaments.qualification;
  const delegationContactIds = getUpcomingDelegationContactIds(state, upcoming);
  const schoolTournamentEntry = useMemo(() => {
    const eligibleCount = getEligibleSchoolContactsFromRoster(
      state.contacts,
      state.collaborators,
    ).length;
    const selection = selectSchoolTournamentEntrantsFromRoster(
      state.contacts,
      state.collaborators,
    );
    return { eligibleCount, selection };
  }, [state.collaborators, state.contacts]);
  const collaboratorsByContactId = useMemo(
    () => new Map(state.collaborators.map((entry) => [entry.contactId, entry])),
    [state.collaborators],
  );
  const statsTier = getOfficialStatsVisibilityTier(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const teamEntryByContactId = useMemo(() => new Map(
    state.contacts.map((contact) => {
      const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
      const preparation = getContactPreparation(contact, forms, courseXUnlocked);
      const visible = hasUnlockedOfficialStats(forms, statsTier);
      return [contact.id, { contact, preparation, visible }] as const;
    }),
  ), [collaboratorsByContactId, courseXUnlocked, state.contacts, statsTier]);
  const delegation = delegationContactIds.flatMap((contactId) => {
    const entry = teamEntryByContactId.get(contactId);
    return entry?.contact.status === "enrolled" ? [entry] : [];
  });
  const officialQualified = useMemo(() => (qualification?.contactIds ?? []).flatMap((contactId) => {
    const entry = teamEntryByContactId.get(contactId);
    return entry?.contact.status === "enrolled" ? [entry] : [];
  }), [qualification, teamEntryByContactId]);
  const qualificationByeCount = Math.max(
    0,
    (qualification?.contactIds.length ?? 0) - officialQualified.length,
  );
  const latestResult = state.tournaments.results.at(-1);
  const qualificationTarget = qualification
    ? { level: qualification.level, season: qualification.season }
    : latestResult
      ? { level: getNextTournamentLevel(latestResult.level), season: latestResult.season }
      : undefined;
  const missingQualificationLabel = qualification && qualificationByeCount > 0
    ? `${qualificationByeCount === 1 ? "Il qualificato ha" : "I qualificati hanno"} lasciato la scuola.`
    : qualificationTarget?.level
      ? `Nessun atleta qualificato per il ${TOURNAMENT_DEFINITIONS[qualificationTarget.level].label} anno ${qualificationTarget.season}.`
      : "Nessuna qualificazione disponibile.";
  const participationCount = upcoming?.level === "school"
    ? schoolTournamentEntry.selection.selectedContacts.length
    : delegation.length;
  const participationLabel = upcoming?.level === "school"
    ? schoolTournamentEntry.selection.preliminary
      ? `${participationCount} convocati`
      : `${participationCount} iscritt${participationCount === 1 ? "o" : "i"}`
    : `${participationCount} qualificat${participationCount === 1 ? "o" : "i"}`;

  const yearView = useMemo(
    () => getTournamentYearView(state),
    [state.school.currentMonth, state.school.nextFeeAt, state.tournaments], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const selectedEntry = findEntry(yearView, selectedKey) ?? getDefaultEntry(yearView);
  const labelOf = (entry: YearEntry) => entry.level === "reptile" ? getReptileTournamentName(state) : YEAR_ENTRY_LABEL[entry.level];
  const nextList = delegation.length > 0 ? delegation : officialQualified;
  const nextStandard = upcomingDefinition?.standard ?? 0;
  const barWidth = (value: number) => `${Math.min(100, (value / Math.max(1, nextStandard * 2.4 || 500)) * 100)}%`;
  const nextBody = (
    <div className="tyear-team">
      {nextList.length > 0 ? (
        <>
          <p className="tyear-team-head" aria-hidden="true">
            <span>#</span><span>{upcoming?.level === "school" ? "Convocati" : "Qualificati"}</span><span>Arena</span><span>Stile</span>
          </p>
          <div className="tyear-team-list">
            {nextList.map(({ contact, preparation, visible }, index) => (
              <p key={contact.id}>
                <b>{index + 1}</b>
                <TournamentContactIdentity contact={contact} schoolName={state.school.name} schoolCity={state.school.city} />
                {[preparation.arena, preparation.style].map((value, statIndex) => (
                  <span key={statIndex} className="tyear-stat">
                    {visible ? formatStat(value) : "???"}
                    {visible ? <i><i className={nextStandard && value >= nextStandard ? "is-over" : undefined} style={{ width: barWidth(value) }} /></i> : null}
                  </span>
                ))}
              </p>
            ))}
          </div>
          <p className="tyear-esito">
            <span>{nextStandard ? `In oro chi supera il campo del torneo (${nextStandard})` : "Standard interno: conta la qualità della scuola"}</span>
            <span>{participationLabel}</span>
          </p>
        </>
      ) : (
        <p className="tyear-note">{missingQualificationLabel}</p>
      )}
    </div>
  );

  return (
    <div className="tournament-overview">
      <section className="next-tournament" aria-labelledby="next-tournament-title">
        <div className="next-tournament-name">
          <span className="next-tournament-icon"><Icon name="trophy" /></span>
          <span>
            <small>Prossimo evento</small>
            <strong id="next-tournament-title">{upcomingDefinition?.label ?? "Stagione completata"}</strong>
          </span>
        </div>
        <div className="next-tournament-countdown">
          <small>Inizia tra</small>
          <strong>{upcoming ? formatTournamentCountdown(upcoming.occursAt - now) : "—"}</strong>
          <span>{upcomingDefinition
            ? `${upcomingDefinition.calendarMonth.toString().padStart(2, "0")} ${monthShortLabel[upcomingDefinition.calendarMonth]} · ANNO SCOLASTICO ${upcoming ? getSchoolYear(upcoming.absoluteMonth) : ""}`
            : "Nessun evento in programma"}</span>
        </div>
        <div className="next-tournament-participation">
          <span aria-hidden="true"><Icon name="people" /></span>
          <strong>{participationLabel}</strong>
          <small>{upcoming?.level === "school" && schoolTournamentEntry.selection.preliminary
            ? `su ${schoolTournamentEntry.eligibleCount} idonei · preliminari aggregate`
            : upcomingDefinition
              ? `al ${upcomingDefinition.label}${qualificationByeCount > 0
                  ? ` · ${qualificationByeCount} bye`
                  : ""}`
              : "al prossimo torneo"}</small>
        </div>
      </section>

      <div className="tyear-grid">
        <TournamentYearCalendar
          view={yearView}
          selectedKey={selectedEntry?.key}
          labelOf={labelOf}
          onSelect={(entry) => onSelectEntry(entry.key)}
        />
        {selectedEntry ? (
          <TournamentYearPanel
            entry={selectedEntry}
            previous={Boolean(yearView.previous?.entries.includes(selectedEntry))}
            label={labelOf(selectedEntry)}
            reptileTitle={getReptileTournamentName(state)}
            countdown={upcoming ? formatTournamentCountdown(upcoming.occursAt - now) : undefined}
            nextBody={nextBody}
            onOpenResults={(entry) => onOpenResults(entry.key)}
          />
        ) : null}
      </div>
    </div>
  );
}
