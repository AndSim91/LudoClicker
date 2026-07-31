import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { TableSortResetButton } from "../../components/common/TableSortResetButton";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  COLLABORATOR_MASTERY_LEVELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { PERSON_RARITIES } from "../../content/rarities";
import { getContactPreparation, hasUnlockedOfficialStats } from "../../game/athleteStats";
import {
  isCourseXUnlocked,
  isSISTechnicianCourseUnlocked,
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
import {
  getPresentedPersonRarity,
  getRarityClassName,
} from "../../shared/rarityPresentation";
import { usePersistentTableSort } from "../../shared/usePersistentTableSort";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import {
  sortSectorCollaborators,
  type SectorCollaboratorSort,
  type SectorCollaboratorSortKey,
} from "./collaboratorSorting";
import { getInstructorTeachingEntries } from "./instructorGroupPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";
import { SectorStatisticsSummary } from "./SectorStatisticsSummary";
import {
  InstructorCompactActivity,
  InstructorQualificationTraining,
  InstructorTechnicianTraining,
} from "./TrainingControl";

type InstructorRarityFilter = "all" | ReturnType<typeof getPresentedPersonRarity>;
type InstructorActivityFilter = "all" | "active" | "waiting";
type InstructorTrainingFilter = "all" | "active" | "reserved" | "available";
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
  const officialStats = contact && hasUnlockedOfficialStats(collaborator.forms)
    ? getContactPreparation(contact, collaborator.forms)
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
              <FormLogoStrip
                className="sector-form-strip"
                forms={collaborator.forms}
                instructorForms={collaborator.instructorForms}
                technicianForms={collaborator.technicianForms}
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
          <FormLogoStrip
            className="sector-form-strip"
            forms={collaborator.forms}
            instructorForms={collaborator.instructorForms}
            technicianForms={collaborator.technicianForms}
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
    isDefaultSort,
  } = usePersistentTableSort<SectorCollaboratorSort>({
    storageId: `collaborator-sector.${role}`,
    allowedKeys: allowedSortKeys,
    defaultSort: null,
  });
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<InstructorRarityFilter>("all");
  const [activityFilter, setActivityFilter] = useState<InstructorActivityFilter>("all");
  const [trainingFilter, setTrainingFilter] = useState<InstructorTrainingFilter>("all");
  const [masteryFilter, setMasteryFilter] = useState("all");
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
    if (role !== "instructor") return assigned;
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    return assigned.filter((collaborator) => {
      const contact = contactsById.get(collaborator.contactId);
      const searchableText = `${collaborator.displayName} ${contact?.email ?? ""}`
        .toLocaleLowerCase("it-IT");
      if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false;
      const presentedRarity = getPresentedPersonRarity(
        collaborator.rarity,
        Boolean(contact?.secretLegendaryId),
      );
      const matchesRarity = presentedRarity === rarityFilter ||
        (rarityFilter === "legendary" && presentedRarity === "secret-legendary");
      if (rarityFilter !== "all" && !matchesRarity) return false;
      if (masteryFilter !== "all") {
        const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
        const level = getCollaboratorMasteryProgress(mastery.instructor).level;
        if (level !== Number(masteryFilter)) return false;
      }
      if (activityFilter !== "all") {
        const active = selectInstructorTeachingCount(state, collaborator.id) > 0 ||
          athleticPreparationInstructorIds.has(collaborator.id);
        if (active !== (activityFilter === "active")) return false;
      }
      if (trainingFilter === "active" && !collaborator.training) return false;
      if (trainingFilter === "reserved" && !collaborator.technicianCourseReservation) return false;
      if (
        trainingFilter === "available" &&
        (collaborator.training || collaborator.technicianCourseReservation)
      ) return false;
      return true;
    });
  }, [
    activityFilter,
    assigned,
    athleticPreparationInstructorIds,
    contactsById,
    deferredSearch,
    masteryFilter,
    rarityFilter,
    role,
    state,
    trainingFilter,
  ]);
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

  const selectSort = (key: SectorCollaboratorSortKey) => {
    setSort((current) => ({
      key,
      direction: current?.direction ?? "ascending",
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
  const resetSorting = () => {
    resetSort();
  };

  const hasActiveFilters = search !== "" || rarityFilter !== "all" ||
    activityFilter !== "all" || trainingFilter !== "all" || masteryFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setRarityFilter("all");
    setActivityFilter("all");
    setTrainingFilter("all");
    setMasteryFilter("all");
  };

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
              <strong>Nessun collaboratore assegnato</strong>
              <span>Usa il pulsante + nella box del settore per assegnarne uno.</span>
            </div>
          ) : (
            <div className="sector-roster">
              {role === "instructor" ? (
                <div className="sector-roster-filters" aria-label="Filtri istruttori">
                  <label className="sector-roster-search-filter">
                    <span className="sr-only">Cerca istruttore</span>
                    <input
                      type="search"
                      aria-label="Filtra istruttori per nome o email"
                      placeholder="Nome o email"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Rarità istruttore</span>
                    <select
                      aria-label="Filtra istruttori per rarità"
                      value={rarityFilter}
                      onChange={(event) => setRarityFilter(event.target.value as InstructorRarityFilter)}
                    >
                      <option value="all">Tutte le rarità</option>
                      {Object.entries(PERSON_RARITIES).map(([value, definition]) => (
                        <option value={value} key={value}>Rarità: {definition.label}</option>
                      ))}
                      <option value="secret-legendary">Rarità: Leggendario Segreto</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Maestria istruttore</span>
                    <select
                      aria-label="Filtra istruttori per maestria"
                      value={masteryFilter}
                      onChange={(event) => setMasteryFilter(event.target.value)}
                    >
                      <option value="all">Tutte le maestrie</option>
                      {COLLABORATOR_MASTERY_LEVELS.map((level, index) => (
                        <option value={index} key={level.name}>Maestria: {level.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Attività istruttore</span>
                    <select
                      aria-label="Filtra istruttori per attività"
                      value={activityFilter}
                      onChange={(event) => setActivityFilter(event.target.value as InstructorActivityFilter)}
                    >
                      <option value="all">Tutte le attività</option>
                      <option value="active">Con allievi o preparazione</option>
                      <option value="waiting">In attesa</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Formazione personale istruttore</span>
                    <select
                      aria-label="Filtra istruttori per formazione"
                      value={trainingFilter}
                      onChange={(event) => setTrainingFilter(event.target.value as InstructorTrainingFilter)}
                    >
                      <option value="all">Tutte le formazioni</option>
                      <option value="active">Formazione in corso</option>
                      {technicianTrainingUnlocked ? (
                        <option value="reserved">Corso Tecnico prenotato</option>
                      ) : null}
                      <option value="available">Nessuna formazione</option>
                    </select>
                  </label>
                  <span className="sector-roster-filter-summary" aria-live="polite">
                    <strong>{filteredAssigned.length}</strong>
                    <small>di {assigned.length}</small>
                  </span>
                  <button type="button" disabled={!hasActiveFilters} onClick={resetFilters}>
                    Azzera
                  </button>
                </div>
              ) : null}
              <div
                className="sector-roster-sort-mobile table-sort-controls"
                aria-label="Ordina collaboratori del settore"
              >
                <label>
                  <span>Ordina per</span>
                  <select
                    aria-label="Campo di ordinamento collaboratori del settore"
                    value={sort?.key ?? ""}
                    onChange={(event) => selectSort(event.target.value as SectorCollaboratorSortKey)}
                  >
                    <option value="" disabled>Seleziona</option>
                    <option value="name">Collaboratore</option>
                    <option value="mastery">Maestria</option>
                    <option value="activity">Attività</option>
                    <option value="arena">Arena</option>
                    <option value="style">Stile</option>
                    <option value="forms">Forme</option>
                    {role === "instructor" ? (
                      <option value="instructor-training">Formazione Istruttore</option>
                    ) : null}
                    {technicianTrainingUnlocked ? (
                      <option value="technician-training">Formazione Tecnici</option>
                    ) : null}
                  </select>
                </label>
                <button type="button" disabled={!sort} onClick={reverseSort}>
                  {sort?.direction === "descending" ? "Decrescente ↓" : "Crescente ↑"}
                </button>
                <TableSortResetButton
                  disabled={isDefaultSort}
                  label={roleLabel.toLocaleLowerCase("it-IT")}
                  onReset={resetSorting}
                />
              </div>
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
              {sortedAssigned.map((collaborator) => (
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
              {sortedAssigned.length === 0 ? (
                <div className="sector-roster-filter-empty">
                  <strong>Nessun istruttore corrisponde ai filtri</strong>
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
