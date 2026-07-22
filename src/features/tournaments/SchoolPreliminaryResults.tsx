import { useMemo, type CSSProperties } from "react";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { PERSON_RARITIES } from "../../content/rarities";
import type {
  FormId,
  SchoolTournamentPreliminary,
  TournamentParticipant,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { FormLogoStrip } from "../people/PersonPresentation";
import { participantName } from "./tournamentPresentation";

interface SchoolPreliminaryResultsProps {
  preliminary: SchoolTournamentPreliminary;
  participants: readonly TournamentParticipant[];
  knownFormsByContactId: ReadonlyMap<string, readonly FormId[]>;
}

interface PreliminaryRankingProps {
  discipline: "arena" | "style";
  participantIds: readonly string[];
  participantByContactId: ReadonlyMap<string, TournamentParticipant>;
  knownFormsByContactId: ReadonlyMap<string, readonly FormId[]>;
}

const MAX_FORM_LOGOS_PER_ROW = 8;

function getParticipantKnownForms(
  participant: TournamentParticipant,
  knownFormsByContactId: ReadonlyMap<string, readonly FormId[]>,
): readonly FormId[] | undefined {
  return (
    participant.knownFormIds ??
    (participant.ownedContactId
      ? knownFormsByContactId.get(participant.ownedContactId)
      : undefined)
  );
}

function PreliminaryRanking({
  discipline,
  participantIds,
  participantByContactId,
  knownFormsByContactId,
}: PreliminaryRankingProps) {
  const label = discipline === "arena" ? "Arena" : "Stile";
  const entries = participantIds.flatMap((contactId) => {
    const participant = participantByContactId.get(contactId);
    return participant ? [participant] : [];
  });
  const titleId = `preliminary-${discipline}-title`;
  const largestFormCount = entries.reduce(
    (largest, participant) =>
      Math.max(largest, getParticipantKnownForms(participant, knownFormsByContactId)?.length ?? 0),
    0,
  );
  const tableStyle = {
    "--preliminary-form-columns": Math.max(
      1,
      Math.min(largestFormCount, MAX_FORM_LOGOS_PER_ROW),
    ),
  } as CSSProperties;

  return (
    <section
      className={`preliminary-ranking is-${discipline}`}
      aria-labelledby={titleId}
      style={tableStyle}
    >
      <header>
        <span aria-hidden="true">{discipline === "arena" ? "A" : "S"}</span>
        <div>
          <h3 id={titleId}>Qualificati per {label}</h3>
          <small>{entries.length} posti assegnati</small>
        </div>
      </header>
      <div className="preliminary-table-wrap">
        <table className="preliminary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Atleta</th>
              <th>Rarit&agrave;</th>
              <th>Forme</th>
              <th>{label}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((participant, index) => {
              const knownForms = getParticipantKnownForms(participant, knownFormsByContactId);

              return (
                <tr key={participant.id}>
                  <td>{index + 1}</td>
                  <th scope="row">
                    <strong>{participantName(participant)}</strong>
                    <small>Qualificazione {label}</small>
                  </th>
                  <td>
                    <span
                      className={`preliminary-rarity rarity-name ${
                        participant.rarity === "secret-legendary"
                          ? "rarity-secret-legendary"
                          : getRarityClassName(participant.rarity)
                      }`}
                    >
                      {participant.rarity === "secret-legendary"
                        ? "Leggendario Segreto"
                        : PERSON_RARITIES[participant.rarity].label}
                    </span>
                  </td>
                  <td>
                    <div className="preliminary-forms">
                      {knownForms ? (
                        <FormLogoStrip forms={[...knownForms]} showLabels={false} />
                      ) : (
                        <span aria-label="Forme non disponibili">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <OfficialStatValue
                      value={
                        discipline === "arena"
                          ? participant.arenaPreparation
                          : participant.stylePreparation
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SchoolPreliminaryResults({
  preliminary,
  participants,
  knownFormsByContactId,
}: SchoolPreliminaryResultsProps) {
  const participantByContactId = useMemo(
    () =>
      new Map(
        participants.flatMap((participant) =>
          participant.ownedContactId ? [[participant.ownedContactId, participant] as const] : [],
        ),
      ),
    [participants],
  );
  const selectedCount = preliminary.selectedContactIds.length;
  const excludedCount = Math.max(0, preliminary.eligibleCount - selectedCount);

  return (
    <div className="school-preliminary-results">
      <section className="preliminary-summary" aria-labelledby="preliminary-summary-title">
        <div>
          <small>Selezione automatica</small>
          <h2 id="preliminary-summary-title">Risultati delle preliminari</h2>
          <p>I valori mostrati sono quelli effettivi registrati al momento del torneo.</p>
        </div>
        <dl>
          <div>
            <dt>Idonei</dt>
            <dd>{preliminary.eligibleCount}</dd>
          </div>
          <div>
            <dt>Qualificati</dt>
            <dd>{selectedCount}</dd>
          </div>
          <div>
            <dt>Esclusi</dt>
            <dd>{excludedCount}</dd>
          </div>
        </dl>
      </section>

      <div className="preliminary-rankings">
        <PreliminaryRanking
          discipline="arena"
          participantIds={preliminary.arenaSelectedContactIds}
          participantByContactId={participantByContactId}
          knownFormsByContactId={knownFormsByContactId}
        />
        <PreliminaryRanking
          discipline="style"
          participantIds={preliminary.styleSelectedContactIds}
          participantByContactId={participantByContactId}
          knownFormsByContactId={knownFormsByContactId}
        />
      </div>
    </div>
  );
}
