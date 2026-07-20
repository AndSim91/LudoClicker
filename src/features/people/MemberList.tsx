import { useDeferredValue, useMemo, useState } from "react";
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
  getMemberNextFormLabel,
  getMemberStudent,
  getMemberVisibleScore,
  sortMembers,
  type MemberSort,
  type MemberSortContext,
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
type MemberRarityFilter = "all" | Contact["rarity"];

function uniqueSortedOptions(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "it", { numeric: true, sensitivity: "base" })
  );
}

function getDisplayedMemberStatus(
  contact: Contact,
  context: MemberSortContext,
): string {
  const student = getMemberStudent(contact, context);
  const immunity = getAthleteImmunityStatus(
    context.immunityContext,
    contact,
    student,
    context.collaboratorsByContactId.has(contact.id),
  );
  return immunity.message ?? getMemberDepartureRiskLabel(
    student.forms,
    contact.rarity,
    context.foundedSchools,
  );
}

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
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<MemberRarityFilter>("all");
  const [pathFilter, setPathFilter] = useState("all");
  const [arenaMinimum, setArenaMinimum] = useState("");
  const [styleMinimum, setStyleMinimum] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nextFormFilter, setNextFormFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);
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
  const filterOptions = useMemo(() => ({
    paths: uniqueSortedOptions(members.map((contact) =>
      formatFormPath(getMemberStudent(contact, sortContext).forms)
    )),
    statuses: uniqueSortedOptions(members.map((contact) =>
      getDisplayedMemberStatus(contact, sortContext)
    )),
    nextForms: uniqueSortedOptions(members.map((contact) =>
      getMemberNextFormLabel(contact, sortContext) ?? "Nessuna Forma disponibile"
    )),
  }), [members, sortContext]);
  const filteredMembers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    const minimumArena = arenaMinimum === "" ? undefined : Number(arenaMinimum);
    const minimumStyle = styleMinimum === "" ? undefined : Number(styleMinimum);
    return members.filter((contact) => {
      const student = getMemberStudent(contact, sortContext);
      const path = formatFormPath(student.forms);
      const searchableText = `${contact.firstName} ${contact.lastName} ${contact.email}`
        .toLocaleLowerCase("it-IT");
      if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false;
      if (rarityFilter !== "all" && contact.rarity !== rarityFilter) return false;
      if (pathFilter !== "all" && path !== pathFilter) return false;
      if (minimumArena !== undefined) {
        const arena = getMemberVisibleScore(contact, "arena", sortContext);
        if (arena === null || arena < minimumArena) return false;
      }
      if (minimumStyle !== undefined) {
        const style = getMemberVisibleScore(contact, "style", sortContext);
        if (style === null || style < minimumStyle) return false;
      }
      if (
        statusFilter !== "all" &&
        getDisplayedMemberStatus(contact, sortContext) !== statusFilter
      ) return false;
      const nextForm = getMemberNextFormLabel(contact, sortContext) ??
        "Nessuna Forma disponibile";
      if (nextFormFilter !== "all" && nextForm !== nextFormFilter) return false;
      return true;
    });
  }, [
    arenaMinimum,
    deferredSearch,
    members,
    nextFormFilter,
    pathFilter,
    rarityFilter,
    sortContext,
    statusFilter,
    styleMinimum,
  ]);
  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, sort, sortContext),
    [filteredMembers, sort, sortContext],
  );
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
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
  const updateFilter = (update: () => void) => {
    setRequestedPage(0);
    update();
  };
  const resetFilters = () => {
    setSearch("");
    setRarityFilter("all");
    setPathFilter("all");
    setArenaMinimum("");
    setStyleMinimum("");
    setStatusFilter("all");
    setNextFormFilter("all");
    setRequestedPage(0);
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
      <div className="member-filter-row" aria-label="Filtri iscritti">
        <label>
          <span className="sr-only">Cerca iscritto</span>
          <input
            type="search"
            aria-label="Filtra iscritti per nome o email"
            placeholder="Nome o email"
            value={search}
            onChange={(event) => updateFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label>
          <span className="sr-only">Rarità iscritto</span>
          <select
            aria-label="Filtra iscritti per rarità"
            value={rarityFilter}
            onChange={(event) => updateFilter(() => setRarityFilter(event.target.value as MemberRarityFilter))}
          >
            <option value="all">Tutte le rarità</option>
            {Object.entries(PERSON_RARITIES).map(([value, definition]) => (
              <option value={value} key={value}>Rarità: {definition.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Percorso iscritto</span>
          <select
            aria-label="Filtra iscritti per percorso"
            value={pathFilter}
            onChange={(event) => updateFilter(() => setPathFilter(event.target.value))}
          >
            <option value="all">Tutti i percorsi</option>
            {filterOptions.paths.map((path) => (
              <option value={path} key={path}>Percorso: {path}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Arena minima</span>
          <input
            type="number"
            min="0"
            step="0.001"
            aria-label="Filtra iscritti per Arena minima"
            placeholder="Arena min."
            value={arenaMinimum}
            onChange={(event) => updateFilter(() => setArenaMinimum(event.target.value))}
          />
        </label>
        <label>
          <span className="sr-only">Stile minimo</span>
          <input
            type="number"
            min="0"
            step="0.001"
            aria-label="Filtra iscritti per Stile minimo"
            placeholder="Stile min."
            value={styleMinimum}
            onChange={(event) => updateFilter(() => setStyleMinimum(event.target.value))}
          />
        </label>
        <label>
          <span className="sr-only">Stato iscritto</span>
          <select
            aria-label="Filtra iscritti per stato"
            value={statusFilter}
            onChange={(event) => updateFilter(() => setStatusFilter(event.target.value))}
          >
            <option value="all">Tutti gli stati</option>
            {filterOptions.statuses.map((status) => (
              <option value={status} key={status}>Stato: {status}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Prossima Forma</span>
          <select
            aria-label="Filtra iscritti per prossima Forma"
            value={nextFormFilter}
            onChange={(event) => updateFilter(() => setNextFormFilter(event.target.value))}
          >
            <option value="all">Tutte le prossime Forme</option>
            {filterOptions.nextForms.map((nextForm) => (
              <option value={nextForm} key={nextForm}>Prossima: {nextForm}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="member-filter-summary">
        <span>{filteredMembers.length} di {members.length} iscritti</span>
        <button type="button" onClick={resetFilters}>Azzera filtri</button>
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
              {(contact.agonistCourseCompletions ?? 0) > 0 ? (
                <small className="member-agonist-course-message">
                  Eseguito Corso Agonisti | Potenziale totale +{contact.agonistCourseCompletions}
                </small>
              ) : null}
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
      {filteredMembers.length === 0 ? (
        <div className="member-filter-empty">Nessun iscritto corrisponde ai filtri.</div>
      ) : null}
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
