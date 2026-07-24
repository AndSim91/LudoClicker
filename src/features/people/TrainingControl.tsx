import { useMemo, useState } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  getAvailableForms,
  getFormDefinition,
  getFormTrainingCount,
  getInstructorConversionCost,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  getTrainingCourseTitle,
  isInstructorForm,
  isAgonistCourse,
  type FormDefinition,
  type FormStudent,
} from "../../content/forms";
import {
  getAnnualFormTrainingLimit,
  hasAutomaticInstructorCertificates,
  hasFreeFormTraining,
} from "../../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { TrainingFormPreview } from "./PersonPresentation";

type InstructorTeachingEntry = {
  id: string;
  displayName: string;
  training: NonNullable<FormStudent["training"]>;
};

function getInstructorTeachingStudents(
  contacts: GameState["contacts"],
  collaborators: GameState["collaborators"],
  instructorId: string,
): InstructorTeachingEntry[] {
  return [
    ...contacts.flatMap((contact) => contact.training?.instructorId === instructorId
      ? [{ id: contact.id, displayName: `${contact.firstName} ${contact.lastName}`, training: contact.training }]
      : []),
    ...collaborators.flatMap((collaborator) =>
      collaborator.training?.instructorId === instructorId
        ? [{ id: collaborator.id, displayName: collaborator.displayName, training: collaborator.training }]
        : []),
  ];
}

function useInstructorTeachingEntries(state: GameState, instructorId: string) {
  return useMemo(
    () => getInstructorTeachingStudents(
      state.contacts,
      state.collaborators,
      instructorId,
    ),
    [state.contacts, state.collaborators, instructorId],
  );
}

function getTrainingProgress(
  training: NonNullable<FormStudent["training"]>,
  now: number,
): number {
  if (training.status === "waitingForEquipment") return 0;
  const duration = training.completesAt - training.startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, ((now - training.startedAt) / duration) * 100));
}

function getDisplayedTrainingCost(
  state: GameState,
  personId: string,
  collaborator: Collaborator | undefined,
  definition: FormDefinition,
  qualification: boolean,
): number {
  if (hasFreeFormTraining(state.upgrades)) return 0;
  if (qualification) return getInstructorQualificationCost(definition.cost);
  if (collaborator?.assignment === "instructor" && isInstructorForm(definition.id)) {
    return hasAutomaticInstructorCertificates(state.upgrades)
      ? definition.cost
      : getInstructorFormCost(definition.cost);
  }
  if (
    collaborator?.assignment !== "instructor" &&
    selectAvailableInstructor(state, definition.id, personId)
  ) {
    return getStudentFormCost(definition.cost);
  }
  return definition.cost;
}

function InstructorTeachingSummary({
  entries,
  now,
  technicalArenaLevel,
}: {
  entries: InstructorTeachingEntry[];
  now: number;
  technicalArenaLevel: number;
}) {
  return (
    <div className="instructor-teaching" aria-label="Allievi in formazione">
      {entries.map((entry) => {
        const definition = isAgonistCourse(entry.training.formId)
          ? undefined
          : getFormDefinition(entry.training.formId);
        const waitingForEquipment = entry.training.status === "waitingForEquipment";
        const progress = getTrainingProgress(entry.training, now);
        return (
          <div className="instructor-student" key={entry.id}>
            <span className="instructor-student-copy">
              <strong>{entry.displayName}</strong>
              <small>
                {getTrainingCourseTitle(
                  entry.training.formId,
                  technicalArenaLevel,
                  entry.training.agonistCourseGrantsStats,
                )}
                {definition?.branch ? ` · ${definition.branch}` : ""}
              </small>
            </span>
            <strong className="instructor-student-progress">
              {waitingForEquipment ? "In attesa di spade" : `${Math.round(progress)}%`}
            </strong>
            <ProgressBar
              className="instructor-student-progress-bar"
              label={`Formazione di ${entry.displayName}`}
              value={progress}
              durationMs={entry.training.completesAt - entry.training.startedAt}
            />
          </div>
        );
      })}
    </div>
  );
}

