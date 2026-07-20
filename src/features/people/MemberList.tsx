import { useMemo, useState } from "react";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { PERSON_RARITIES } from "../../content/rarities";
import { getFormTrainingYear } from "../../game/calendar";
import { getAthleteImmunityStatus } from "../../game/athleteImmunity";
import { getAnnualFormTrainingLimit } from "../../content/upgrades";
import type { Collaborator, Contact, FormId, GameState } from "../../game/types";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { TrainingControl } from "./TrainingControl";
import { formatFormPath, getMemberDepartureRiskLabel } from "./peoplePresentation";
import {
  getContactPreparation,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { getRarityClassName } from "../../shared/rarityPresentation";
import {
  sortMembers,
  type MemberSort,
  type MemberSortKey,
} from "./memberSorting";

const CONTACT_STATUS_LABELS: Record<Contact["status"], string> = {
  available: "Disponibile",
  writing: "In scrittura",
  invited: "Invitato",
  trialScheduled: "Prova prenotata",
  enrolled: "Iscritto",
  departed: "Ha lasciato la scuola",
  lost: "Perso",
};

const MEMBERS_PER_PAGE = 75;

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: MemberSortKey;
  sort: MemberSort | null;
  onSort: (key: MemberSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <span role="columnheader" aria-sort={active ? sort.direction : "none"}>
      <button
        type="button"
        className={`member-sort-button${active ? " is-active" : ""}`}
        aria-label={`Ordina per ${label}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span className="member-sort-indicator" aria-hidden="true">
          {active ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </span>
  );
}

export function MemberList({
  state,
  members,
  collaboratorsByContactId,
  collaboratorsById,
  onStartTraining,
  onToggleFavorite,
}: {
  state: GameState;
  members: Contact[];
  collaboratorsByContactId: Map<string, Collaborator>;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggleFavorite: (contactId: string) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const [sort, setSort] = useState<MemberSort | null>(null);
  const currentMonth = state.school.currentMonth;
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const foundedSchools = state.network.schools.length;
  const immunityContext = useMemo(() => ({
    currentMonth,
    tournamentQualification: state.tournaments.qualification,
  }), [currentMonth, state.tournaments.qualification]);
  const sortContext = useMemo(
    () => ({
      currentTrainingYear: getFormTrainingYear(currentMonth),
      annualTrainingLimit,
      immunityContext,
      foundedSchools,
      collaboratorsByContactId,
    }),
    [
      collaboratorsByContactId,
      currentMonth,
      annualTrainingLimit,
      foundedSchools,
      immunityContext,
    ],
  );
  const sortedMembers = useMemo(
    () => sortMembers(members, sort, sortContext),
    [members, sort, sortContext],
  );
  const pageCount = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
  const page = Math.min(requestedPage, pageCount - 1);
  const firstMember = page * MEMBERS_PER_PAGE;
  const visibleMembers = sortedMembers.slice(firstMember, firstMember + MEMBERS_PER_PAGE);
  const handleSort = (key: MemberSortKey) => {
    setRequestedPage(0);
    setSort((current) =>
      current?.key === key
        ? {
            key,
            direction: current.direction === "ascending" ? "descending" : "ascending",
          }
        : { key, direction: "ascending" },
    );
  };
  const selectSort = (key: MemberSortKey) => {
    setRequestedPage(0);
    setSort((current) => ({
      key,
      direction: current?.key === key ? current.direction : "ascending",
    }));
  };
  const reverseSort = () => {
    setRequestedPage(0);
    setSort((current) => current
      ? {
          ...current,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : current,
    );
  };

  return (
    <section className="people-table member-development-list" aria-label="Iscritti">
      <div className="member-sort-mobile" aria-label="Ordina iscritti">
        <label>
          <span>Ordina per</span>
          <select
            aria-label="Campo di ordinamento"
            value={sort?.key ?? ""}
            onChange={(event) => selectSort(event.target.value as MemberSortKey)}
          >
            <option value="" disabled>Seleziona</option>
            <option value="name">Nome</option>
            <option value="rarity">Rarità</option>
            <option value="path">Percorso</option>
            <option value="arena">Arena</option>
            <option value="style">Stile</option>
            <option value="status">Stato</option>
            <option value="next-form">Prossima Forma</option>
          </select>
        </label>
        <button type="button" disabled={!sort} onClick={reverseSort}>
          {sort?.direction === "descending" ? "Decrescente ↓" : "Crescente ↑"}
        </button>
      </div>
      <div className="people-row people-head member-row">
        <SortableHeader label="Nome" sortKey="name" sort={sort} onSort={handleSort} />
        <SortableHeader label="Rarità" sortKey="rarity" sort={sort} onSort={handleSort} />
        <SortableHeader label="Percorso" sortKey="path" sort={sort} onSort={handleSort} />
        <SortableHeader label="Arena" sortKey="arena" sort={sort} onSort={handleSort} />
        <SortableHeader label="Stile" sortKey="style" sort={sort} onSort={handleSort} />
        <SortableHeader label="Stato" sortKey="status" sort={sort} onSort={handleSort} />
        <SortableHeader
          label="Prossima Forma"
          sortKey="next-form"
          sort={sort}
          onSort={handleSort}
        />
      </div>
      {visibleMembers.map((contact) => {
        const collaborator = collaboratorsByContactId.get(contact.id);
        const memberStudent = collaborator ?? contact;
        const memberForms = memberStudent.forms;
        const immunity = getAthleteImmunityStatus(
          immunityContext,
          contact,
          memberStudent,
          Boolean(collaborator),
        );
        const hasVisibleStats = hasCompletedCourseX(memberForms);
        const preparation = hasVisibleStats
          ? getContactPreparation(contact, memberForms)
          : undefined;
        return (
          <div className="people-row member-row" key={contact.id}>
            <div className="member-name" data-label="Nome">
              <button
                type="button"
                className={`member-favorite${contact.favorite ? " is-favorite" : ""}`}
                aria-label={`${contact.favorite ? "Rimuovi" : "Aggiungi"} ${contact.firstName} ${contact.lastName} ${contact.favorite ? "dai" : "ai"} preferiti`}
                aria-pressed={contact.favorite === true}
                title={contact.favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                onClick={() => onToggleFavorite(contact.id)}
              >
                <span aria-hidden="true">★</span>
              </button>
              <span className="member-identity">
                <PersonName
                  displayName={`${contact.firstName} ${contact.lastName}`}
                  rarity={contact.rarity}
                  secretLegendary={Boolean(contact.secretLegendaryId)}
                />
                <span className={`member-email rarity-address ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}>
                  {contact.email}
                </span>
              </span>
            </div>
            <span data-label="Rarità">
              <strong
                className={`member-rarity rarity-name ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}
              >
                {PERSON_RARITIES[contact.rarity].label}
              </strong>
            </span>
            <div className="member-path" data-label="Percorso">
              <strong>{formatFormPath(memberForms)}</strong>
              <FormLogoStrip
                forms={memberForms}
                instructorForms={collaborator?.instructorForms}
              />
            </div>
            <span className="member-stat" data-label="Arena">
              {preparation ? (
                <OfficialStatValue value={preparation.arena} />
              ) : (
                <span className="member-stat-locked" title="Completa Corso X">???</span>
              )}
            </span>
            <span className="member-stat" data-label="Stile">
              {preparation ? (
                <OfficialStatValue value={preparation.style} />
              ) : (
                <span className="member-stat-locked" title="Completa Corso X">???</span>
              )}
            </span>
            <span className="member-status" data-label="Stato">
              <span>{CONTACT_STATUS_LABELS[contact.status]}</span>
              <small>
                {immunity.message ?? getMemberDepartureRiskLabel(
                  memberForms,
                  contact.rarity,
                  state.network.schools.length,
                )}
              </small>
            </span>
            <div className="member-training-cell" data-label="Prossima Forma">
              {collaborator ? (
                <strong className="member-collaborator-label">Collaboratore</strong>
              ) : (
                <TrainingControl
                  personId={contact.id}
                  displayName={`${contact.firstName} ${contact.lastName}`}
                  student={contact}
                  state={state}
                  collaboratorsById={collaboratorsById}
                  onStartTraining={onStartTraining}
                />
              )}
            </div>
          </div>
        );
      })}
      {pageCount > 1 ? (
        <nav className="list-pagination" aria-label="Pagine iscritti">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setRequestedPage((current) => Math.max(0, current - 1))}
          >
            Precedente
          </button>
          <span>
            Pagina {page + 1} di {pageCount}
          </span>
          <button
            type="button"
            disabled={page === pageCount - 1}
            onClick={() => setRequestedPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Successiva
          </button>
        </nav>
      ) : null}
    </section>
  );
}
