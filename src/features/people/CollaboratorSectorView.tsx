import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { EquipmentConditionBar } from "../../components/equipment/EquipmentConditionBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import { getFormDefinition } from "../../content/forms";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import { getCollaboratorAssignmentCounts } from "../../game/collaboratorManagement";
import { isSummerBreak } from "../../game/calendar";
import { selectActiveEmail } from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  FormId,
  GameState,
} from "../../game/types";
import { AggregatedTeachingBar } from "./AggregatedTeachingBar";
import { CollaboratorSectorPanel } from "./CollaboratorSectorPanel";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import {
  getAvailableInstructorCourses,
  getInternalInstructorCourseEntries,
  getInstructorCoverageForms,
  getInstructorTrainingProgress,
  getInstructorTeachingEntries,
  getTechnicianCoverageForms,
} from "./instructorGroupPresentation";
import { InstructorCourseShortcut } from "./InstructorCourseShortcut";
import { FormLogoStrip } from "./PersonPresentation";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";

const STANDARD_ROLES: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
];

const ROLE_PRESENTATION: Record<
  CollaboratorMasteryRole,
  { icon: IconName; description: string }
> = {
  writing: {
    icon: "megaphone",
    description: "Email prioritarie e produzione automatica di contenuti.",
  },
  events: {
    icon: "calendar",
    description: "Organizzazione degli eventi e acquisizione di nuovi contatti.",
  },
  equipment: {
    icon: "wrench",
    description: "Manutenzione dell'usura e riparazione delle spade.",
  },
  instructor: {
    icon: "people",
    description: "Forme, Corso Agonisti e preparazione atletica quando disponibile.",
  },
};