export function InstructorCompactActivity({
  collaborator,
  state,
}: {
  collaborator: Collaborator;
  state: GameState;
}) {
  const teaching = useInstructorTeachingEntries(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const now = useGameTime(
    teaching.length > 0,
    GAME_CONFIG.progressUpdateIntervalMs,
  );

  if (teaching.length === 0) {
    return (
      <div className="instructor-compact-activity-list" aria-label="Allievi seguiti">
        <span className="instructor-compact-activity is-waiting">
          <span className="collaborator-activity-title">
            <strong>In attesa di un allievo</strong>
            <small>0/{capacity} posti</small>
          </span>
          <span className="collaborator-activity-progress is-empty">
            <strong>—</strong>
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="instructor-compact-activity-list" aria-label="Allievi seguiti">
      {teaching.map((entry) => {
        const waitingForEquipment = entry.training.status === "waitingForEquipment";
        const progress = getTrainingProgress(entry.training, now);
        return (
          <span className="instructor-compact-activity" key={entry.id}>
            <span className="collaborator-activity-title">
              <strong>{entry.displayName}</strong>
              <small>{getTrainingCourseTitle(
                entry.training.formId,
                state.upgrades["technical-arena"] ?? 0,
                entry.training.agonistCourseGrantsStats,
              )}</small>
            </span>
            <span className="collaborator-activity-progress">
              <strong>{waitingForEquipment ? "In attesa di spade" : `${Math.round(progress)}%`}</strong>
              <ProgressBar
                className="collaborator-progress-bar"
                label={`Formazione di ${entry.displayName}`}
                value={progress}
                durationMs={entry.training.completesAt - entry.training.startedAt}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function InstructorCompactTraining({
  collaborator,
  state,
  onStartTraining,
  onPayInstructorCertificates,
  collaboratorsById,
}: {
  collaborator: Collaborator;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  collaboratorsById: Map<string, Collaborator>;
}) {
  const hasMissingInstructorCertificates = getInstructorConversionCost(collaborator) > 0;
  const instructorCertificatesCost = hasFreeFormTraining(state.upgrades)
    ? 0
    : getInstructorConversionCost(collaborator);

  return (
    <div className="instructor-compact-training" aria-label="Formazione istruttore">
      {hasMissingInstructorCertificates ? (
        <div className="instructor-compact-certification">
          <span>Attestati · {formatCurrency(instructorCertificatesCost)}</span>
          <button
            type="button"
            disabled={state.school.euros < instructorCertificatesCost}
            onClick={() => onPayInstructorCertificates?.(collaborator.id)}
          >
            {instructorCertificatesCost === 0 ? "Ottieni attestati" : "Paga attestati"}
          </button>
        </div>
      ) : null}
      <TrainingControl
        personId={collaborator.id}
        displayName={collaborator.displayName}
        student={collaborator}
        state={state}
        collaboratorsById={collaboratorsById}
        onStartTraining={onStartTraining}
        variant="compact"
      />
    </div>
  );
}

export function InstructorPanel({
  collaborator,
  state,
  onStartTraining,
  onPayInstructorCertificates,
  collaboratorsById,
}: {
  collaborator: Collaborator;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  collaboratorsById: Map<string, Collaborator>;
}) {
  const teachingCount = selectInstructorTeachingCount(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const teaching = useInstructorTeachingEntries(state, collaborator.id);
  const now = useGameTime(
    teaching.length > 0,
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const hasMissingInstructorCertificates = getInstructorConversionCost(collaborator) > 0;
  const instructorCertificatesCost = hasFreeFormTraining(state.upgrades)
    ? 0
    : getInstructorConversionCost(collaborator);

  return (
    <div className="instructor-panel">
      <div className="instructor-panel-heading">
        <span><strong>Lezioni automatiche</strong><small>{teachingCount}/{capacity} allievi</small></span>
      </div>
      {hasMissingInstructorCertificates ? (
        <div className="instructor-certification-action">
          <span className="instructor-certification-copy">
            <small>Attestati mancanti</small>
            <strong>{formatCurrency(instructorCertificatesCost)}</strong>
          </span>
          <button
            type="button"
            disabled={state.school.euros < instructorCertificatesCost}
            onClick={() => onPayInstructorCertificates?.(collaborator.id)}
          >
            {instructorCertificatesCost === 0 ? "Ottieni attestati" : "Paga attestati"}
          </button>
        </div>
      ) : null}
      {teaching.length > 0
        ? <InstructorTeachingSummary
            entries={teaching}
            now={now}
            technicalArenaLevel={state.upgrades["technical-arena"] ?? 0}
          />
        : <small>In attesa del prossimo allievo compatibile.</small>}
      <TrainingControl
        personId={collaborator.id}
        displayName={collaborator.displayName}
        student={collaborator}
        state={state}
        collaboratorsById={collaboratorsById}
        onStartTraining={onStartTraining}
      />
    </div>
  );
}

export function TrainingControl({
  personId,
  displayName,
  student,
  state,
  onStartTraining,
  collaboratorsById,
  variant = "default",
}: {
  personId: string;
  displayName: string;
  student: FormStudent;
  state: GameState;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  variant?: "default" | "compact";
}) {
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const now = useGameTime(
    Boolean(student.training),
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const annualTrainingAvailable =
    getFormTrainingCount(student, trainingYear) < annualTrainingLimit;
  const collaborator = collaboratorsById.get(personId);
  const hasAssignedInstructor = state.collaborators.some(
    (candidate) => candidate.assignment === "instructor",
  );
  const variantClass = variant === "compact" ? " training-compact" : "";

  if (!state.unlocks.forms) {
    return <div className={`training-locked${variantClass}`}><span>Formazione</span><strong>Disponibile dal primo iscritto</strong></div>;
  }
  if (student.training) {
    const definition = isAgonistCourse(student.training.formId)
      ? undefined
      : getFormDefinition(student.training.formId);
    const instructor = student.training.instructorId
      ? collaboratorsById.get(student.training.instructorId)
      : undefined;
    const progress = getTrainingProgress(student.training, now);
    const waitingForEquipment = student.training.status === "waitingForEquipment";
    return (
      <div className={`training-progress${variantClass}`}>
        <span>
          {getTrainingCourseTitle(
            student.training.formId,
            state.upgrades["technical-arena"] ?? 0,
            student.training.agonistCourseGrantsStats,
          )}
          {definition?.branch ? ` — ${definition.branch}` : ""}
          {instructor ? ` · con ${instructor.displayName}` : ""}
          {student.training.includesInstructorCertification ? " · attestato incluso" : ""}
        </span>
        <strong>{waitingForEquipment ? "In attesa di spade" : `${Math.round(progress)}%`}</strong>
        <ProgressBar
          className="training-progress-bar"
          label={`Formazione di ${displayName}`}
          value={progress}
          durationMs={student.training.completesAt - student.training.startedAt}
        />
      </div>
    );
  }
  const summerBreak = isSummerBreak(state.school.currentMonth);
  const summerInstructorTraining = summerBreak &&
    collaborator?.assignment === "instructor";
  if (summerBreak && !summerInstructorTraining) {
    return <div className={`training-locked${variantClass}`}><span>Pausa estiva</span><strong>Le Forme riprendono a settembre</strong></div>;
  }

  const qualificationDefinitions = collaborator?.assignment === "instructor"
    ? collaborator.forms.flatMap((formId) => {
        const definition = getFormDefinition(formId);
        return definition && isInstructorForm(formId) &&
            !collaborator.instructorForms.includes(formId)
          ? [definition]
          : [];
      })
    : [];
  const branchCapacity = collaborator?.assignment === "instructor"
    ? Math.min(3, 1 + state.upgrades["instructor-versatility"])
    : undefined;
  const learnedBranches = new Set(collaborator?.forms.flatMap((formId) => {
    const branch = getFormDefinition(formId)?.branch;
    return branch ? [branch] : [];
  }) ?? []);
  const newForms = annualTrainingAvailable
    ? getAvailableForms(
        student,
        trainingYear,
        branchCapacity,
        collaborator?.assignment !== "instructor",
        annualTrainingLimit,
      ).filter((definition) =>
        !definition.branch ||
        learnedBranches.size > 0 ||
        !collaborator?.formBranchPreferences?.length ||
        collaborator.formBranchPreferences.includes(definition.branch)
      )
    : [];
  const academicallyAvailable = summerInstructorTraining
    ? [...qualificationDefinitions, ...newForms.filter((definition) => isInstructorForm(definition.id))]
    : [...qualificationDefinitions, ...newForms];
  const available = academicallyAvailable;

  if (academicallyAvailable.length === 0) {
    if (!annualTrainingAvailable) {
      return <div className={`training-locked${variantClass}`}><strong>Corsi annuali completati</strong></div>;
    }
    const latestForm = getFormDefinition(student.forms.at(-1)!);
    return <div className={`training-locked${variantClass}`}><span>Formazione</span><strong>Percorso completato alla {latestForm?.longName ?? "ultima Forma"}</strong></div>;
  }

  if (!collaborator && hasAssignedInstructor) {
    return (
      <div className={`training-future${variantClass}`}>
        <span>
          {available.length > 1 ? "Prossime Forme possibili" : "Prossima Forma"}
        </span>
        <div className="training-future-options">
          {available.map((definition) => (
            <TrainingFormPreview key={definition.id} definition={definition} />
          ))}
        </div>
      </div>
    );
  }

  const needsSelection = qualificationDefinitions.length > 0 ||
    (student.forms.includes("course-y") && available.length > 1);
  const selected = needsSelection
    ? available.find((definition) => definition.id === selectedFormId)
    : available[0];
  const selectedIsQualification = Boolean(
    selected && qualificationDefinitions.some((definition) => definition.id === selected.id),
  );
  const selectedCost = selected
    ? getDisplayedTrainingCost(
        state,
        personId,
        collaborator,
        selected,
        selectedIsQualification,
      )
    : 0;
  const actionLabel = !selected
    ? "Seleziona una Forma"
    : state.school.euros < selectedCost
      ? `Servono ${formatCurrency(selectedCost)}`
      : selectedIsQualification
        ? "Ottieni qualifica"
        : selectedCost === 0
          ? "Avvia gratuitamente"
          : `Paga e avvia · ${formatCurrency(selectedCost)}`;

  return (
    <div className={`training-control${variantClass}`}>
      <div className="training-form-choice">
        {needsSelection ? (
          <label>
            <span>
              {qualificationDefinitions.length > 0
                ? "Scegli la prossima formazione"
                : "Scegli la specializzazione d'arma"}
            </span>
            <select
              aria-label={`Formazione per ${displayName}`}
              value={selectedFormId}
              onChange={(event) => setSelectedFormId(event.target.value as FormId)}
            >
              <option value="">Seleziona</option>
              {available.map((definition) => {
                const qualification = qualificationDefinitions.some(
                  (candidate) => candidate.id === definition.id,
                );
                const cost = getDisplayedTrainingCost(
                  state,
                  personId,
                  collaborator,
                  definition,
                  qualification,
                );
                const hasInstructorDiscount =
                  !qualification && collaborator?.assignment !== "instructor" && cost < definition.cost;
                return (
                  <option key={definition.id} value={definition.id}>
                    {qualification ? "Qualifica · " : ""}{definition.longName}
                    {definition.bonusLabel ? ` · ${definition.bonusLabel}` : ""} · {formatCurrency(cost)}
                    {hasInstructorDiscount ? " · sconto Istruttore" : ""}
                    {!qualification && cost > definition.cost ? " · qualifica inclusa" : ""}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <span className="training-form-label">Prossima formazione · anno formativo {trainingYear}</span>
        )}
        {selected ? <TrainingFormPreview definition={selected} /> : null}
      </div>
      <button
        type="button"
        disabled={!selected || state.school.euros < selectedCost}
        onClick={() => selected && onStartTraining(personId, selected.id)}
      >
        {actionLabel}
      </button>
    </div>
  );
}
