import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { COLLABORATOR_ASSIGNMENT_LABELS } from "../../content/collaboratorRoles";
import {
  COLLABORATOR_MASTERY_ROLE_LABELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasCompletedCourseX } from "../../game/athleteStats";
import { useGameTime } from "../../game/GameTimeContext";
import { selectActiveEmail } from "../../game/selectors";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getSocialUnlockRequirementLabel } from "../../game/unlocks";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import {
  InstructorCompactActivity,
  InstructorCompactTraining,
} from "./TrainingControl";

const COLLABORATORS_PER_PAGE = 25;

export function CollaboratorList({
  state,
  onAssign,
  onStartTraining,
  onPayInstructorCertificates,
  onToggleInstructorAutomation,
  onToggleAgonistCourses,
  collaboratorsById,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
  onToggleAgonistCourses?: (enabled: boolean) => void;
  collaboratorsById: Map<string, GameState["collaborators"][number]>;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const contactsById = useMemo(
    () => new Map<string, Contact>(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const activeEmail = selectActiveEmail(state);
  const hasTimedAutomation = state.acquisitionEvents.some((event) =>
    event.status === "running" && event.collaboratorId !== undefined
  );
  const now = useGameTime(hasTimedAutomation, 1_000);
  const pageCount = Math.max(
    1,
    Math.ceil(state.collaborators.length / COLLABORATORS_PER_PAGE),
  );
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleCollaborators = state.collaborators.slice(
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
      {(state.upgrades["technical-arena"] ?? 0) >= 1 ? (
        <div className="agonist-course-setting">
          <span>
            <strong>Corso Agonisti</strong>
            <small>Protegge gli allievi a rischio senza altre Forme disponibili.</small>
          </span>
          <label className="instructor-toggle">
            <input
              type="checkbox"
              checked={state.automation.agonistCoursesEnabled}
              onChange={(event) => onToggleAgonistCourses?.(event.target.checked)}
            /> Attivo
          </label>
        </div>
      ) : null}

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
          <div className="collaborator-table-head" aria-hidden="true">
            <span>Collaboratore</span>
            <span>Assegnazione attuale</span>
            <span>Attività</span>
            <span>Arena / Stile</span>
            <span>Assegnazione</span>
            <span>Azioni</span>
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
                      ? COLLABORATOR_ASSIGNMENT_LABELS[collaborator.assignment]
                      : "Non assegnato"}
                  </strong>
                  <small>
                    {collaborator.assignment && masteryProgress
                      ? `${COLLABORATOR_MASTERY_ROLE_LABELS[collaborator.assignment]} · ${
                          masteryProgress.definition.name
                        }`
                      : "Assegna un ruolo per iniziare"}
                  </small>
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
                      {automation.progress === undefined ? (
                        <span className="collaborator-activity-progress is-empty">
                          <strong>—</strong>
                        </span>
                      ) : (
                        <span className="collaborator-activity-progress">
                          <strong>{automation.progress}%</strong>
                          <ProgressBar
                            className="collaborator-progress-bar"
                            label={automation.progressLabel ?? automation.title}
                            value={automation.progress}
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
                    value={collaborator.assignment ?? ""}
                    onChange={(event) => onAssign(
                      collaborator.id,
                      (event.target.value || null) as CollaboratorAssignment,
                    )}
                  >
                    <option value="">Non assegnato</option>
                    {Object.entries(COLLABORATOR_ASSIGNMENT_LABELS).map(([value, label]) => {
                      const disabled = value === "social" && !state.unlocks.social;
                      const suffix = disabled
                        ? ` — si sblocca con ${getSocialUnlockRequirementLabel()}`
                        : "";
                      return (
                        <option value={value} key={value} disabled={disabled}>
                          {label}{suffix}
                        </option>
                      );
                    })}
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
