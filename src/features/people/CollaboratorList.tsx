import { useMemo, useState } from "react";
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
import { getOfficialStatsVisibilityTier } from "../../content/upgrades";
import { getContactPreparation, hasUnlockedOfficialStats, getHiddenStatsHint } from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { getEffectiveDamagedSwords } from "../../game/equipment";
import { useGameTime } from "../../game/GameTimeContext";
import {
  selectActiveEmail,
  selectAthleticPreparationInstructorIds,
} from "../../game/selectors";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { StaffForms } from "./FormPathMap";
import { PersonName } from "./PersonPresentation";
import { InstructorCourseTabs } from "./InstructorCourseTabs";
import { InstructorCompactActivity } from "./TrainingControl";
import { isCollaboratorAssignmentAvailable } from "../../game/unlocks";

const COLLABORATORS_PER_PAGE = 25;
/** From the 5th collaborator to the Consiglio the list is a grid of 4 + 3 places (06/10). */
const GRID_FROM = 5;
/**
 * Before the Consiglio there are at most seven collaborators: no filters and no
 * sorting (Andrea, 08/10). Free ones first, then by sector as in the Consiglio.
 */
const COLLABORATOR_ORDER: CollaboratorAssignment[] = [null, "instructor", "writing", "events", "equipment", "gadget"];

export function CollaboratorList({
  state: stateOverride,
  onAssign,
  onStartTraining,
  onBookTechnicianCourse,
  collaboratorsById,
}: {
  state?: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  collaboratorsById: Map<string, GameState["collaborators"][number]>;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaboratorManagement",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "gadgets",
      "network",
      "player",
      "school",
      "tournaments",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const automaticAssignment = Boolean(state.collaboratorManagement.automaticShares);
  const statsTier = getOfficialStatsVisibilityTier(state.upgrades);
  const [requestedPage, setRequestedPage] = useState(0);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const contactsById = useMemo(
    () => new Map<string, Contact>(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const activeEmail = selectActiveEmail(state);
  const athleticPreparationInstructorIds = selectAthleticPreparationInstructorIds(state);
  const hasTimedAutomation = state.acquisitionEvents.some((event) =>
    event.status === "running" && event.collaboratorId !== undefined
  );
  const hasActiveEquipmentAutomation = state.collaborators.some(
    (collaborator) => collaborator.assignment === "equipment",
  ) && (
    state.equipment.wear > 0 || getEffectiveDamagedSwords(state.equipment) > 0
  );
  const hasActiveGadgetWork = state.collaborators.some(
    (collaborator) => collaborator.assignment === "gadget",
  ) && state.gadgets.activeWorks.length > 0;
  const now = useGameTime(
    hasTimedAutomation || hasActiveEquipmentAutomation || hasActiveGadgetWork,
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const gridMode = state.collaborators.length >= GRID_FROM;
  const sortedCollaborators = useMemo(
    () => [...state.collaborators].sort((a, b) =>
      COLLABORATOR_ORDER.indexOf(a.assignment) - COLLABORATOR_ORDER.indexOf(b.assignment)),
    [state.collaborators],
  );
  const pageCount = Math.max(1, Math.ceil(sortedCollaborators.length / COLLABORATORS_PER_PAGE));
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
        <div className={`collaborator-table${gridMode ? " is-grid" : ""}`}>
          {gridMode ? null : (
            <div className="collaborator-table-head">
              <span>Collaboratore</span>
              <span>Assegnazione attuale</span>
              <span>Attività</span>
              <span>Arena / Stile</span>
              <span>Assegnazione</span>
              <span>Azioni</span>
            </div>
          )}

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
            const hasVisibleStats = hasUnlockedOfficialStats(collaborator.forms, statsTier);
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
                }${collaborator.assignment === null ? " is-unassigned" : ""}`}
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
                    <StaffForms
                      forms={collaborator.forms}
                      instructorForms={collaborator.instructorForms}
                      technicianForms={collaborator.technicianForms}
                      eLearningForms={collaborator.eLearningInstructorForms}
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
                    <InstructorCompactActivity
                      collaborator={collaborator}
                      state={stateOverride}
                      athleticPreparationActive={athleticPreparationInstructorIds.has(collaborator.id)}
                    />
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
                      <strong className="member-stat-locked" title={getHiddenStatsHint(statsTier)}>???</strong>
                    )}
                  </span>
                  <span>
                    <small>Stile</small>
                    {officialStats ? (
                      <OfficialStatValue value={officialStats.style} />
                    ) : (
                      <strong className="member-stat-locked" title={getHiddenStatsHint(statsTier)}>???</strong>
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
                    disabled={automaticAssignment}
                    title={automaticAssignment ? "Gestita dall'Assegnazione automatica" : undefined}
                    onChange={(event) => onAssign(
                      collaborator.id,
                      (event.target.value || null) as CollaboratorAssignment,
                    )}
                  >
                    <option value="">Non assegnato</option>
                    {Object.keys(COLLABORATOR_ASSIGNMENT_LABELS)
                      .filter((value) => isCollaboratorAssignmentAvailable(value as CollaboratorAssignment, state.unlocks))
                      .map((value) => (
                      <option value={value} key={value}>
                        {getCollaboratorAssignmentLabel(
                          value as Exclude<CollaboratorAssignment, null>,
                          state.unlocks.social,
                        )}
                      </option>
                    ))}
                  </select>
                  {collaborator.assignment === "instructor" ? (
                    <InstructorCourseTabs
                      collaborator={collaborator}
                      state={stateOverride}
                      onStartTraining={onStartTraining}
                      onBookTechnicianCourse={onBookTechnicianCourse}
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
          {gridMode
            // The 8th collaborator opens the Consiglio: seven places, the second row centred.
            ? Array.from(
                { length: Math.max(0, GAME_CONFIG.collaboratorAggregateUnlockCount - 1 - state.collaborators.length) },
                (_, index) => (
                  <div className="collaborator-slot" key={`slot-${index}`}>
                    <strong>Posto libero</strong>
                    <span>Il prossimo Ultra Raro dopo il Corso Y</span>
                  </div>
                ),
              )
            : null}
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
          state={stateOverride}
          collaborator={selectedCollaborator}
          contact={contactsById.get(selectedCollaborator.contactId)}
          automation={selectedAutomation}
          collaboratorsById={collaboratorsById}
          onAssign={onAssign}
          allowAssignment={!automaticAssignment}
          onStartTraining={onStartTraining}
          onBookTechnicianCourse={onBookTechnicianCourse}
          onClose={() => setSelectedCollaboratorId(null)}
        />
      ) : null}
    </section>
  );
}
