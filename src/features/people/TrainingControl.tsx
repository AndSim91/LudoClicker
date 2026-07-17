import { useState } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  getAvailableForms,
  getFormDefinition,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  isInstructorForm,
  type FormDefinition,
  type FormStudent,
} from "../../content/forms";
import { getSchoolYear, isSummerBreak } from "../../game/calendar";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { useCurrentTime } from "../../shared/useCurrentTime";
import { TrainingFormPreview } from "./PersonPresentation";

type InstructorTeachingEntry = {
  id: string;
  displayName: string;
  training: NonNullable<FormStudent["training"]>;
};

function getInstructorTeachingStudents(
  state: GameState,
  instructorId: string,
): InstructorTeachingEntry[] {
  return [
    ...state.contacts.flatMap((contact) => contact.training?.instructorId === instructorId
      ? [{ id: contact.id, displayName: `${contact.firstName} ${contact.lastName}`, training: contact.training }]
      : []),
    ...state.collaborators.flatMap((collaborator) =>
      collaborator.training?.instructorId === instructorId
        ? [{ id: collaborator.id, displayName: collaborator.displayName, training: collaborator.training }]
        : []),
  ];
}

function getTrainingProgress(
  training: NonNullable<FormStudent["training"]>,
  now: number,
): number {
  const duration = training.completesAt - training.startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, Math.round(((now - training.startedAt) / duration) * 100)));
}

function getDisplayedTrainingCost(
  state: GameState,
  personId: string,
  collaborator: Collaborator | undefined,
  definition: FormDefinition,
  qualification: boolean,
): number {
  if (qualification) return getInstructorQualificationCost(definition.cost);
  if (collaborator?.assignment === "instructor" && isInstructorForm(definition.id)) {
    return getInstructorFormCost(definition.cost);
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
}: {
  entries: InstructorTeachingEntry[];
  now: number;
}) {
  return (
    <div className="instructor-teaching" aria-label="Allievi in formazione">
      {entries.map((entry) => {
        const definition = getFormDefinition(entry.training.formId);
        const progress = getTrainingProgress(entry.training, now);
        return (
          <div className="instructor-student" key={entry.id}>
            <span className="instructor-student-copy">
              <strong>{entry.displayName}</strong>
              <small>{definition?.title}{definition?.branch ? ` · ${definition.branch}` : ""}</small>
            </span>
            <strong className="instructor-student-progress">{progress}%</strong>
            <ProgressBar
              className="instructor-student-progress-bar"
              label={`Formazione di ${entry.displayName}`}
              value={progress}
            />
          </div>
        );
      })}
    </div>
  );
}

export function InstructorPanel({
  collaborator,
  state,
  onStartTraining,
  onToggle,
}: {
  collaborator: Collaborator;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggle?: (collaboratorId: string, enabled: boolean) => void;
}) {
  const teachingCount = selectInstructorTeachingCount(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const teaching = getInstructorTeachingStudents(state, collaborator.id);
  const now = useCurrentTime(teaching.length > 0, 1_000);
  const enabled = collaborator.autoTeachingEnabled !== false;

  return (
    <div className="instructor-panel">
      <div className="instructor-panel-heading">
        <span><strong>Lezioni automatiche</strong><small>{teachingCount}/{capacity} allievi</small></span>
        <label className="instructor-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle?.(collaborator.id, event.target.checked)}
          /> Attive
        </label>
      </div>
      {teaching.length > 0
        ? <InstructorTeachingSummary entries={teaching} now={now} />
        : <small>{enabled ? "In attesa del prossimo allievo compatibile." : "Pausa: non verranno avviate nuove lezioni."}</small>}
      <TrainingControl
        personId={collaborator.id}
        displayName={collaborator.displayName}
        student={collaborator}
        state={state}
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
}: {
  personId: string;
  displayName: string;
  student: FormStudent;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const now = useCurrentTime(Boolean(student.training), 100);
  const currentYear = getSchoolYear(state.school.currentMonth);
  const hasTrainedThisYear = student.lastFormTrainingYear === currentYear;
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);

  if (!state.unlocks.forms) {
    return <div className="training-locked"><span>Formazione</span><strong>Disponibile dal primo iscritto</strong></div>;
  }
  if (student.training) {
    const definition = getFormDefinition(student.training.formId);
    const instructor = student.training.instructorId
      ? state.collaborators.find((candidate) => candidate.id === student.training?.instructorId)
      : undefined;
    const progress = getTrainingProgress(student.training, now);
    return (
      <div className="training-progress">
        <span>
          {definition?.title}{definition?.branch ? ` — ${definition.branch}` : ""}
          {instructor ? ` · con ${instructor.displayName}` : ""}
          {student.training.includesInstructorCertification ? " · attestato incluso" : ""}
        </span>
        <strong>{progress}%</strong>
        <ProgressBar
          className="training-progress-bar"
          label={`Formazione di ${displayName}`}
          value={progress}
        />
      </div>
    );
  }
  if (isSummerBreak(state.school.currentMonth)) {
    return <div className="training-locked"><span>Pausa estiva</span><strong>Le Forme riprendono a settembre</strong></div>;
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
  const newForms = hasTrainedThisYear
    ? []
    : getAvailableForms(
        student,
        currentYear,
        branchCapacity,
        collaborator?.assignment !== "instructor",
      ).filter((definition) =>
        !definition.branch ||
        learnedBranches.size > 0 ||
        !collaborator?.formBranchPreferences?.length ||
        collaborator.formBranchPreferences.includes(definition.branch)
      );
  const academicallyAvailable = [...qualificationDefinitions, ...newForms];
  const available = academicallyAvailable.filter((definition) => {
    if (qualificationDefinitions.some((candidate) => candidate.id === definition.id)) return true;
    return collaborator?.assignment !== "instructor" ||
      selectInstructorTeachingCount(state, collaborator.id) === 0;
  });

  if (academicallyAvailable.length === 0) {
    if (hasTrainedThisYear) {
      return <div className="training-locked"><strong>Hai già completato la formazione quest'anno</strong></div>;
    }
    const latestForm = getFormDefinition(student.forms.at(-1)!);
    return <div className="training-locked"><span>Formazione</span><strong>Percorso completato alla {latestForm?.title ?? "ultima Forma"}</strong></div>;
  }
  if (available.length === 0) {
    return <div className="training-locked"><span>Istruttore non disponibile</span><strong>Serve un Istruttore libero e attestato per questa Forma</strong></div>;
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
        : `Paga e avvia · ${formatCurrency(selectedCost)}`;

  return (
    <div className="training-control">
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
                    {qualification ? "Qualifica · " : ""}{definition.title}
                    {definition.branch ? ` — ${definition.branch}` : ""}
                    {definition.bonusLabel ? ` · ${definition.bonusLabel}` : ""} · {formatCurrency(cost)}
                    {hasInstructorDiscount ? " · sconto Istruttore" : ""}
                    {!qualification && cost > definition.cost ? " · qualifica inclusa" : ""}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <span className="training-form-label">Prossima formazione · anno scolastico {currentYear}</span>
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