function StaffingStepper({
  label,
  actual,
  target,
  available,
  onIncrement,
  onDecrement,
}: {
  label: string;
  actual: number;
  target: number;
  available: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const transitioning = actual !== target;
  return (
    <div className="sector-staffing-stepper" aria-label={`Collaboratori in ${label}`}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={target <= 0}
        aria-label={`Riduci collaboratori in ${label}`}
      >
        <Icon name="minus" />
      </button>
      <span>
        <strong>{actual}</strong>
        {transitioning ? <small>→ {target}</small> : null}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={available <= 0}
        aria-label={`Aumenta collaboratori in ${label}`}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}

function StandardSectorCard({
  state,
  role,
  actual,
  target,
  available,
  now,
  onIncrement,
  onDecrement,
  onOpen,
}: {
  state: GameState;
  role: CollaboratorMasteryRole;
  actual: number;
  target: number;
  available: number;
  now: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpen: () => void;
}) {
  const label = getCollaboratorAssignmentLabel(role, state.unlocks.social);
  const assigned = state.collaborators.filter((collaborator) => collaborator.assignment === role);
  const activeEmail = selectActiveEmail(state);
  let representative = assigned[0];
  if (role === "events") {
    const nextEvent = [...state.acquisitionEvents]
      .filter((event) => event.status === "running" && event.collaboratorId)
      .sort((a, b) => a.resolvesAt - b.resolvesAt)[0];
    representative = nextEvent
      ? state.collaborators.find((collaborator) => collaborator.id === nextEvent.collaboratorId) ?? representative
      : representative;
  }
  const activity = representative
    ? getCollaboratorAutomationPresentation({
        state,
        collaboratorId: representative.id,
        assignment: role,
        now,
        activeEmail,
      })
    : { title: "In attesa", detail: "Nessun collaboratore assegnato" };
  return (
    <article className={`collaborator-sector-card${assigned.length === 0 ? " is-empty" : ""}`}>
      <header>
        <span className="sector-card-icon"><Icon name={ROLE_PRESENTATION[role].icon} /></span>
        <span>
          <h3>{label}</h3>
          <small>{ROLE_PRESENTATION[role].description}</small>
        </span>
        <StaffingStepper
          label={label}
          actual={actual}
          target={target}
          available={available}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      </header>

      <div className="sector-card-activity">
        <span>
          <strong>{activity.title}</strong>
          {activity.detail ? <span>{activity.detail}</span> : null}
        </span>
        <SectorMasteryIndicator collaborators={assigned} role={role} />
      </div>
      {role === "equipment" ? (
        <div className="sector-card-equipment">
          <span className="sector-card-equipment-summary">
            <small>Usura attrezzatura</small>
            <strong>{Math.round(state.equipment.wear)}/100</strong>
          </span>
          <EquipmentConditionBar
            equipment={state.equipment}
            compact
            ariaLabel="Condizione attrezzatura del settore Attrezzatura"
          />
        </div>
      ) : activity.progress === undefined ? (
        <div className="sector-card-waiting" aria-label="Nessuna attività in corso"><span /></div>
      ) : (
        <div className="sector-card-progress">
          <ProgressBar
            label={activity.progressLabel ?? activity.title}
            value={activity.progress}
            durationMs={activity.durationMs}
          />
          <small>{Math.round(activity.progress)}%</small>
        </div>
      )}

      <button
        type="button"
        className="sector-manage-button"
        disabled={assigned.length === 0}
        onClick={onOpen}
      >
        Gestisci settore
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

function InstructorSectorCard({
  state,
  actual,
  target,
  available,
  now,
  onIncrement,
  onDecrement,
  onOpen,
  onStartTraining,
}: {
  state: GameState;
  actual: number;
  target: number;
  available: number;
  now: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpen: () => void;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const isPaused = useGameTimeSource()?.isPaused ?? false;
  const instructors = state.collaborators.filter(
    (collaborator) => collaborator.assignment === "instructor",
  );
  const instructorIds = new Set(instructors.map((instructor) => instructor.id));
  const entries = getInstructorTeachingEntries(state).filter((entry) =>
    instructorIds.has(entry.instructorId),
  );
  const coverage = getInstructorCoverageForms(instructors);
  const technicianCoverage = getTechnicianCoverageForms(instructors);
  const internalCourses = getInternalInstructorCourseEntries(instructors);
  const availableInstructorCourses = getAvailableInstructorCourses(instructors);
  const singleInstructorCourse = availableInstructorCourses.length === 1
    ? availableInstructorCourses[0]
    : undefined;
  const instructorsTeaching = new Set(entries.map((entry) => entry.instructorId));
  const idleInstructors = Math.max(0, instructors.length - instructorsTeaching.size);
  const prepUnlocked = (state.upgrades["athletic-preparation"] ?? 0) > 0;
  const prepIsPrimary = entries.length === 0 && prepUnlocked && instructors.length > 0;
  const summerBreak = isSummerBreak(state.school.currentMonth);
  const preparationIsActive = !summerBreak && idleInstructors > 0;

  return (
    <article className="instructor-sector-card">
      <header>
        <span className="sector-card-icon is-primary"><Icon name="people" /></span>
        <span className="instructor-sector-title">
          <span>Centro didattico</span>
          <h3>Istruttori</h3>
          <small>{prepUnlocked
            ? ROLE_PRESENTATION.instructor.description
            : "Forme e Corso Agonisti."}</small>
        </span>
        <StaffingStepper
          label="Istruttori"
          actual={actual}
          target={target}
          available={available}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      </header>

      <div className="instructor-operations-grid">
        <section className="instructor-main-activity">
          <div>
            <span className="sector-status-dot" aria-hidden="true" />
            <strong>{entries.length > 0
              ? "Insegnamento in corso..."
              : prepIsPrimary
                ? summerBreak
                  ? "Pausa estiva"
                  : "Preparazione atletica in corso..."
                : "In attesa"}</strong>
          </div>
          {entries.length > 0 ? (
            <>
              <AggregatedTeachingBar
                entries={entries}
                now={now}
                technicalArenaLevel={state.upgrades["technical-arena"] ?? 0}
              />
              <p>
                <strong>{entries.length} {entries.length === 1 ? "corso attivo" : "corsi attivi"}</strong>
              </p>
            </>
          ) : prepIsPrimary && summerBreak ? (
            <div className="instructor-empty-progress">
              <span />
              <small>Preparazione atletica sospesa</small>
            </div>
          ) : prepIsPrimary ? (
            <>
              <ProgressBar
                className="instructor-preparation-loop"
                label="Preparazione atletica continuativa"
                value={0}
                valueText={isPaused ? "Attività in pausa" : "Attività continuativa"}
                indeterminate
                paused={isPaused}
              />
              <p><strong>{idleInstructors} istruttori disponibili</strong><span>Attività continuativa</span></p>
            </>
          ) : (
            <div className="instructor-empty-progress"><span /><small>Nessun allievo compatibile</small></div>
          )}
        </section>

        <section className="instructor-coverage">
          <div className="instructor-coverage-forms">
            <span><small>Copertura didattica</small><strong>{coverage.length} Forme insegnabili</strong></span>
            <FormLogoStrip
              className="sector-form-strip"
              forms={coverage}
              instructorForms={coverage}
              technicianForms={technicianCoverage}
              showLabels={false}
            />
            {coverage.length === 0 ? <small>Forma gli istruttori per ampliare la copertura.</small> : null}
          </div>
          <div className="instructor-coverage-actions">
            <SectorMasteryIndicator collaborators={instructors} role="instructor" />
            {singleInstructorCourse ? (
              <InstructorCourseShortcut
                course={singleInstructorCourse}
                state={state}
                onStartTraining={onStartTraining}
              />
            ) : availableInstructorCourses.length > 0 ? (
              <button
                type="button"
                className="instructor-courses-link"
                aria-label={`Apri ${availableInstructorCourses.length} Corsi Istruttori disponibili`}
                onClick={onOpen}
              >
                Corsi Istruttori disponibili
                <Icon name="arrowRight" />
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {internalCourses.length > 0 ? (
        <section className="internal-instructor-courses" aria-label="Corsi Istruttori interni in svolgimento">
          <div className="internal-instructor-courses-heading">
            <strong>Corsi Istruttori interni</strong>
            <small>{internalCourses.length} in svolgimento</small>
          </div>
          <div className="internal-instructor-course-list">
            {internalCourses.map((entry) => {
              const progress = getInstructorTrainingProgress(entry.training, now);
              const formName = getFormDefinition(entry.formId)?.longName ?? entry.formId;
              return (
                <div className="internal-instructor-course" key={entry.trainee.id}>
                  <FormLogoStrip
                    className="sector-form-strip"
                    forms={[entry.formId]}
                    instructorForms={[entry.formId]}
                    showLabels={false}
                  />
                  <span>
                    <strong>{formName} · {entry.trainee.displayName}</strong>
                    <small>con il Tecnico {entry.technician.displayName}</small>
                  </span>
                  <ProgressBar
                    label={`Corso Istruttori interno di ${entry.trainee.displayName}`}
                    value={progress}
                    durationMs={entry.training.completesAt - entry.training.startedAt}
                  />
                  <strong>{Math.round(progress)}%</strong>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {prepUnlocked && instructors.length > 0 && !prepIsPrimary ? (
        <div className="instructor-preparation-row">
          <span className="sector-card-icon"><Icon name="trend" /></span>
          <span>
            <strong>Preparazione atletica</strong>
            <small>{summerBreak
              ? "Pausa estiva"
              : idleInstructors > 0
                ? `Attività secondaria · ${idleInstructors} istruttori senza lezioni`
                : "In attesa · tutti gli istruttori stanno insegnando"}</small>
          </span>
          <ProgressBar
            className={`instructor-preparation-loop${preparationIsActive ? "" : " is-inactive"}`}
            label={summerBreak
              ? "Preparazione atletica in pausa"
              : preparationIsActive
                ? "Preparazione atletica continuativa"
                : "Preparazione atletica in attesa"}
            value={0}
            valueText={summerBreak
              ? "Pausa estiva"
              : !preparationIsActive
                ? "In attesa di istruttori disponibili"
              : isPaused
                ? "Attività in pausa"
                : "Attività continuativa"}
            indeterminate={preparationIsActive}
            paused={isPaused}
          />
        </div>
      ) : null}

      <button type="button" className="sector-manage-button is-primary" onClick={onOpen}>
        Apri centro didattico
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

export function CollaboratorSectorView({
  state,
  collaboratorsById,
  onSavePreset,
  onApplyPreset,
  onIncrement,
  onDecrement,
  onStartTraining,
  onBookTechnicianCourse,
}: {
  state: GameState;
  collaboratorsById: Map<string, Collaborator>;
  onIncrement: (assignment: CollaboratorMasteryRole) => void;
  onDecrement: (assignment: CollaboratorMasteryRole) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
}) {
  const [openRole, setOpenRole] = useState<CollaboratorMasteryRole | null>(null);
  const assignmentCounts = getCollaboratorAssignmentCounts(state);
  const available = state.collaborators.filter((collaborator) => collaborator.assignment === null).length;
  const hasTimedWork = state.acquisitionEvents.some((event) => event.status === "running") ||
    getInstructorTeachingEntries(state).length > 0 ||
    getInternalInstructorCourseEntries(state.collaborators).length > 0 ||
    state.collaborators.some((collaborator) => collaborator.assignment === "equipment");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const targets = state.collaboratorManagement.targets;
  const panelProps = useMemo(() => ({
    collaboratorsById,
    onStartTraining,
    onBookTechnicianCourse,
  }), [collaboratorsById, onBookTechnicianCourse, onStartTraining]);

  return (
    <section
      className="collaborator-sector-view"
      aria-label="Gestione aggregata dei collaboratori"
      data-tutorial-region="collaborator-sectors"
    >
      <InstructorSectorCard
        state={state}
        actual={assignmentCounts.instructor}
        target={targets.instructor}
        available={available}
        now={now}
        onIncrement={() => onIncrement("instructor")}
        onDecrement={() => onDecrement("instructor")}
        onOpen={() => setOpenRole("instructor")}
        onStartTraining={onStartTraining}
      />

      <div className="collaborator-sector-grid">
        {STANDARD_ROLES.map((role) => (
          <StandardSectorCard
            key={role}
            state={state}
            role={role}
            actual={assignmentCounts[role]}
            target={targets[role]}
            available={available}
            now={now}
            onIncrement={() => onIncrement(role)}
            onDecrement={() => onDecrement(role)}
            onOpen={() => setOpenRole(role)}
          />
        ))}
        <div className="collaborator-sector-placeholder" aria-hidden="true">
          <Icon name="settings" />
          <span>Coming soon...</span>
        </div>
      </div>

      {openRole ? (
        <CollaboratorSectorPanel
          state={state}
          role={openRole}
          {...panelProps}
          onClose={() => setOpenRole(null)}
        />
      ) : null}
    </section>
  );
}
