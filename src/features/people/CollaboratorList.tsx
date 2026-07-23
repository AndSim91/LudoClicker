import { useDeferredValue, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { EquipmentConditionBar } from "../../components/equipment/EquipmentConditionBar";
import {
  COLLABORATOR_ASSIGNMENT_LABELS,
  getCollaboratorAssignmentLabel,
} from "../../content/collaboratorRoles";
import {
  COLLABORATOR_MASTERY_LEVELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryRoleLabel,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasCompletedCourseX } from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { getEffectiveDamagedSwords } from "../../game/equipment";
import { useGameTime } from "../../game/GameTimeContext";
import { selectActiveEmail, selectInstructorTeachingCount } from "../../game/selectors";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import {
  sortCollaborators,
  type CollaboratorSort,
  type CollaboratorSortKey,
} from "./collaboratorSorting";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import {
  InstructorCompactActivity,
  InstructorCompactTraining,
} from "./TrainingControl";

const COLLABORATORS_PER_PAGE = 25;
type CollaboratorFilter = "all" | "unassigned" | Exclude<CollaboratorAssignment, null>;
type ActivityFilter = "all" | "active" | "waiting";
type StatsFilter = "all" | "visible" | "locked";

function CollaboratorSortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: CollaboratorSortKey;
  sort: CollaboratorSort | null;
  onSort: (key: CollaboratorSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <span role="columnheader" aria-sort={active ? sort.direction : "none"}>
      <button
        type="button"
        className={`collaborator-sort-button${active ? " is-active" : ""}`}
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

export function CollaboratorList({
  state,
  onAssign,
  onStartTraining,
  onPayInstructorCertificates,
  onToggleInstructorAutomation,
  collaboratorsById,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
  collaboratorsById: Map<string, GameState["collaborators"][number]>;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<CollaboratorFilter>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [statsFilter, setStatsFilter] = useState<StatsFilter>("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sort, setSort] = useState<CollaboratorSort | null>(null);
  const deferredSearch = useDeferredValue(search);
  const contactsById = useMemo(
    () => new Map<string, Contact>(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const activeEmail = selectActiveEmail(state);
  const hasTimedAutomation = state.acquisitionEvents.some((event) =>
    event.status === "running" && event.collaboratorId !== undefined
  );
  const hasActiveEquipmentAutomation = state.collaborators.some(
    (collaborator) => collaborator.assignment === "equipment",
  ) && (
    state.equipment.wear > 0 || getEffectiveDamagedSwords(state.equipment) > 0
  );
  const now = useGameTime(
    hasTimedAutomation || hasActiveEquipmentAutomation,
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const filteredCollaborators = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    return state.collaborators.filter((collaborator) => {
      const contact = contactsById.get(collaborator.contactId);
      const searchableText = `${collaborator.displayName} ${contact?.email ?? ""}`
        .toLocaleLowerCase("it-IT");
      if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false;
      if (
        assignmentFilter !== "all" &&
        (assignmentFilter === "unassigned"
          ? collaborator.assignment !== null
          : collaborator.assignment !== assignmentFilter)
      ) return false;
      if (
        statsFilter !== "all" &&
        hasCompletedCourseX(collaborator.forms) !== (statsFilter === "visible")
      ) return false;
      if (levelFilter !== "all") {
        const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
        const level = collaborator.assignment
          ? getCollaboratorMasteryProgress(mastery[collaborator.assignment]).level
          : -1;
        if (level !== Number(levelFilter)) return false;
      }
      if (activityFilter !== "all") {
        const automation = getCollaboratorAutomationPresentation({
          state,
          collaboratorId: collaborator.id,
          assignment: collaborator.assignment,
          now,
          activeEmail,
        });
        const active = collaborator.assignment === "instructor"
          ? selectInstructorTeachingCount(state, collaborator.id) > 0
          : automation.progress !== undefined;
        if (active !== (activityFilter === "active")) return false;
      }
      return true;
    });
  }, [
    activeEmail,
    activityFilter,
    assignmentFilter,
    contactsById,
    deferredSearch,
    levelFilter,
    now,
    state,
    statsFilter,
  ]);
  const sortContext = useMemo(() => ({
    state,
    contactsById,
    activeEmail,
    now,
  }), [activeEmail, contactsById, now, state]);
  const sortedCollaborators = useMemo(
    () => sortCollaborators(filteredCollaborators, sort, sortContext),
    [filteredCollaborators, sort, sortContext],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredCollaborators.length / COLLABORATORS_PER_PAGE),
  );
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleCollaborators = sortedCollaborators.slice(
    page * COLLABORATORS_PER_PAGE,
    (page + 1) * COLLABORATORS_PER_PAGE,
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
        activeEmail,
      })
    : undefined;
  const resetFilters = () => {
    setSearch("");
    setAssignmentFilter("all");
    setActivityFilter("all");
    setStatsFilter("all");
    setLevelFilter("all");
    setRequestedPage(0);
  };
  const updateFilter = (update: () => void) => {
    setRequestedPage(0);
    update();
  };
  const handleSort = (key: CollaboratorSortKey) => {
    setRequestedPage(0);
    setSort((current) => current?.key === key
      ? {
          key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : { key, direction: "ascending" },
    );
  };
  const selectSort = (key: CollaboratorSortKey) => {
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
    <section className="collaborator-list" aria-label="Collaboratori delle Onde">
      {state.collaborators.length === 0 ? (
        <div className="people-empty">
          <Icon name="contact" />
          <strong>Nessun collaboratore disponibile</strong>
          <span>
            Gli Ultra Rari diventano collaboratori dopo il Corso Y; i Leggendari lo sono
            dall'iscrizione.
          </span>
        </div>
      ) : (
        <div className="collaborator-table">
          <div className="collaborator-sort-mobile" aria-label="Ordina collaboratori">
            <label>
              <span>Ordina per</span>
              <select
                aria-label="Campo di ordinamento collaboratori"
                value={sort?.key ?? ""}
                onChange={(event) => selectSort(event.target.value as CollaboratorSortKey)}
              >
                <option value="" disabled>Seleziona</option>
                <option value="name">Collaboratore</option>
                <option value="assignment">Assegnazione</option>
                <option value="activity">Attività</option>
                <option value="arena">Arena</option>
                <option value="style">Stile</option>
              </select>
            </label>
            <button type="button" disabled={!sort} onClick={reverseSort}>
              {sort?.direction === "descending" ? "Decrescente ↓" : "Crescente ↑"}
            </button>
          </div>
          <div className="collaborator-table-head">
            <CollaboratorSortableHeader label="Collaboratore" sortKey="name" sort={sort} onSort={handleSort} />
            <CollaboratorSortableHeader label="Assegnazione attuale" sortKey="assignment" sort={sort} onSort={handleSort} />
            <CollaboratorSortableHeader label="Attività" sortKey="activity" sort={sort} onSort={handleSort} />
            <span
              className="collaborator-stat-sort"
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
            <span>Assegnazione</span>
            <span>Azioni</span>
          </div>

          <div className="collaborator-table-filters" aria-label="Filtri collaboratori">
            <label>
              <span className="sr-only">Cerca collaboratore</span>
              <input
                type="search"
                value={search}
                placeholder="Nome o email"
                onChange={(event) => updateFilter(() => setSearch(event.target.value))}
              />
            </label>
            <label>
              <span className="sr-only">Livello collaboratore</span>
              <select
                aria-label="Filtra per livello"
                value={levelFilter}
                onChange={(event) => updateFilter(() => setLevelFilter(event.target.value))}
              >
                <option value="all">Tutti i livelli</option>
                {COLLABORATOR_MASTERY_LEVELS.map((level, index) => (
                  <option value={index} key={level.name}>{level.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Attività collaboratore</span>
              <select
                aria-label="Filtra per attività"
                value={activityFilter}
                onChange={(event) => updateFilter(() => setActivityFilter(event.target.value as ActivityFilter))}
              >
                <option value="all">Tutte le attività</option>
                <option value="active">In corso</option>
                <option value="waiting">In attesa</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Statistiche ufficiali</span>
              <select
                aria-label="Filtra per statistiche"
                value={statsFilter}
                onChange={(event) => updateFilter(() => setStatsFilter(event.target.value as StatsFilter))}
              >
                <option value="all">Tutte le statistiche</option>
                <option value="visible">Arena/Stile visibili</option>
                <option value="locked">Arena/Stile bloccati</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Assegnazione collaboratore</span>
              <select
                aria-label="Filtra per assegnazione"
                value={assignmentFilter}
                onChange={(event) => updateFilter(() => setAssignmentFilter(event.target.value as CollaboratorFilter))}
              >
                <option value="all">Tutte le assegnazioni</option>
                <option value="unassigned">Non assegnati</option>
                {Object.keys(COLLABORATOR_ASSIGNMENT_LABELS).map((value) => (
                  <option value={value} key={value}>
                    {getCollaboratorAssignmentLabel(
                      value as Exclude<CollaboratorAssignment, null>,
                      state.unlocks.social,
                    )}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={resetFilters}>Azzera</button>
          </div>

          {visibleCollaborators.map((collaborator) => {
            const contact = contactsById.get(collaborator.contactId);
            const automation = getCollaboratorAutomationPresentation({
              state,
              collaboratorId: collaborator.id,
              assignment: collaborator.assignment,
              now,
              activeEmail,
            });
            const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
            const masteryProgress = collaborator.assignment
              ? getCollaboratorMasteryProgress(mastery[collaborator.assignment])
              : undefined;
            const hasVisibleStats = hasCompletedCourseX(collaborator.forms);
            const officialStats = contact && hasVisibleStats
              ? getContactPreparation(contact, collaborator.forms)
              : undefined;
            const selected = collaborator.id === selectedCollaboratorId;
            const nextMasteryLevel = masteryProgress
              ? COLLABORATOR_MASTERY_LEVELS[masteryProgress.level + 1]
              : undefined;

            return (
              <article
                className={`collaborator-row ${getRarityClassName(collaborator.rarity, Boolean(contact?.secretLegendaryId))}${
                  selected ? " is-selected" : ""
                }`}
                key={collaborator.id}
              >
                <div className="collaborator-identity" data-label="Collaboratore">
                  <div className={`person-avatar ${getRarityClassName(collaborator.rarity, Boolean(contact?.secretLegendaryId))}`} aria-hidden="true">
                    {collaborator.displayName
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="collaborator-copy">
                    <PersonName
                      displayName={collaborator.displayName}
                      rarity={collaborator.rarity}
                      secretLegendary={Boolean(contact?.secretLegendaryId)}
                    />
                    {contact ? (
                      <span className={`rarity-address ${getRarityClassName(collaborator.rarity, Boolean(contact.secretLegendaryId))}`}>
                        {contact.email}
                      </span>
                    ) : null}
                    <FormLogoStrip
                      forms={collaborator.forms}
                      instructorForms={collaborator.instructorForms}
                    />
                  </div>
                </div>

                <div className="collaborator-current-role" data-label="Assegnazione attuale">
                  <strong>
                    {collaborator.assignment
                      ? getCollaboratorAssignmentLabel(
                          collaborator.assignment,
                          state.unlocks.social,
                        )
                      : "Non assegnato"}
                  </strong>
                  {collaborator.assignment && masteryProgress ? (
                    <span className="collaborator-mastery-level">
                      <small>
                        {getCollaboratorMasteryRoleLabel(
                          collaborator.assignment,
                          state.unlocks.social,
                        )} · {masteryProgress.definition.name}
                      </small>
                      <ProgressBar
                        variant="circular"
                        value={masteryProgress.progress}
                        label={nextMasteryLevel
                          ? `Progresso verso ${nextMasteryLevel.name}`
                          : "Livello massimo raggiunto"}
                        title={nextMasteryLevel
                          ? `${masteryProgress.progress}% verso ${nextMasteryLevel.name}`
                          : "Livello massimo raggiunto"}
                      />
                    </span>
                  ) : <small>Assegna un ruolo per iniziare</small>}
                </div>

                <div className="collaborator-activity" data-label="Attività">
                  {collaborator.assignment === "instructor" ? (
                    <InstructorCompactActivity collaborator={collaborator} state={state} />
                  ) : (
                    <>
                      <span className="collaborator-activity-title">
                        <strong>{automation.title}</strong>
                        {automation.detail ? <small>{automation.detail}</small> : null}
                      </span>
                      {collaborator.assignment === "equipment" ? (
                        <span className="collaborator-activity-progress is-equipment">
                          <EquipmentConditionBar
                            equipment={state.equipment}
                            compact
                            ariaLabel={`Condizione attrezzatura di ${collaborator.displayName}`}
                          />
                        </span>
                      ) : automation.progress === undefined ? (
                        <span className="collaborator-activity-progress is-empty">
                          <strong>—</strong>
                        </span>
                      ) : (
                        <span className="collaborator-activity-progress">
                          <strong>{Math.round(automation.progress)}%</strong>
                          <ProgressBar
                            className="collaborator-progress-bar"
                            label={automation.progressLabel ?? automation.title}
                            value={automation.progress}
                            durationMs={automation.durationMs}
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="collaborator-official-stats" data-label="Arena / Stile">
                  <span>
                    <small>Arena</small>
                    {officialStats ? (
                      <OfficialStatValue value={officialStats.arena} />
                    ) : (
                      <strong className="member-stat-locked" title="Completa Corso X">???</strong>
                    )}
                  </span>
                  <span>
                    <small>Stile</small>
                    {officialStats ? (
                      <OfficialStatValue value={officialStats.style} />
                    ) : (
                      <strong className="member-stat-locked" title="Completa Corso X">???</strong>
                    )}
                  </span>
                </div>

                <div className="collaborator-assignment" data-label="Assegnazione">
                  <span>Assegnazione</span>
                  <select
                    aria-label="Assegnazione"
                    data-tutorial-region={state.unlocks.social
                      ? "collaborator-social-assignment"
                      : undefined}
                    data-tutorial-target={state.unlocks.social ? "true" : undefined}
                    value={collaborator.assignment ?? ""}
                    onChange={(event) => onAssign(
                      collaborator.id,
                      (event.target.value || null) as CollaboratorAssignment,
                    )}
                  >
                    <option value="">Non assegnato</option>
                    {Object.keys(COLLABORATOR_ASSIGNMENT_LABELS).map((value) => (
                      <option value={value} key={value}>
                        {getCollaboratorAssignmentLabel(
                          value as Exclude<CollaboratorAssignment, null>,
                          state.unlocks.social,
                        )}
                      </option>
                    ))}
                  </select>
                  {collaborator.assignment === "instructor" ? (
                    <InstructorCompactTraining
                      collaborator={collaborator}
                      state={state}
                      onStartTraining={onStartTraining}
                      onPayInstructorCertificates={onPayInstructorCertificates}
                      collaboratorsById={collaboratorsById}
                    />
                  ) : null}
                </div>

                <div className="collaborator-row-actions" data-label="Azioni">
                  <button
                    type="button"
                    aria-label={`Dettagli di ${collaborator.displayName}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedCollaboratorId(collaborator.id)}
                  >
                    Dettagli
                  </button>
                </div>
              </article>
            );
          })}
          {filteredCollaborators.length === 0 ? (
            <div className="collaborator-filter-empty">Nessun collaboratore corrisponde ai filtri.</div>
          ) : null}
        </div>
      )}

      {pageCount > 1 ? (
        <nav className="list-pagination" aria-label="Pagine collaboratori">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setRequestedPage((current) => Math.max(0, current - 1))}
          >
            Precedente
          </button>
          <span>Pagina {page + 1} di {pageCount}</span>
          <button
            type="button"
            disabled={page === pageCount - 1}
            onClick={() => setRequestedPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Successiva
          </button>
        </nav>
      ) : null}

      {selectedCollaborator && selectedAutomation ? (
        <CollaboratorDetailDrawer
          state={state}
          collaborator={selectedCollaborator}
          contact={contactsById.get(selectedCollaborator.contactId)}
          automation={selectedAutomation}
          collaboratorsById={collaboratorsById}
          onAssign={onAssign}
          onStartTraining={onStartTraining}
          onPayInstructorCertificates={onPayInstructorCertificates}
          onToggleInstructorAutomation={onToggleInstructorAutomation}
          onClose={() => setSelectedCollaboratorId(null)}
        />
      ) : null}
    </section>
  );
}
