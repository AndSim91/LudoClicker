import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { Icon } from "../../components/common/Icon";
import { FilterChip, FilterGroup, ListFilterBar, type ActiveListFilter } from "../../components/common/ListFilterBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import { FORM_DEFINITIONS } from "../../content/forms";
import { getFormLogo } from "../../content/formLogos";
import { getFormTrainingYear } from "../../game/calendar";
import { getAthleteImmunityStatus } from "../../game/athleteImmunity";
import {
  areAllFormBranchesUnlocked,
  getAnnualFormTrainingLimit,
  getInstructorBranchCapacityBonus,
  isAgonistCourseUnlocked,
  isCourseXUnlocked,
  getDepartureRiskReduction,
  getOfficialStatsVisibilityTier,
} from "../../content/upgrades";
import { useGameStateSlices } from "../../game/GameStateContext";
import { getGroupedMemberCount } from "../../game/memberGroups";
import type {
  Collaborator,
  Contact,
  FormId,
  FormTrainingStartMode,
  GameState,
} from "../../game/types";
import { EnrollmentCancellationDialog } from "./EnrollmentCancellationDialog";
import { FormPathMap } from "./FormPathMap";
import { MemberCard } from "./MemberCard";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { TrainingControl } from "./TrainingControl";
import { formatFormPath, getMemberDepartureRiskLabel } from "./peoplePresentation";
import {
  getContactPreparation,
  hasUnlockedOfficialStats,
  getHiddenStatsHint,
} from "../../game/athleteStats";
import {
  getPresentedRarityLabel,
  getRarityClassName,
} from "../../shared/rarityPresentation";
import {
  matchesRarityFilter,
  RARITY_FILTER_VALUES,
  rarityFilterClassName,
  rarityFilterLabel,
} from "./rarityFilter";
import { toggleValue, usePersistentFilters } from "../../shared/usePersistentFilters";
import { usePersistentTableSort } from "../../shared/usePersistentTableSort";
import { useOutlookTheme } from "../../shared/useOutlookTheme";
import { STORAGE_KEYS } from "../../shared/storageKeys";
import {
  getMemberNextFormLabel,
  getMemberStudent,
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

const MEMBERS_PER_PAGE = 25;
const MEMBER_CARDS_PER_PAGE = 24;
type MemberView = "table" | "cards";

function readMemberView(): MemberView {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.memberView) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
}

function storeMemberView(view: MemberView): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.memberView, view);
  } catch {
    // ponytail: a blocked storage only forgets the choice.
  }
}
const MEMBER_SORT_KEYS = [
  "name",
  "rarity",
  "path",
  "arena",
  "style",
  "status",
  "next-form",
] as const satisfies readonly MemberSortKey[];
const MEMBER_SORT_OPTIONS: { value: MemberSortKey; label: string }[] = [
  { value: "name", label: "Nome" },
  { value: "rarity", label: "Rarità" },
  { value: "path", label: "Percorso" },
  { value: "arena", label: "Arena" },
  { value: "style", label: "Stile" },
  { value: "status", label: "Ruolo" },
  { value: "next-form", label: "Prossimo passo" },
];
const MEMBER_FILTER_DEFAULTS = {
  rarities: [] as string[],
  forms: [] as string[],
  arenaMin: "",
  styleMin: "",
  statuses: [] as string[],
  nextForms: [] as string[],
  favorites: false,
  open: false,
};
type MemberFilters = typeof MEMBER_FILTER_DEFAULTS;
const formName = (formId: string) =>
  FORM_DEFINITIONS.find((form) => form.id === formId)?.longName ?? formId;

function withSelected(options: string[], selected: readonly string[]): string[] {
  return [...options, ...selected.filter((value) => !options.includes(value))];
}

function sortedOptions(values: ReadonlySet<string>): string[] {
  return [...values].sort((left, right) =>
    left.localeCompare(right, "it", { numeric: true, sensitivity: "base" })
  );
}

interface MemberPresentation {
  contact: Contact;
  student: Contact | Collaborator;
  path: string;
  searchableText: string;
  status: string;
  nextForm: string;
  preparation?: ReturnType<typeof getContactPreparation>;
}

