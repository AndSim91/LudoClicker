import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { FilterChip, FilterGroup, ListFilterBar, type ActiveListFilter } from "../../components/common/ListFilterBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  COLLABORATOR_MASTERY_LEVELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasUnlockedOfficialStats } from "../../game/athleteStats";
import {
  isCourseXUnlocked,
  isSISTechnicianCourseUnlocked,
  getOfficialStatsVisibilityTier,
} from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime } from "../../game/GameTimeContext";
import {
  selectActiveEmail,
  selectAthleticPreparationInstructorIds,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { toggleValue, usePersistentFilters } from "../../shared/usePersistentFilters";
import { usePersistentTableSort } from "../../shared/usePersistentTableSort";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import {
  sortSectorCollaborators,
  type SectorCollaboratorSort,
  type SectorCollaboratorSortKey,
} from "./collaboratorSorting";
import { getInstructorTeachingEntries } from "./instructorGroupPresentation";
import { StaffForms } from "./FormPathMap";
import { PersonName } from "./PersonPresentation";
import {
  matchesRarityFilter,
  RARITY_FILTER_VALUES,
  rarityFilterClassName,
  rarityFilterLabel,
} from "./rarityFilter";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";
import { SectorStatisticsSummary } from "./SectorStatisticsSummary";
import {
  InstructorCompactActivity,
  InstructorQualificationTraining,
  InstructorTechnicianTraining,
} from "./TrainingControl";

const SECTOR_FILTER_DEFAULTS = {
  rarities: [] as string[],
  mastery: [] as string[],
  activity: [] as string[],
  training: [] as string[],
  open: false,
};
type SectorFilters = typeof SECTOR_FILTER_DEFAULTS;
const ACTIVITY_LABELS: Record<string, string> = {
  active: "Con allievi o preparazione",
  waiting: "In attesa",
};
const TRAINING_LABELS: Record<string, string> = {
  active: "Formazione in corso",
  reserved: "Corso Tecnico prenotato",
  available: "Nessuna formazione",
};
const SORT_LABELS: Record<SectorCollaboratorSortKey, string> = {
  name: "Collaboratore",
  mastery: "Maestria",
  activity: "Attività",
  arena: "Arena",
  style: "Stile",
  forms: "Forme",
  "instructor-training": "Formazione Istruttore",
  "technician-training": "Formazione Tecnici",
};
const SECTOR_SORT_KEYS = [
  "name",
  "mastery",
  "activity",
  "arena",
  "style",
  "forms",
] as const satisfies readonly SectorCollaboratorSortKey[];
const INSTRUCTOR_SORT_KEYS = [
  ...SECTOR_SORT_KEYS,
  "instructor-training",
] as const satisfies readonly SectorCollaboratorSortKey[];
const INSTRUCTOR_TECHNICIAN_SORT_KEYS = [
  ...INSTRUCTOR_SORT_KEYS,
  "technician-training",
] as const satisfies readonly SectorCollaboratorSortKey[];

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function SectorSortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SectorCollaboratorSortKey;
  sort: SectorCollaboratorSort | null;
  onSort: (key: SectorCollaboratorSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <span role="columnheader" aria-sort={active ? sort.direction : "none"}>
      <button
        type="button"
        className={`sector-roster-sort-button${active ? " is-active" : ""}`}
        aria-label={`Ordina collaboratori per ${label}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span aria-hidden="true">
          {active ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </span>
  );
}

function SectorIdentitySortableHeader({
  sort,
  onSort,
}: {
  sort: SectorCollaboratorSort | null;
  onSort: (key: SectorCollaboratorSortKey) => void;
}) {
  const options: Array<{ label: string; sortKey: SectorCollaboratorSortKey }> = [
    { label: "Collaboratore", sortKey: "name" },
    { label: "Arena", sortKey: "arena" },
    { label: "Stile", sortKey: "style" },
    { label: "Forme", sortKey: "forms" },
  ];
  const active = options.some(({ sortKey }) => sort?.key === sortKey);
  return (
    <span
      className="sector-roster-identity-sort"
      role="columnheader"
      aria-sort={active ? sort?.direction : "none"}
    >
      {options.map(({ label, sortKey }) => {
        const optionActive = sort?.key === sortKey;
        return (
          <button
            type="button"
            className={`sector-roster-sort-button${optionActive ? " is-active" : ""}`}
            aria-label={`Ordina collaboratori per ${label}`}
            onClick={() => onSort(sortKey)}
            key={sortKey}
          >
            <span>{label}</span>
            <span aria-hidden="true">
              {optionActive ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
            </span>
          </button>
        );
      })}
    </span>
  );
}

function SectorCollaboratorRow({
  state: stateOverride,
  collaborator,
  contact,
  now,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  showTechnicianTraining,
  onOpen,
}: {
  state?: GameState;
  collaborator: Collaborator;
  contact?: Contact;
  now: number;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  showTechnicianTraining: boolean;
  onOpen: () => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "gadgets",
      "player",
      "school",
      "statistics",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const activeEmail = selectActiveEmail(state);
  const automation = collaborator.assignment === "instructor"
    ? undefined
    : getCollaboratorAutomationPresentation({
        state,
        collaboratorId: collaborator.id,
        assignment: collaborator.assignment,
        now,
        activeEmail,
      });
  const activity = {
    title: automation?.title ?? "In attesa",
    detail: automation?.detail ?? "Nessuna attività in corso",
  };
  const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
  const masteryProgress = getCollaboratorMasteryProgress(
    mastery[collaborator.assignment ?? "instructor"],
  );
  const officialStats = contact && hasUnlockedOfficialStats(collaborator.forms, getOfficialStatsVisibilityTier(state.upgrades))
    ? getContactPreparation(contact, collaborator.forms, isCourseXUnlocked(state.upgrades))
    : undefined;
  const isInstructor = collaborator.assignment === "instructor";

  return (
    <article
      className={`sector-roster-row${isInstructor ? " is-instructor" : ""}${showTechnicianTraining ? " has-technician-training" : ""} ${getRarityClassName(
        collaborator.rarity,
        Boolean(contact?.secretLegendaryId),
      )}`}
    >
      <div className="sector-roster-identity" data-label="Collaboratore">
        <span
          className={`person-avatar ${getRarityClassName(
            collaborator.rarity,
            Boolean(contact?.secretLegendaryId),
          )}`}
          aria-hidden="true"
        >
          {getInitials(collaborator.displayName)}
        </span>
        <div className="sector-roster-identity-copy">
          <PersonName
            displayName={collaborator.displayName}
            rarity={collaborator.rarity}
            secretLegendary={Boolean(contact?.secretLegendaryId)}
          />
          {contact ? <small>{contact.email}</small> : null}
          {isInstructor ? (
            <div className="sector-roster-identity-details">
              <div className="sector-roster-stats" aria-label="Valori Arena e Stile">
                <span><small>Arena</small>{officialStats ? <OfficialStatValue value={officialStats.arena} /> : <strong>???</strong>}</span>
                <span><small>Stile</small>{officialStats ? <OfficialStatValue value={officialStats.style} /> : <strong>???</strong>}</span>
              </div>
              <StaffForms
                stripClassName="sector-form-strip"
                forms={collaborator.forms}
                instructorForms={collaborator.instructorForms}
                technicianForms={collaborator.technicianForms}
                eLearningForms={collaborator.eLearningInstructorForms}
                showLabels={false}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="sector-roster-mastery" data-label="Maestria">
        <strong>{masteryProgress.definition.name}</strong>
        <small>{masteryProgress.currentXp} XP</small>
        <ProgressBar
          label={`Maestria di ${collaborator.displayName}`}
          value={masteryProgress.progress}
        />
      </div>

      <div className="sector-roster-activity" data-label="Attività">
        {collaborator.assignment === "instructor" ? (
          <InstructorCompactActivity collaborator={collaborator} state={stateOverride} />
        ) : (
          <>
            <strong>{activity.title}</strong>
            <small>{activity.detail}</small>
          </>
        )}
      </div>

      {!isInstructor ? (
        <>
          <div className="sector-roster-stats" data-label="Arena / Stile">
            <span><small>Arena</small>{officialStats ? <OfficialStatValue value={officialStats.arena} /> : <strong>???</strong>}</span>
            <span><small>Stile</small>{officialStats ? <OfficialStatValue value={officialStats.style} /> : <strong>???</strong>}</span>
          </div>
          <StaffForms
            stripClassName="sector-form-strip"
            forms={collaborator.forms}
            instructorForms={collaborator.instructorForms}
            technicianForms={collaborator.technicianForms}
            eLearningForms={collaborator.eLearningInstructorForms}
            showLabels={false}
          />
        </>
      ) : null}

      {isInstructor ? (
        <div
          className="sector-roster-training is-instructor-training"
          data-label="Formazione Istruttore"
          aria-label="Formazione Istruttore"
        >
          <InstructorQualificationTraining
            collaborator={collaborator}
            state={stateOverride}
            collaboratorsById={collaboratorsById}
            onStartTraining={onStartTraining}
          />
        </div>
      ) : null}

      {isInstructor && showTechnicianTraining ? (
        <div
          className="sector-roster-training is-technician-training"
          data-label="Formazione Tecnici"
          aria-label="Formazione Tecnici"
        >
          <InstructorTechnicianTraining
            collaborator={collaborator}
            state={stateOverride}
            collaboratorsById={collaboratorsById}
            onStartTraining={onStartTraining}
            onBookTechnicianCourse={onBookTechnicianCourse}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="sector-roster-details"
        onClick={onOpen}
        aria-label={`Apri dettagli di ${collaborator.displayName}`}
      >
        Dettagli
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

// Eight per page (Andrea): a sector can hold hundreds of collaborators,
// and every row carries live training controls.
const SECTOR_ROWS_PER_PAGE = 8;

export function CollaboratorSectorPanel({
  state: stateOverride,
  role,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  onClose,
}: {
  state?: GameState;
  role: CollaboratorMasteryRole;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onClose: () => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "player",
      "school",
      "statistics",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const technicianTrainingUnlocked = role === "instructor" &&
    isSISTechnicianCourseUnlocked(state.upgrades);
  const allowedSortKeys = role === "instructor"
    ? technicianTrainingUnlocked
      ? INSTRUCTOR_TECHNICIAN_SORT_KEYS
      : INSTRUCTOR_SORT_KEYS
    : SECTOR_SORT_KEYS;
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const {
    sort,
    setSort,
    resetSort,
  } = usePersistentTableSort<SectorCollaboratorSort>({
    storageId: `collaborator-sector.${role}`,
    allowedKeys: allowedSortKeys,
    defaultSort: null,
  });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = usePersistentFilters<SectorFilters>(
    `collaborator-sector.${role}`,
    SECTOR_FILTER_DEFAULTS,
  );
  const deferredSearch = useDeferredValue(search);
  const assigned = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment === role),
    [role, state.collaborators],
  );
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const athleticPreparationInstructorIds = useMemo(
    () => selectAthleticPreparationInstructorIds(state),
    [state],
  );
  const filteredAssigned = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    return assigned.filter((collaborator) => {
      const contact = contactsById.get(collaborator.contactId);
      const searchableText = `${collaborator.displayName} ${contact?.email ?? ""}`
        .toLocaleLowerCase("it-IT");
      if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false;
      if (!matchesRarityFilter(filters.rarities, collaborator.rarity, Boolean(contact?.secretLegendaryId))) return false;
      if (filters.mastery.length > 0) {
        const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
        const level = getCollaboratorMasteryProgress(mastery[role]).level;
        if (!filters.mastery.includes(String(level))) return false;
      }
      if (role !== "instructor") return true;
      if (filters.activity.length > 0) {
        const active = selectInstructorTeachingCount(state, collaborator.id) > 0 ||
          athleticPreparationInstructorIds.has(collaborator.id);
        if (!filters.activity.includes(active ? "active" : "waiting")) return false;
      }
      if (filters.training.length > 0) {
        const training = collaborator.training
          ? "active"
          : collaborator.technicianCourseReservation ? "reserved" : "available";
        if (!filters.training.includes(training)) return false;
      }
      return true;
    });
  }, [assigned, athleticPreparationInstructorIds, contactsById, deferredSearch, filters, role, state]);
  const hasTimedWork = getInstructorTeachingEntries(state, courseXUnlocked).length > 0 ||
    state.acquisitionEvents.some((event) => event.status === "running");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const sortContext = useMemo(() => ({
    state,
    contactsById,
    activeEmail: selectActiveEmail(state),
    athleticPreparationInstructorIds,
    now,
    role,
  }), [athleticPreparationInstructorIds, contactsById, now, role, state]);
  const sortedAssigned = useMemo(
    () => sortSectorCollaborators(filteredAssigned, sort, sortContext),
    [filteredAssigned, sort, sortContext],
  );
  // A new search, filter or sort starts again from the first page.
  const pageKey = [deferredSearch, JSON.stringify(filters), sort?.key, sort?.direction].join("|");
  const [pageState, setPageState] = useState({ key: pageKey, page: 0 });
  const pageCount = Math.max(1, Math.ceil(sortedAssigned.length / SECTOR_ROWS_PER_PAGE));
  const page = Math.min(pageState.key === pageKey ? pageState.page : 0, pageCount - 1);
  const goToPage = (next: number) => setPageState({ key: pageKey, page: next });
  const visibleAssigned = sortedAssigned.slice(
    page * SECTOR_ROWS_PER_PAGE,
    (page + 1) * SECTOR_ROWS_PER_PAGE,
  );
  const selectedCollaborator = selectedCollaboratorId
    ? state.collaborators.find((collaborator) => collaborator.id === selectedCollaboratorId)
    : undefined;
  const selectedAutomation = selectedCollaborator
    ? getCollaboratorAutomationPresentation({
        state,
        collaboratorId: selectedCollaborator.id,
        assignment: selectedCollaborator.assignment,
        now,
        activeEmail: selectActiveEmail(state),
      })
    : undefined;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !selectedCollaboratorId) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedCollaboratorId]);

  const roleLabel = role === "instructor"
    ? "Istruttori"
    : getCollaboratorAssignmentLabel(role, state.unlocks.social);

  const handleSort = (key: SectorCollaboratorSortKey) => {
    setSort((current) => current?.key === key
      ? {
          key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : { key, direction: "ascending" });
  };

  const selectSort = (key: SectorCollaboratorSortKey | null) => {
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
    setSort((current) => current
      ? {
          ...current,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : current);
  };

  const toggleIn = (key: "rarities" | "mastery" | "activity" | "training", value: string) =>
    setFilters((current) => ({ ...current, [key]: toggleValue(current[key], value) }));
  const resetFilters = () => {
    setSearch("");
    setFilters((current) => ({ ...SECTOR_FILTER_DEFAULTS, open: current.open }));
  };
  const hasSecretLegendary = assigned.some((collaborator) =>
    Boolean(contactsById.get(collaborator.contactId)?.secretLegendaryId));
  const rarityOptions = RARITY_FILTER_VALUES.filter((value) =>
    value !== "secret-legendary" || hasSecretLegendary || filters.rarities.includes(value));
  const trainingOptions = Object.keys(TRAINING_LABELS)
    .filter((value) => value !== "reserved" || technicianTrainingUnlocked);
  const activeFilters: ActiveListFilter[] = [
    ...filters.rarities.map((value) => ({
      key: `rarity-${value}`,
      label: rarityFilterLabel(value),
      className: rarityFilterClassName(value),
      onRemove: () => toggleIn("rarities", value),
    })),
    ...filters.mastery.map((value) => ({
      key: `mastery-${value}`,
      label: `Maestria: ${COLLABORATOR_MASTERY_LEVELS[Number(value)]?.name ?? value}`,
      onRemove: () => toggleIn("mastery", value),
    })),
    ...(role === "instructor" ? filters.activity : []).map((value) => ({
      key: `activity-${value}`,
      label: ACTIVITY_LABELS[value] ?? value,
      onRemove: () => toggleIn("activity", value),
    })),
    ...(role === "instructor" ? filters.training : []).map((value) => ({
      key: `training-${value}`,
      label: TRAINING_LABELS[value] ?? value,
      onRemove: () => toggleIn("training", value),
    })),
  ];
  const noun = roleLabel.toLocaleLowerCase("it-IT");

  return (
    <>
      <button
        type="button"
        className="sector-panel-backdrop"
        aria-label={`Chiudi ${roleLabel} cliccando sullo sfondo`}
        onClick={onClose}
      />
      <aside
        className={`collaborator-sector-panel${role === "instructor" ? " is-instructor" : ""}${technicianTrainingUnlocked ? " has-technician-training" : ""}`}
        role="dialog"
        aria-labelledby="sector-panel-title"
      >
        <header>
          <div>
            <span>{role === "instructor" ? "Centro didattico" : "Settore operativo"}</span>
            <h2 id="sector-panel-title">{roleLabel}</h2>
          </div>
          <button type="button" aria-label={`Chiudi pannello ${roleLabel}`} onClick={onClose} autoFocus>
            <Icon name="close" />
          </button>
        </header>

        <div className="sector-panel-summary">
          <span><strong>{assigned.length}</strong><small>Collaboratori</small></span>
          <SectorMasteryIndicator
            className="sector-panel-mastery-summary"
            collaborators={assigned}
            role={role}
          />
          <SectorStatisticsSummary
            state={stateOverride}
            role={role}
            collaborators={assigned}
          />
        </div>

        <div className="sector-panel-content">
          {assigned.length === 0 ? (
            <div className="sector-panel-empty">
              <Icon name="people" />
              <strong>Nessuno qui, per ora.</strong>
              <span>Usa il pulsante + nella box del settore per assegnarne uno.</span>
            </div>
          ) : (
            <div className="sector-roster">
              <ListFilterBar
                id={`sector-${role}`}
                noun={noun}
                search={search}
                searchLabel={`Filtra ${noun} per nome o email`}
                onSearch={setSearch}
                drawerOpen={filters.open}
                onToggleDrawer={() => setFilters((current) => ({ ...current, open: !current.open }))}
                activeFilters={activeFilters}
                onResetFilters={resetFilters}
                sortOptions={allowedSortKeys.map((key) => ({ value: key, label: SORT_LABELS[key] }))}
                sort={sort}
                onSortChange={selectSort}
                onReverseSort={reverseSort}
                count={filteredAssigned.length === assigned.length
                  ? <><strong>{assigned.length}</strong> {noun}</>
                  : <><strong>{filteredAssigned.length}</strong> di {assigned.length}</>}
              >
                <FilterGroup label="Rarità">
                  {rarityOptions.map((value) => (
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
                <FilterGroup label="Maestria" wide={role !== "instructor"}>
                  {COLLABORATOR_MASTERY_LEVELS.map((level, index) => (
                    <FilterChip
                      key={level.name}
                      pressed={filters.mastery.includes(String(index))}
                      onToggle={() => toggleIn("mastery", String(index))}
                    >
                      {level.name}
                    </FilterChip>
                  ))}
                </FilterGroup>
                {role === "instructor" ? (
                  <>
                    <FilterGroup label="Attività">
                      {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                        <FilterChip key={value} pressed={filters.activity.includes(value)} onToggle={() => toggleIn("activity", value)}>
                          {label}
                        </FilterChip>
                      ))}
                    </FilterGroup>
                    <FilterGroup label="Formazione personale" wide>
                      {trainingOptions.map((value) => (
                        <FilterChip key={value} pressed={filters.training.includes(value)} onToggle={() => toggleIn("training", value)}>
                          {TRAINING_LABELS[value]}
                        </FilterChip>
                      ))}
                    </FilterGroup>
                  </>
                ) : null}
              </ListFilterBar>
              <div className="sector-roster-head" role="row">
                {role === "instructor" ? (
                  <SectorIdentitySortableHeader sort={sort} onSort={handleSort} />
                ) : (
                  <SectorSortableHeader label="Collaboratore" sortKey="name" sort={sort} onSort={handleSort} />
                )}
                <SectorSortableHeader label="Maestria" sortKey="mastery" sort={sort} onSort={handleSort} />
                <SectorSortableHeader label="Attività" sortKey="activity" sort={sort} onSort={handleSort} />
                {role !== "instructor" ? (
                  <>
                    <span
                      className="sector-roster-stat-sort"
                      role="columnheader"
                      aria-sort={sort?.key === "arena" || sort?.key === "style" ? sort.direction : "none"}
                    >
                      <button
                        type="button"
                        className={sort?.key === "arena" ? "is-active" : ""}
                        aria-label="Ordina collaboratori per Arena"
                        onClick={() => handleSort("arena")}
                      >Arena {sort?.key === "arena" ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}</button>
                      <button
                        type="button"
                        className={sort?.key === "style" ? "is-active" : ""}
                        aria-label="Ordina collaboratori per Stile"
                        onClick={() => handleSort("style")}
                      >Stile {sort?.key === "style" ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}</button>
                    </span>
                    <SectorSortableHeader label="Forme" sortKey="forms" sort={sort} onSort={handleSort} />
                  </>
                ) : null}
                {role === "instructor" ? (
                  <>
                    <SectorSortableHeader label="Formazione Istruttore" sortKey="instructor-training" sort={sort} onSort={handleSort} />
                    {technicianTrainingUnlocked ? (
                      <SectorSortableHeader label="Formazione Tecnici" sortKey="technician-training" sort={sort} onSort={handleSort} />
                    ) : null}
                  </>
                ) : null}
                <span aria-hidden="true" />
              </div>
              {visibleAssigned.map((collaborator) => (
                <SectorCollaboratorRow
                  key={collaborator.id}
                  state={stateOverride}
                  collaborator={collaborator}
                  contact={contactsById.get(collaborator.contactId)}
                  now={now}
                  collaboratorsById={collaboratorsById}
                  onStartTraining={onStartTraining}
                  onBookTechnicianCourse={onBookTechnicianCourse}
                  showTechnicianTraining={technicianTrainingUnlocked}
                  onOpen={() => setSelectedCollaboratorId(collaborator.id)}
                />
              ))}
              {pageCount > 1 ? (
                <nav className="list-pagination" aria-label={`Pagine ${roleLabel.toLocaleLowerCase("it-IT")}`}>
                  <button type="button" disabled={page === 0} onClick={() => goToPage(page - 1)}>
                    Precedente
                  </button>
                  <span>
                    Pagina {page + 1} di {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page === pageCount - 1}
                    onClick={() => goToPage(page + 1)}
                  >
                    Successiva
                  </button>
                </nav>
              ) : null}
              {sortedAssigned.length === 0 ? (
                <div className="sector-roster-filter-empty">
                  <strong>Nessuno corrisponde ai filtri</strong>
                  <span>Modifica i criteri oppure azzera i filtri.</span>
                  <button type="button" onClick={resetFilters}>Azzera filtri</button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      {selectedCollaborator && selectedAutomation ? (
        <CollaboratorDetailDrawer
          state={stateOverride}
          collaborator={selectedCollaborator}
          contact={contactsById.get(selectedCollaborator.contactId)}
          automation={selectedAutomation}
          collaboratorsById={collaboratorsById}
          onAssign={() => undefined}
          onStartTraining={onStartTraining}
          onBookTechnicianCourse={onBookTechnicianCourse}
          allowAssignment={false}
          onClose={() => setSelectedCollaboratorId(null)}
        />
      ) : null}
    </>
  );
}
