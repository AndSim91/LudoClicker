import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasCompletedCourseX } from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import { selectActiveEmail } from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { getInstructorCoverageForms, getInstructorTeachingEntries } from "./instructorGroupPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";
import { InstructorCompactActivity, InstructorCompactTraining } from "./TrainingControl";

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function SectorCollaboratorRow({
  state,
  collaborator,
  contact,
  now,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  onOpen,
}: {
  state: GameState;
  collaborator: Collaborator;
  contact?: Contact;
  now: number;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onOpen: () => void;
}) {
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
  const officialStats = contact && hasCompletedCourseX(collaborator.forms)
    ? getContactPreparation(contact, collaborator.forms)
    : undefined;

  return (
    <article
      className={`sector-roster-row${collaborator.assignment === "instructor" ? " is-instructor" : ""} ${getRarityClassName(
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
        <span>
          <PersonName
            displayName={collaborator.displayName}
            rarity={collaborator.rarity}
            secretLegendary={Boolean(contact?.secretLegendaryId)}
          />
          {contact ? <small>{contact.email}</small> : null}
        </span>
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
          <InstructorCompactActivity collaborator={collaborator} state={state} />
        ) : (
          <>
            <strong>{activity.title}</strong>
            <small>{activity.detail}</small>
          </>
        )}
      </div>

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

      {collaborator.assignment === "instructor" ? (
        <div className="sector-roster-training" data-label="Formazione">
          <InstructorCompactTraining
            collaborator={collaborator}
            state={state}
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
  state,
  role,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  onClose,
}: {
  state: GameState;
  role: CollaboratorMasteryRole;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onClose: () => void;
}) {
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const assigned = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment === role),
    [role, state.collaborators],
  );
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const hasTimedWork = getInstructorTeachingEntries(state).length > 0 ||
    state.acquisitionEvents.some((event) => event.status === "running");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
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

  return (
    <>
      <button
        type="button"
        className="sector-panel-backdrop"
        aria-label={`Chiudi ${roleLabel} cliccando sullo sfondo`}
        onClick={onClose}
      />
      <aside
        className={`collaborator-sector-panel${role === "instructor" ? " is-instructor" : ""}`}
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
          {role === "instructor" ? (
            <span><strong>{getInstructorCoverageForms(assigned).length}</strong><small>Forme coperte</small></span>
          ) : null}
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
              <div className="sector-roster-head" aria-hidden="true">
                <span>Collaboratore</span><span>Maestria</span><span>Attività</span><span>Arena / Stile</span><span>Forme</span>
                {role === "instructor" ? <span>Formazione</span> : null}
                <span />
              </div>
              {assigned.map((collaborator) => (
                <SectorCollaboratorRow
                  key={collaborator.id}
                  state={state}
                  collaborator={collaborator}
                  contact={contactsById.get(collaborator.contactId)}
                  now={now}
                  collaboratorsById={collaboratorsById}
                  onStartTraining={onStartTraining}
                  onBookTechnicianCourse={onBookTechnicianCourse}
                  onOpen={() => setSelectedCollaboratorId(collaborator.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {selectedCollaborator && selectedAutomation ? (
        <CollaboratorDetailDrawer
          state={state}
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
