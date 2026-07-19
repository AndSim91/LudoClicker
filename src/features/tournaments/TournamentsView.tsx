import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import { TOURNAMENT_DEFINITIONS, TOURNAMENT_LEVEL_ORDER } from "../../content/tournaments";
import {
  getContactBaseStats,
  getContactPreparation,
  getContactTournamentExperience,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { getGameYear } from "../../game/calendar";
import { getEligibleSchoolContacts } from "../../game/tournamentSimulation";
import type {
  GameState,
  TournamentParticipant,
  TournamentResult,
} from "../../game/types";

type TournamentTab = "season" | "athletes" | "results" | "hall";

const levelShortLabel = {
  school: "Scolastico",
  academy: "Accademico",
  national: "Nazionale",
  champions: "Champion's",
} as const;

function participantName(participant: TournamentParticipant | undefined): string {
  return participant ? `${participant.firstName} ${participant.lastName}` : "—";
}

function conditionLabel(condition: number): string {
  const percentage = condition * 100;
  if (percentage < 80) return "Giornata disastrosa";
  if (percentage < 90) return "In difficoltà";
  if (percentage < 110) return "Prestazione regolare";
  if (percentage < 120) return "In grande forma";
  return "Giornata eccezionale";
}

function ResultSummary({ result }: { result: TournamentResult }) {
  const participants = useMemo(
    () => new Map(result.participants.map((participant) => [participant.id, participant])),
    [result.participants],
  );
  const ownedMatches = result.matches.filter((match) =>
    participants.get(match.participantAId)?.ownedContactId ||
    participants.get(match.participantBId)?.ownedContactId
  );
  const renderPodium = (title: string, podium: TournamentResult["arenaPodium"]) => (
    <section className="tournament-podium">
      <h3>{title}</h3>
      {podium.map((entry) => {
        const participant = participants.get(entry.participantId);
        return (
          <div key={`${entry.discipline}-${entry.position}`}>
            <b>{entry.position}°</b>
            <span className={participant?.rarity === "secret-legendary" ? "secret-legendary" : ""}>
              <strong>{participantName(participant)}</strong>
              <small>{participant?.schoolName}</small>
            </span>
            <em>{entry.discipline === "style" ? entry.score.toFixed(3) : "Arena"}</em>
          </div>
        );
      })}
    </section>
  );
  return (
    <div className="tournament-result-detail">
      <div className="tournament-podium-grid">
        {renderPodium("Podio Arena", result.arenaPodium)}
        {renderPodium("Podio Stile", result.stylePodium)}
      </div>
      <section className="tournament-qualifiers">
        <h3>Sei qualificati complessivi</h3>
        <div>
          {result.qualifiers.map((qualifier) => {
            const participant = participants.get(qualifier.participantId);
            return (
              <span key={qualifier.participantId}>
                <strong>{participantName(participant)}</strong>
                <small>{qualifier.source === "arena" ? "Arena" : "Stile"}{qualifier.repechage ? " · ripescaggio" : ""}</small>
              </span>
            );
          })}
        </div>
      </section>
      <details className="tournament-matches">
        <summary>Incontri della scuola ({ownedMatches.length})</summary>
        <div>
          {ownedMatches.map((match) => {
            const a = participants.get(match.participantAId);
            const b = participants.get(match.participantBId);
            return (
              <article key={match.id}>
                <span><strong>{participantName(a)}</strong><small>{match.styleScoreA.toFixed(3)} Stile</small></span>
                <b>{match.arenaScoreA}–{match.arenaScoreB}</b>
                <span><strong>{participantName(b)}</strong><small>{match.styleScoreB.toFixed(3)} Stile</small></span>
              </article>
            );
          })}
        </div>
      </details>
      <details className="tournament-conditions">
        <summary>Condizione degli atleti della scuola</summary>
        {result.participants.filter((participant) => participant.ownedContactId).map((participant) => (
          <div key={participant.id}>
            <span>{participantName(participant)}</span>
            <strong>{(participant.condition * 100).toFixed(3)}%</strong>
            <small>{conditionLabel(participant.condition)}</small>
          </div>
        ))}
      </details>
    </div>
  );
}

export function TournamentsView({ state }: { state: GameState }) {
  const [tab, setTab] = useState<TournamentTab>("season");
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const eligible = useMemo(() => getEligibleSchoolContacts(state), [state]);
  const latestResult = state.tournaments.results.at(-1);
  const selectedResult = state.tournaments.results.find((result) => result.id === selectedResultId) ??
    latestResult;
  const currentYear = getGameYear(state.school.currentMonth);
  const qualification = state.tournaments.qualification;
  const collaboratorsByContactId = useMemo(
    () => new Map(state.collaborators.map((entry) => [entry.contactId, entry])),
    [state.collaborators],
  );

  return (
    <main className="overview-view tournaments-view">
      <header><Icon name="flag" /><div><h1>Tornei</h1><p>Arena, Stile e stagione competitiva della scuola</p></div></header>
      <div className="people-tabs" role="tablist" aria-label="Sezioni tornei">
        <TabButton active={tab === "season"} onClick={() => setTab("season")}>Stagione</TabButton>
        <TabButton active={tab === "athletes"} onClick={() => setTab("athletes")}>Atleti</TabButton>
        <TabButton active={tab === "results"} onClick={() => setTab("results")}>Risultati</TabButton>
        <TabButton active={tab === "hall"} onClick={() => setTab("hall")}>Albo d'Oro</TabButton>
      </div>

      {tab === "season" ? (
        <div className="tournament-season">
          <section className="season-readiness">
            <div><span>Idonei allo Scolastico</span><strong>{eligible.length}/10</strong></div>
            <p>{eligible.length >= 10
              ? "La scuola è pronta per il prossimo Torneo Scolastico."
              : `Servono ancora ${10 - eligible.length} iscritti attivi con Forma 1.`}</p>
          </section>
          <div className="season-calendar">
            {TOURNAMENT_LEVEL_ORDER.map((level) => {
              const definition = TOURNAMENT_DEFINITIONS[level];
              const completed = [...state.tournaments.results].reverse().find((result) => result.level === level);
              const missed = [...state.tournaments.missedTournaments].reverse().find((entry) => entry.level === level);
              const qualified = qualification?.level === level;
              return (
                <article key={level} className={completed ? "completed" : qualified ? "qualified" : ""}>
                  <time>{definition.calendarMonth.toString().padStart(2, "0")}</time>
                  <span><strong>{definition.label}</strong><small>Standard {definition.standard || "interno"}</small></span>
                  <b>{qualified ? `${qualification.contactIds.length} qualificati` : completed
                    ? `Completato · stagione ${completed.season}` : missed
                      ? "Non disputato" : `In attesa · anno ${currentYear}`}</b>
                </article>
              );
            })}
          </div>
          <section className="qualification-card">
            <h3>Delegazione attuale</h3>
            {qualification ? (
              <><strong>{qualification.contactIds.length} atlet{qualification.contactIds.length === 1 ? "a" : "i"} verso {TOURNAMENT_DEFINITIONS[qualification.level].label}</strong><p>I qualificati sono immuni da qualunque disiscrizione fino alla competizione.</p></>
            ) : <p>Nessuna delegazione qualificata al momento.</p>}
          </section>
        </div>
      ) : null}

      {tab === "athletes" ? (
        <section className="tournament-athletes">
          {eligible.map((contact) => {
            const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
            const visible = hasCompletedCourseX(forms);
            const stats = getContactBaseStats(contact);
            const preparation = getContactPreparation(contact, forms);
            const immune = state.tournaments.immuneContactIds.includes(contact.id);
            return (
              <article key={contact.id} className={contact.secretLegendaryId ? "secret-card" : ""}>
                <div><strong>{contact.firstName} {contact.lastName}</strong><small>{immune ? "Qualificato · immune" : "Disponibile allo Scolastico"}</small></div>
                <dl>
                  <div><dt>Arena</dt><dd>{visible ? `${stats.arena} → ${preparation.arena.toFixed(3)}` : "???"}</dd></div>
                  <div><dt>Stile</dt><dd>{visible ? `${stats.style} → ${preparation.style.toFixed(3)}` : "???"}</dd></div>
                  <div><dt>Esperienza</dt><dd>{getContactTournamentExperience(contact)} · +{Math.min(60, getContactTournamentExperience(contact) * 3)}%</dd></div>
                </dl>
              </article>
            );
          })}
          {eligible.length === 0 ? <p className="empty-tournaments">Nessun iscritto ha ancora completato Forma 1.</p> : null}
        </section>
      ) : null}

      {tab === "results" ? (
        <div className="tournament-results-layout">
          <nav aria-label="Tornei completati">
            {[...state.tournaments.results].reverse().map((result) => (
              <button key={result.id} type="button" className={selectedResult?.id === result.id ? "active" : ""} onClick={() => setSelectedResultId(result.id)}>
                <strong>{levelShortLabel[result.level]}</strong><small>Stagione {result.season} · {result.participants.length} partecipanti</small>
              </button>
            ))}
          </nav>
          {selectedResult ? <ResultSummary result={selectedResult} /> : <p className="empty-tournaments">Nessun torneo disputato.</p>}
        </div>
      ) : null}

      {tab === "hall" ? (
        <section className="tournament-hall">
          {[...state.tournaments.results].reverse().flatMap((result) => {
            const participantMap = new Map(result.participants.map((entry) => [entry.id, entry]));
            return [...result.arenaPodium, ...result.stylePodium].map((entry) => {
              const participant = participantMap.get(entry.participantId);
              return (
                <article key={`${result.id}-${entry.discipline}-${entry.position}`}>
                  <b>{entry.position}°</b>
                  <span><strong>{participantName(participant)}</strong><small>{levelShortLabel[result.level]} · Stagione {result.season} · {entry.discipline === "arena" ? "Arena" : `Stile ${entry.score.toFixed(3)}`}</small></span>
                  <em>{participant?.schoolName}</em>
                </article>
              );
            });
          })}
          {state.tournaments.results.length === 0 ? <p className="empty-tournaments">L'Albo d'Oro è ancora vuoto.</p> : null}
        </section>
      ) : null}
    </main>
  );
}
