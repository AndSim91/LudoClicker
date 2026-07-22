import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import {
  TOURNAMENT_DEFINITIONS,
  TOURNAMENT_LEVEL_ORDER,
  getNextTournamentLevel,
} from "../../content/tournaments";
import {
  getContactPreparation,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import {
  getEligibleSchoolContactsFromRoster,
  selectSchoolTournamentEntrantsFromRoster,
} from "../../game/tournamentSimulation";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState, TournamentResult } from "../../game/types";
import {
  findUpcomingTournament,
  formatTournamentCountdown,
  getResultForLevelAndSeason,
  getUpcomingDelegationContactIds,
  monthShortLabel,
} from "./tournamentPresentation";

interface TournamentOverviewProps {
  state: GameState;
  onOpenResult: (result: TournamentResult) => void;
}

export function TournamentOverview({ state, onOpenResult }: TournamentOverviewProps) {
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
  const teamEntryByContactId = useMemo(() => new Map(
    state.contacts.map((contact) => {
      const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
      const preparation = getContactPreparation(contact, forms);
      const visible = hasCompletedCourseX(forms);
      return [contact.id, { contact, preparation, visible }] as const;
    }),
  ), [collaboratorsByContactId, state.contacts]);
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
            ? `${upcomingDefinition.calendarMonth.toString().padStart(2, "0")} ${monthShortLabel[upcomingDefinition.calendarMonth]} · STAGIONE ${upcoming?.season}`
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

      <div className="tournament-overview-grid">
        <section className="season-schedule" aria-labelledby="season-schedule-title">
          <h2 id="season-schedule-title">Calendario della stagione</h2>
          <div className="season-schedule-head" aria-hidden="true">
            <span>Mese</span><span>Torneo</span><span>Stato</span><span>Standard</span><span>Progresso stagione</span>
          </div>
          {TOURNAMENT_LEVEL_ORDER.map((level, levelIndex) => {
            const definition = TOURNAMENT_DEFINITIONS[level];
            const completed = upcoming
              ? getResultForLevelAndSeason(state.tournaments.results, level, upcoming.season)
              : undefined;
            const missed = [...state.tournaments.missedTournaments]
              .reverse()
              .find((entry) => entry.level === level && entry.season === upcoming?.season);
            const isNext = upcoming?.level === level;
            const isQualified = qualification?.level === level && qualification.season === upcoming?.season;
            const status = completed
              ? `Completato · stagione ${completed.season}`
              : missed
                ? "Non disputato"
                : isNext
                  ? "Torneo in arrivo"
                  : isQualified
                    ? `${qualification.contactIds.length} qualificati`
                    : "In attesa";
            const rowClass = [
              "season-schedule-row",
              completed ? "is-completed" : "",
              isNext ? "is-next" : "",
              completed ? "is-clickable" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={level}
                type="button"
                className={rowClass}
                disabled={!completed}
                onClick={() => completed && onOpenResult(completed)}
                aria-label={completed ? `Apri i risultati di ${definition.label}, stagione ${completed.season}` : undefined}
              >
                <time><strong>{definition.calendarMonth.toString().padStart(2, "0")}</strong><small>{monthShortLabel[definition.calendarMonth]}</small></time>
                <span className="schedule-name"><strong>{definition.label}</strong></span>
                <span className="schedule-status"><i aria-hidden="true" />{status}</span>
                <span className="schedule-standard">{definition.standard ? `Standard ${definition.standard}` : "Standard interno"}</span>
                <span className="schedule-progress" aria-label={`Tappa ${levelIndex + 1} di ${TOURNAMENT_LEVEL_ORDER.length}`}>
                  {TOURNAMENT_LEVEL_ORDER.map((entry, index) => <i key={entry} className={index <= levelIndex && (completed || isNext) ? "active" : ""} />)}
                </span>
              </button>
            );
          })}
        </section>

        <section className="qualified-team" aria-labelledby="qualified-team-title">
          <header><h2 id="qualified-team-title">Qualificati</h2><span>{officialQualified.length} atlet{officialQualified.length === 1 ? "a" : "i"}{qualificationByeCount > 0 ? ` · ${qualificationByeCount} bye` : ""}</span></header>
          {officialQualified.length > 0 && qualification ? (
            <>
              <div className="qualified-team-head" aria-hidden="true"><span>#</span><span>Atleta</span><span>Arena</span><span>Stile</span></div>
              <div className="qualified-team-list">
                {officialQualified.map(({ contact, preparation, visible }, index) => (
                  <div key={contact.id}>
                    <b>{index + 1}</b>
                    <span>
                      <strong>{contact.firstName} {contact.lastName}</strong>
                      <small>{TOURNAMENT_DEFINITIONS[qualification.level].label} · anno {qualification.season}</small>
                    </span>
                    <strong>{visible ? preparation.arena.toFixed(3) : "???"}</strong>
                    <strong>{visible ? preparation.style.toFixed(3) : "???"}</strong>
                  </div>
                ))}
              </div>
              <footer>
                <strong>Media squadra</strong>
                <span>{officialQualified.some((entry) => !entry.visible) ? "???" : (officialQualified.reduce((sum, entry) => sum + entry.preparation.arena, 0) / officialQualified.length).toFixed(3)}</span>
                <span>{officialQualified.some((entry) => !entry.visible) ? "???" : (officialQualified.reduce((sum, entry) => sum + entry.preparation.style, 0) / officialQualified.length).toFixed(3)}</span>
              </footer>
            </>
          ) : (
            <div className="qualified-team-empty">
              <span aria-hidden="true"><Icon name="trophy" /></span>
              <strong>{missingQualificationLabel}</strong>
              <p>{qualificationByeCount > 0
                ? "Il torneo verrà disputato mantenendo i relativi posti vacanti."
                : "In attesa del prossimo Torneo Scolastico."}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
