import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { EquipmentConditionBar } from "../../components/equipment/EquipmentConditionBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import {
  COLLABORATOR_PRESET_IDS,
  getCollaboratorAssignmentCounts,
} from "../../game/collaboratorManagement";
import { selectActiveEmail } from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  CollaboratorPresetId,
  FormId,
  GameState,
} from "../../game/types";
import { AggregatedTeachingBar } from "./AggregatedTeachingBar";
import { CollaboratorSectorPanel } from "./CollaboratorSectorPanel";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import {
  getAvailableInstructorCourseCount,
  getInstructorCoverageForms,
  getInstructorTeachingEntries,
} from "./instructorGroupPresentation";
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

function getPresetLabel(presetId: CollaboratorPresetId): string {
  return `Preset ${COLLABORATOR_PRESET_IDS.indexOf(presetId) + 1}`;
}

function CollaboratorPresetToolbar({
  state,
  available,
  onSave,
  onApply,
}: {
  state: GameState;
  available: number;
  onSave: (
    presetId: CollaboratorPresetId,
    targets: Record<CollaboratorMasteryRole, number>,
  ) => void;
  onApply: (presetId: CollaboratorPresetId) => void;
}) {
  return (
    <div className="collaborator-command-rail">
      <div className="collaborator-availability">
        <Icon name="people" />
        <span>Collaboratori disponibili</span>
        <strong>{available}/{state.collaborators.length}</strong>
      </div>

      <div className="collaborator-preset-toolbar" aria-label="Preset collaboratori">
        {COLLABORATOR_PRESET_IDS.map((presetId) => {
          const preset = state.collaboratorManagement.presets[presetId];
          const active = state.collaboratorManagement.activePresetId === presetId;
          const total = Object.values(preset.targets).reduce((sum, count) => sum + count, 0);
          return (
            <span
              className={`collaborator-preset-slot${active ? " is-active" : ""}${preset.saved ? " is-saved" : ""}`}
              key={presetId}
            >
              <button
                type="button"
                className="collaborator-preset-apply"
                disabled={!preset.saved}
                onClick={() => onApply(presetId)}
                aria-pressed={active}
              >
                <span>{getPresetLabel(presetId)}</span>
                <small>{preset.saved ? `${total} posti${active ? " · Attivo" : ""}` : "Vuoto"}</small>
              </button>
              <button
                type="button"
                className="collaborator-preset-save"
                title={`Salva ${getPresetLabel(presetId)}`}
                aria-label={`Salva preset ${COLLABORATOR_PRESET_IDS.indexOf(presetId) + 1}`}
                onClick={() => onSave(presetId, state.collaboratorManagement.targets)}
              >
                <Icon name="save" />
              </button>
            </span>
          );
        })}
      </div>

      {state.collaboratorManagement.hasUnsavedChanges ? (
        <span className="collaborator-unsaved" role="status">
          <Icon name="warning" />
          Modifiche non salvate
        </span>
      ) : null}
    </div>
  );
}

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
    <article className="collaborator-sector-card">
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
          <small>Attività del gruppo</small>
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
        <div className="sector-card-waiting"><span /><small>In attesa</small></div>
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
}: {
  state: GameState;
  actual: number;
  target: number;
  available: number;
  now: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpen: () => void;
}) {
  const instructors = state.collaborators.filter(
    (collaborator) => collaborator.assignment === "instructor",
  );
  const instructorIds = new Set(instructors.map((instructor) => instructor.id));
  const entries = getInstructorTeachingEntries(state).filter((entry) =>
    instructorIds.has(entry.instructorId),
  );
  const coverage = getInstructorCoverageForms(instructors);
  const availableInstructorCourses = getAvailableInstructorCourseCount(instructors);
  const instructorsTeaching = new Set(entries.map((entry) => entry.instructorId));
  const idleInstructors = Math.max(0, instructors.length - instructorsTeaching.size);
  const prepUnlocked = (state.upgrades["athletic-preparation"] ?? 0) > 0;
  const prepProgress = Math.min(100, Math.max(0, state.automation.lessonBuffer * 100));
  const prepIsPrimary = entries.length === 0 && prepUnlocked && instructors.length > 0;

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
            <span>
              <small>Attività principale</small>
              <strong>{entries.length > 0
                ? "Insegnamento in corso..."
                : prepIsPrimary
                  ? "Preparazione atletica in corso..."
                  : "In attesa"}</strong>
            </span>
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
          ) : prepIsPrimary ? (
            <>
              <ProgressBar label="Preparazione atletica" value={prepProgress} />
              <p><strong>{idleInstructors} istruttori disponibili</strong><span>{Math.round(prepProgress)}% prossimo miglioramento</span></p>
            </>
          ) : (
            <div className="instructor-empty-progress"><span /><small>Nessun allievo compatibile</small></div>
          )}
        </section>

        <section className="instructor-coverage">
          <header>
            <span><small>Copertura didattica</small><strong>{coverage.length} Forme insegnabili</strong></span>
            <span className="instructor-coverage-actions">
              <SectorMasteryIndicator collaborators={instructors} role="instructor" />
              {availableInstructorCourses > 0 ? (
                <button
                  type="button"
                  className="instructor-courses-link"
                  aria-label={`Apri ${availableInstructorCourses} ${availableInstructorCourses === 1 ? "Corso Istruttori disponibile" : "Corsi Istruttori disponibili"}`}
                  onClick={onOpen}
                >
                  Corsi Istruttori disponibili
                  <Icon name="arrowRight" />
                </button>
              ) : null}
            </span>
          </header>
          <FormLogoStrip
            className="sector-form-strip"
            forms={coverage}
            instructorForms={coverage}
            showLabels={false}
          />
          {coverage.length === 0 ? <small>Forma gli istruttori per ampliare la copertura.</small> : null}
        </section>
      </div>

      {prepUnlocked && instructors.length > 0 && !prepIsPrimary ? (
        <div className="instructor-preparation-row">
          <span className="sector-card-icon"><Icon name="trend" /></span>
          <span>
            <strong>Preparazione atletica</strong>
            <small>{idleInstructors > 0
              ? `Attività secondaria · ${idleInstructors} istruttori senza lezioni`
              : "In attesa · tutti gli istruttori stanno insegnando"}</small>
          </span>
          <ProgressBar label="Prossimo miglioramento atletico" value={prepProgress} />
          <strong>{Math.round(prepProgress)}%</strong>
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
  onPayInstructorCertificates,
}: {
  state: GameState;
  collaboratorsById: Map<string, Collaborator>;
  onSavePreset: (
    presetId: CollaboratorPresetId,
    targets: Record<CollaboratorMasteryRole, number>,
  ) => void;
  onApplyPreset: (presetId: CollaboratorPresetId) => void;
  onIncrement: (assignment: CollaboratorMasteryRole) => void;
  onDecrement: (assignment: CollaboratorMasteryRole) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
}) {
  const [openRole, setOpenRole] = useState<CollaboratorMasteryRole | null>(null);
  const assignmentCounts = getCollaboratorAssignmentCounts(state);
  const available = state.collaborators.filter((collaborator) => collaborator.assignment === null).length;
  const hasTimedWork = state.acquisitionEvents.some((event) => event.status === "running") ||
    getInstructorTeachingEntries(state).length > 0 ||
    state.collaborators.some((collaborator) => collaborator.assignment === "equipment");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const targets = state.collaboratorManagement.targets;
  const panelProps = useMemo(() => ({
    collaboratorsById,
    onStartTraining,
    onPayInstructorCertificates,
  }), [collaboratorsById, onPayInstructorCertificates, onStartTraining]);

  return (
    <section
      className="collaborator-sector-view"
      aria-label="Gestione aggregata dei collaboratori"
      data-tutorial-region="collaborator-sectors"
    >
      <CollaboratorPresetToolbar
        state={state}
        available={available}
        onSave={onSavePreset}
        onApply={onApplyPreset}
      />

      <InstructorSectorCard
        state={state}
        actual={assignmentCounts.instructor}
        target={targets.instructor}
        available={available}
        now={now}
        onIncrement={() => onIncrement("instructor")}
        onDecrement={() => onDecrement("instructor")}
        onOpen={() => setOpenRole("instructor")}
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
          <span>Nuovo settore</span>
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