function getDisplayedMemberStatus(
  contact: Contact,
  context: MemberSortContext,
  socialUnlocked: boolean,
): string {
  const collaborator = context.collaboratorsByContactId.get(contact.id);
  if (collaborator) {
    if (!collaborator.assignment) return "Collaboratore non assegnato";
    const assignmentLabel = getCollaboratorAssignmentLabel(collaborator.assignment, socialUnlocked);
    return `Collaboratore ${assignmentLabel}`;
  }
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
    context.departureRiskReduction,
  );
}

type MemberPresentationCache = WeakMap<Contact, MemberPresentation>;

function createMemberPresentationReader(
  context: MemberSortContext,
  socialUnlocked: boolean,
  cache: MemberPresentationCache,
): (contact: Contact) => MemberPresentation {
  return (contact) => {
    const student = getMemberStudent(contact, context);
    const cached = cache.get(contact);
    // The student is the collaborator when there is one: a new collaborator
    // object (mastery, training, assignment) rebuilds only that row.
    if (cached?.student === student) return cached;
    const hasVisibleStats = hasUnlockedOfficialStats(student.forms, context.statsTier);
    const presentation: MemberPresentation = {
      contact,
      student,
      path: formatFormPath(student.forms, context.courseXUnlocked),
      searchableText: `${contact.firstName} ${contact.lastName} ${contact.email}`
        .toLocaleLowerCase("it-IT"),
      status: getDisplayedMemberStatus(contact, context, socialUnlocked),
      nextForm: getMemberNextFormLabel(contact, context) ??
        "Nessuna Forma disponibile",
      preparation: hasVisibleStats
        ? getContactPreparation(contact, student.forms)
        : undefined,
    };
    cache.set(contact, presentation);
    return presentation;
  };
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

/** A long address wraps at the «@» first, not in the middle of a word. */
function withBreakAfterAt(email: string) {
  const at = email.indexOf("@");
  return at < 0 ? email : <>{email.slice(0, at)}<wbr />{email.slice(at)}</>;
}

export function MemberList({
  state: stateOverride,
  collaboratorsByContactId,
  collaboratorsById,
  onStartTraining,
  onToggleFavorite,
  onCancelEnrollment,
}: {
  state?: GameState;
  collaboratorsByContactId: Map<string, Collaborator>;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (
    personId: string,
    formId: FormId,
    mode?: FormTrainingStartMode,
  ) => void;
  onToggleFavorite: (contactId: string) => void;
  onCancelEnrollment: (contactId: string) => void;
}) {
  const state = useGameStateSlices(
    ["contacts", "memberGroups", "network", "school", "tournaments", "unlocks", "upgrades"],
    stateOverride,
  );
  const groupedMembers = getGroupedMemberCount(state);
  const members = useMemo(
    () => state.contacts.filter((contact) => contact.status === "enrolled"),
    [state.contacts],
  );
  const [requestedPage, setRequestedPage] = useState(0);
  const [view, setView] = useState<MemberView>(readMemberView);
  const outlook = useOutlookTheme();
  const pageSize = view === "cards" ? MEMBER_CARDS_PER_PAGE : MEMBERS_PER_PAGE;
  const changeView = (next: MemberView) => {
    storeMemberView(next);
    setView(next);
    setRequestedPage(0);
  };
  const {
    sort,
    setSort,
    resetSort,
  } = usePersistentTableSort<MemberSort>({
    storageId: "members",
    allowedKeys: MEMBER_SORT_KEYS,
    defaultSort: null,
  });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = usePersistentFilters<MemberFilters>("members", MEMBER_FILTER_DEFAULTS);
  const [cancellationTarget, setCancellationTarget] = useState<Contact | null>(null);
  const cancellationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deferredSearch = useDeferredValue(search);
  const currentMonth = state.school.currentMonth;
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const foundedSchools = state.network.schoolCount;
  const immunityContext = useMemo(() => ({
    currentMonth,
    tournamentQualification: state.tournaments.qualification,
  }), [currentMonth, state.tournaments.qualification]);
  const sortContext = useMemo(
    () => ({
      currentTrainingYear: getFormTrainingYear(currentMonth),
      annualTrainingLimit,
      agonistCourseUnlocked: isAgonistCourseUnlocked(state.upgrades),
      instructorBranchCapacity: Math.min(
        3,
        1 + getInstructorBranchCapacityBonus(state.upgrades),
      ),
      unrestrictedFormBranches: areAllFormBranchesUnlocked(state.upgrades),
      immunityContext,
      foundedSchools,
      departureRiskReduction: getDepartureRiskReduction(state.upgrades),
      courseXUnlocked,
      statsTier: getOfficialStatsVisibilityTier(state.upgrades),
      collaboratorsByContactId,
    }),
    [
      collaboratorsByContactId,
      currentMonth,
      annualTrainingLimit,
      state.upgrades,
      foundedSchools,
      courseXUnlocked,
      immunityContext,
    ],
  );
  // ponytail: the cache survives the collaborators map, which changes at every tick
  // (mastery); without it the whole member list was rebuilt four times a second.
  const presentationCache = useMemo<MemberPresentationCache>(
    () => new WeakMap(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the cache key
    [currentMonth, annualTrainingLimit, state.upgrades, foundedSchools, courseXUnlocked, immunityContext, state.unlocks.social],
  );
  const getMemberPresentation = useMemo(
    () => createMemberPresentationReader(sortContext, state.unlocks.social, presentationCache),
    [sortContext, state.unlocks.social, presentationCache],
  );
  const memberPresentations = useMemo(
    () => members.map(getMemberPresentation),
    [getMemberPresentation, members],
  );
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const nextForms = new Set<string>();
    const learnedForms = new Set<string>();
    let hasSecretLegendary = false;
    for (const presentation of memberPresentations) {
      statuses.add(presentation.status);
      nextForms.add(presentation.nextForm);
      for (const formId of presentation.student.forms) learnedForms.add(formId);
      if (presentation.contact.secretLegendaryId) hasSecretLegendary = true;
    }
    return {
      // ponytail: a secret rarity shows up only once one is in the school (no spoilers).
      rarities: RARITY_FILTER_VALUES.filter((value) => value !== "secret-legendary" || hasSecretLegendary),
      forms: FORM_DEFINITIONS.map((form) => form.id).filter((formId) => learnedForms.has(formId)),
      statuses: sortedOptions(statuses),
      nextForms: sortedOptions(nextForms),
    };
  }, [memberPresentations]);
  const filteredMembers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    const minimumArena = filters.arenaMin === "" ? undefined : Number(filters.arenaMin);
    const minimumStyle = filters.styleMin === "" ? undefined : Number(filters.styleMin);
    const filtered: Contact[] = [];
    for (const presentation of memberPresentations) {
      const { contact } = presentation;
      if (normalizedSearch && !presentation.searchableText.includes(normalizedSearch)) continue;
      if (filters.favorites && !contact.favorite) continue;
      if (!matchesRarityFilter(filters.rarities, contact.rarity, Boolean(contact.secretLegendaryId))) continue;
      if (!filters.forms.every((formId) => presentation.student.forms.includes(formId as FormId))) continue;
      if (minimumArena !== undefined) {
        const arena = presentation.preparation?.arena ?? null;
        if (arena === null || arena < minimumArena) continue;
      }
      if (minimumStyle !== undefined) {
        const style = presentation.preparation?.style ?? null;
        if (style === null || style < minimumStyle) continue;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(presentation.status)) continue;
      if (filters.nextForms.length > 0 && !filters.nextForms.includes(presentation.nextForm)) continue;
      filtered.push(contact);
    }
    return filtered;
  }, [deferredSearch, filters, memberPresentations]);
  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, sort, sortContext),
    [filteredMembers, sort, sortContext],
  );
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const firstMember = page * pageSize;
  const visibleMembers = sortedMembers.slice(firstMember, firstMember + pageSize);
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
  const selectSort = (key: MemberSortKey | null) => {
    setRequestedPage(0);
    if (!key) {
      resetSort();
      return;
    }
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
  const updateFilters = (patch: Partial<MemberFilters>) => {
    setRequestedPage(0);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const toggleIn = (key: "rarities" | "forms" | "statuses" | "nextForms", value: string) => {
    setRequestedPage(0);
    setFilters((current) => ({ ...current, [key]: toggleValue(current[key], value) }));
  };
  const resetFilters = () => {
    setSearch("");
    updateFilters({ ...MEMBER_FILTER_DEFAULTS, open: filters.open });
  };
  const activeFilters: ActiveListFilter[] = [
    ...filters.rarities.map((value) => ({
      key: `rarity-${value}`,
      label: rarityFilterLabel(value),
      className: rarityFilterClassName(value),
      onRemove: () => toggleIn("rarities", value),
    })),
    ...filters.forms.map((formId) => ({
      key: `form-${formId}`,
      label: formName(formId),
      onRemove: () => toggleIn("forms", formId),
    })),
    ...(filters.arenaMin !== ""
      ? [{ key: "arena", label: `Arena ≥ ${filters.arenaMin}`, onRemove: () => updateFilters({ arenaMin: "" }) }]
      : []),
    ...(filters.styleMin !== ""
      ? [{ key: "style", label: `Stile ≥ ${filters.styleMin}`, onRemove: () => updateFilters({ styleMin: "" }) }]
      : []),
    ...filters.statuses.map((value) => ({
      key: `status-${value}`,
      label: value,
      onRemove: () => toggleIn("statuses", value),
    })),
    ...filters.nextForms.map((value) => ({
      key: `next-${value}`,
      label: value,
      onRemove: () => toggleIn("nextForms", value),
    })),
  ];
  const filtering = filteredMembers.length !== members.length;
  const closeCancellationDialog = useCallback(() => {
    cancellationTriggerRef.current?.focus();
    setCancellationTarget(null);
  }, []);
  const confirmCancellation = useCallback(() => {
    if (!cancellationTarget) return;
    const contactId = cancellationTarget.id;
    setCancellationTarget(null);
    onCancelEnrollment(contactId);
  }, [cancellationTarget, onCancelEnrollment]);

  return (
    <section className={`people-table member-development-list${view === "cards" ? " is-cards" : ""}`} aria-label="Iscritti">
      <ListFilterBar
        id="members"
        noun="iscritti"
        search={search}
        searchLabel="Filtra iscritti per nome o email"
        onSearch={(value) => {
          setRequestedPage(0);
          setSearch(value);
        }}
        favorites={{ active: filters.favorites, onToggle: () => updateFilters({ favorites: !filters.favorites }) }}
        drawerOpen={filters.open}
        onToggleDrawer={() => setFilters((current) => ({ ...current, open: !current.open }))}
        activeFilters={activeFilters}
        onResetFilters={resetFilters}
        sortOptions={MEMBER_SORT_OPTIONS}
        sort={sort}
        onSortChange={selectSort}
        onReverseSort={reverseSort}
        count={
          <>
            {filtering
              ? <><strong>{filteredMembers.length.toLocaleString("it-IT")}</strong> di {members.length.toLocaleString("it-IT")} iscritti</>
              : <><strong>{members.length.toLocaleString("it-IT")}</strong> iscritti</>}
            {groupedMembers > 0 ? (
              <span title="Ancora senza scheda: nome e storia arrivano al primo corso.">
                {" "}+ {groupedMembers.toLocaleString("it-IT")} senza scheda
              </span>
            ) : null}
          </>
        }
        extra={
          <span className="member-view-switch" role="group" aria-label="Vista degli iscritti">
            <button type="button" aria-pressed={view === "table"} onClick={() => changeView("table")}>
              <Icon name="menu" />Tabella
            </button>
            <button type="button" aria-pressed={view === "cards"} onClick={() => changeView("cards")}>
              <Icon name="tasks" />Schede
            </button>
          </span>
        }
      >
        <FilterGroup label="Rarità">
          {filterOptions.rarities.map((value) => (
            <FilterChip
              key={value}
              className={rarityFilterClassName(value)}
              pressed={filters.rarities.includes(value)}
              onToggle={() => toggleIn("rarities", value)}
            >
              {rarityFilterLabel(value)}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Forme imparate">
          {withSelected(filterOptions.forms, filters.forms).map((formId) => (
            <FilterChip
              key={formId}
              className="is-form"
              title={formName(formId)}
              pressed={filters.forms.includes(formId)}
              onToggle={() => toggleIn("forms", formId)}
            >
              <img src={getFormLogo(formId as FormId).assetPath} alt="" />
              {FORM_DEFINITIONS.find((form) => form.id === formId)?.shortName ?? formId}
            </FilterChip>
          ))}
          {filterOptions.forms.length === 0 ? <span className="list-filter-empty">Ancora nessuna Forma imparata</span> : null}
        </FilterGroup>
        <div className="list-filter-group" role="group" aria-label="Arena e Stile minimi">
          <small>Arena e Stile minimi</small>
          <div className="list-filter-chips">
            <label className="list-filter-number">
              <span>Arena ≥</span>
              <input
                type="number"
                min="0"
                aria-label="Filtra iscritti per Arena minima"
                value={filters.arenaMin}
                onChange={(event) => updateFilters({ arenaMin: event.target.value })}
              />
            </label>
            <label className="list-filter-number">
              <span>Stile ≥</span>
              <input
                type="number"
                min="0"
                aria-label="Filtra iscritti per Stile minimo"
                value={filters.styleMin}
                onChange={(event) => updateFilters({ styleMin: event.target.value })}
              />
            </label>
          </div>
        </div>
        <FilterGroup label="Ruolo" wide>
          {withSelected(filterOptions.statuses, filters.statuses).map((value) => (
            <FilterChip key={value} pressed={filters.statuses.includes(value)} onToggle={() => toggleIn("statuses", value)}>
              {value}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Prossimo passo" wide>
          {withSelected(filterOptions.nextForms, filters.nextForms).map((value) => (
            <FilterChip key={value} pressed={filters.nextForms.includes(value)} onToggle={() => toggleIn("nextForms", value)}>
              {value}
            </FilterChip>
          ))}
        </FilterGroup>
      </ListFilterBar>
      <div className="people-row people-head member-row">
        <SortableHeader label="Nome" sortKey="name" sort={sort} onSort={handleSort} />
        <SortableHeader label="Rarità" sortKey="rarity" sort={sort} onSort={handleSort} />
        <SortableHeader label="Percorso" sortKey="path" sort={sort} onSort={handleSort} />
        <SortableHeader label="Arena" sortKey="arena" sort={sort} onSort={handleSort} />
        <SortableHeader label="Stile" sortKey="style" sort={sort} onSort={handleSort} />
        <SortableHeader label="Ruolo" sortKey="status" sort={sort} onSort={handleSort} />
        <SortableHeader
          label="Prossimo passo"
          sortKey="next-form"
          sort={sort}
          onSort={handleSort}
        />
        <span className="member-actions-header" aria-hidden="true" />
      </div>
      <div className={view === "cards" ? "member-card-grid" : "member-table-rows"}>
      {visibleMembers.map((contact) => {
        const presentation = getMemberPresentation(contact);
        const collaborator = collaboratorsByContactId.get(contact.id);
        const memberStudent = presentation.student;
        const memberForms = memberStudent.forms;
        const preparation = presentation.preparation;
        const favoriteButton = (
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
        );
        const cancelButton = (
          <button
            type="button"
            className="member-cancel-enrollment"
            aria-label={contact.favorite
              ? `Iscrizione protetta per ${contact.firstName} ${contact.lastName}: atleta preferito`
              : `Annulla l'iscrizione di ${contact.firstName} ${contact.lastName}`}
            title={contact.favorite
              ? "Rimuovi l'atleta dai preferiti per annullare l'iscrizione"
              : "Annulla iscrizione"}
            disabled={contact.favorite === true}
            onClick={(event) => {
              cancellationTriggerRef.current = event.currentTarget;
              setCancellationTarget(contact);
            }}
          >
            <Icon name="close" />
          </button>
        );
        const training = (
          <>
            <TrainingControl
              personId={collaborator?.id ?? contact.id}
              displayName={`${contact.firstName} ${contact.lastName}`}
              student={memberStudent}
              state={stateOverride}
              collaboratorsById={collaboratorsById}
              onStartTraining={onStartTraining}
              variant="roster"
              trainingMode="student-only"
            />
            {(contact.agonistCourseCompletions ?? 0) > 0 ? (
              <small className="member-agonist-course-message">
                Potenziale totale +{
                  (contact.agonistCourseArenaBonus ?? contact.agonistCourseCompletions ?? 0) +
                  (contact.agonistCourseStyleBonus ?? contact.agonistCourseCompletions ?? 0)
                }
              </small>
            ) : null}
          </>
        );
        if (view === "cards") {
          return (
            <MemberCard
              key={contact.id}
              contact={contact}
              forms={memberForms}
              pathMap={!outlook}
              collaborator={collaborator}
              path={presentation.path}
              status={presentation.status}
              preparation={preparation}
              hiddenStatsHint={getHiddenStatsHint(sortContext.statsTier)}
              favoriteButton={favoriteButton}
              cancelButton={cancelButton}
              training={training}
            />
          );
        }
        return (
          <div
            className={`people-row member-row ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}
            key={contact.id}
          >
            <div className="member-name" data-label="Nome">
              {favoriteButton}
              <span className="member-identity">
                <PersonName
                  displayName={`${contact.firstName} ${contact.lastName}`}
                  rarity={contact.rarity}
                  secretLegendary={Boolean(contact.secretLegendaryId)}
                />
                <span className={`member-email rarity-address ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}>
                  {withBreakAfterAt(contact.email)}
                </span>
              </span>
            </div>
            <span className="member-rarity-cell" data-label="Rarità">
              <strong
                className={`member-rarity rarity-name ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}`}
              >
                {getPresentedRarityLabel(
                  contact.rarity,
                  Boolean(contact.secretLegendaryId),
                )}
              </strong>
            </span>
            <div className="member-path" data-label="Percorso">
              {/* Onde: la mappa basta, il nome resta nel tooltip e nel filtro (06/10). */}
              {outlook ? <strong>{presentation.path}</strong> : null}
              {outlook ? (
                <FormLogoStrip
                  forms={memberForms}
                  instructorForms={collaborator?.instructorForms}
                  technicianForms={collaborator?.technicianForms}
                />
              ) : (
                <FormPathMap
                  forms={memberForms}
                  instructorForms={collaborator?.instructorForms}
                  technicianForms={collaborator?.technicianForms}
                />
              )}
            </div>
            <span className="member-stat" data-label="Arena">
              {preparation ? (
                <OfficialStatValue value={preparation.arena} />
              ) : (
                <span className="member-stat-locked" title={getHiddenStatsHint(sortContext.statsTier)}>???</span>
              )}
            </span>
            <span className="member-stat" data-label="Stile">
              {preparation ? (
                <OfficialStatValue value={preparation.style} />
              ) : (
                <span className="member-stat-locked" title={getHiddenStatsHint(sortContext.statsTier)}>???</span>
              )}
            </span>
            <span className="member-status" data-label="Ruolo">
              {/* Every row here is an active member: only other states are worth a word. */}
              {contact.status === "enrolled" ? null : <span>{CONTACT_STATUS_LABELS[contact.status]}</span>}
              <small>{presentation.status}</small>
            </span>
            <div className="member-training-cell" data-label="Prossimo passo">
              {training}
            </div>
            {cancelButton}
          </div>
        );
      })}
      </div>
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
      {cancellationTarget ? (
        <EnrollmentCancellationDialog
          contact={cancellationTarget}
          onClose={closeCancellationDialog}
          onConfirm={confirmCancellation}
        />
      ) : null}
    </section>
  );
}
