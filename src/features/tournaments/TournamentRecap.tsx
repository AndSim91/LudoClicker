import { useMemo } from "react";
import { TOURNAMENT_DEFINITIONS, getNextTournamentLevel } from "../../content/tournaments";
import type { TournamentResult } from "../../game/types";
import { formatCurrency, formatVote } from "../../shared/formatters";
import { TournamentParticipantIdentity } from "./TournamentAthleteIdentity";
import { participantName } from "./tournamentPresentation";
import { qualificationDestination, summarizeTournament, type OwnedBest } from "./tournamentRecap";

const MAX_QUALIFIER_PILLS = 4;

/** Panoramica, right panel (concept R1, 13/10/2026): the selected calendar row's tournament at a glance. */
export function TournamentRecap({
  result,
  previousSeason,
  onOpenDetails,
}: {
  result: TournamentResult;
  previousSeason: boolean;
  onOpenDetails: () => void;
}) {
  const summary = useMemo(() => summarizeTournament(result), [result]);
  const byId = useMemo(() => new Map(result.participants.map((p) => [p.id, p])), [result.participants]);
  const definition = TOURNAMENT_DEFINITIONS[result.level];
  const team = summary.ownedCount === 0
    ? "Nessun nostro atleta in gara"
    : summary.allOwned
      ? `${summary.ownedCount} atleti, tutti della scuola`
      : [
          `${summary.ownedCount} in gara`,
          result.groupStandings.length > 0 ? `${summary.pastGroups} oltre i gironi` : "",
          `${summary.onPodium} sul podio`,
        ].filter(Boolean).join(" · ");
  const extraQualifiers = summary.ownedQualifierIds.length - MAX_QUALIFIER_PILLS;
  const best = (title: string, entry: OwnedBest | undefined) => (
    <div>
      <span>{title}</span>
      <strong className={entry?.podium ? "is-podium" : ""}>{entry?.label ?? "—"}</strong>
      <small>
        {entry ? participantName(byId.get(entry.participantId)) : "Nessun nostro atleta"}
        {entry?.styleScore !== undefined ? ` · ${formatVote(entry.styleScore)}` : ""}
      </small>
    </div>
  );
  return (
    <section className="tournament-recap" aria-labelledby="tournament-recap-title">
      <header>
        <small>{previousSeason ? "Stagione precedente" : "Resoconto"}</small>
        <h2 id="tournament-recap-title">{definition.label}</h2>
        <span>Stagione {result.season} · {result.participants.length} partecipanti</span>
      </header>
      <div className="tournament-recap-best">
        {best("I nostri · Arena", summary.arena)}
        {best("I nostri · Stile", summary.style)}
      </div>
      <dl className="tournament-recap-facts">
        <div><dt>Squadra</dt><dd>{team}</dd></div>
        <div>
          <dt>Vincitori</dt>
          <dd>
            <TournamentParticipantIdentity participant={summary.arenaWinnerId ? byId.get(summary.arenaWinnerId) : undefined} />
            <TournamentParticipantIdentity participant={summary.styleWinnerId ? byId.get(summary.styleWinnerId) : undefined} />
          </dd>
        </div>
        {summary.hasNextLevel ? (
          <div>
            <dt>Qualificati</dt>
            <dd>
              <span>{summary.ownedQualifierIds.length} {qualificationDestination(getNextTournamentLevel(result.level))}</span>
              {summary.ownedQualifierIds.length > 0 ? (
                <span className="tournament-recap-pills">
                  {summary.ownedQualifierIds.slice(0, MAX_QUALIFIER_PILLS).map((id) => (
                    <i key={id}>{participantName(byId.get(id))}</i>
                  ))}
                  {extraQualifiers > 0 ? <i>+{extraQualifiers}</i> : null}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Premi</dt>
          <dd>
            {summary.euros > 0 || summary.followers > 0
              ? [summary.euros > 0 ? `+${formatCurrency(summary.euros)}` : "", summary.followers > 0 ? `+${summary.followers} follower` : ""]
                  .filter(Boolean).join(" · ")
              : "Nessun premio"}
          </dd>
        </div>
      </dl>
      <footer>
        <small>Completato · stagione {result.season}</small>
        <button type="button" onClick={onOpenDetails}>Apri dettagli</button>
      </footer>
    </section>
  );
}
