import { useMemo, useState } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  getAvailableForms,
  getFormDefinition,
  getFormTrainingCount,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  getTechnicianCourseCost,
  getTrainingCourseTitle,
  isInstructorForm,
  isAgonistCourse,
  needsCourseXRecovery,
  type FormDefinition,
  type FormStudent,
} from "../../content/forms";
import {
  applyQualifyingCourseDiscount,
  getAnnualFormTrainingLimit,
  isAgonistCourseUnlocked,
  isCourseXUnlocked,
  isSISTechnicianCourseUnlocked,
} from "../../content/upgrades";
import {
  getFormTrainingYear,
  getGameMonthName,
  getGameYear,
  isSummerBreak,
} from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import { getTrainingPhase } from "../../game/teacherTrainingFlow";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { TrainingFormPreview } from "./PersonPresentation";
import { TrainingOptionPicker } from "./TrainingOptionPicker";

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
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  return useMemo(
    () => getInstructorTeachingStudents(
      state.contacts,
      state.collaborators,
      instructorId,
    ).filter((entry) => courseXUnlocked || entry.training.formId !== "course-x"),
    [state.contacts, state.collaborators, instructorId, courseXUnlocked],
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
  if (qualification) {
    return applyQualifyingCourseDiscount(
      state.upgrades,
      getInstructorQualificationCost(definition.cost),
    );
  }
  const availableInstructor = !isSummerBreak(state.school.currentMonth)
    ? selectAvailableInstructor(state, definition.id, personId)
    : undefined;
  if (availableInstructor) return getStudentFormCost(definition.cost);
  if (collaborator?.assignment === "instructor" && isInstructorForm(definition.id)) {
    return applyQualifyingCourseDiscount(
      state.upgrades,
      getInstructorFormCost(definition.cost),
    );
  }
  return definition.cost;
}

function InstructorTeachingSummary({
  entries,
  now,
  agonistCourseUnlocked,
}: {
  entries: InstructorTeachingEntry[];
  now: number;
  agonistCourseUnlocked: boolean;
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
                  agonistCourseUnlocked,
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
  state: stateOverride,
  athleticPreparationActive = false,
}: {
  collaborator: Collaborator;
  state?: GameState;
  athleticPreparationActive?: boolean;
}) {
  const state = useGameStateSlices(
    ["collaborators", "contacts", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const teaching = useInstructorTeachingEntries(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const isPaused = useGameTimeSource()?.isPaused ?? false;
  const now = useGameTime(
    teaching.length > 0,
    GAME_CONFIG.progressUpdateIntervalMs,
  );

  if (teaching.length === 0) {
    if (athleticPreparationActive) {
      return (
        <div
          className="instructor-compact-activity-list"
          aria-label={`Attività di ${collaborator.displayName}`}
        >
          <span className="instructor-compact-activity is-athletic-preparation">
            <span className="collaborator-activity-title">
              <strong>Preparazione atletica</strong>
              <small>Attività continuativa</small>
            </span>
            <span className="collaborator-activity-progress">
              <strong>In corso</strong>
              <ProgressBar
                className="collaborator-progress-bar"
                label={`Preparazione atletica di ${collaborator.displayName}`}
                value={0}
                valueText={isPaused ? "Attività in pausa" : "Attività continuativa"}
                indeterminate
                paused={isPaused}
              />
            </span>
          </span>
        </div>
      );
    }
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
                isAgonistCourseUnlocked(state.upgrades),
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

export function TechnicianCourseControl({
  collaborator,
  state: stateOverride,
  onBookTechnicianCourse,
  variant = "default",
}: {
  collaborator: Collaborator;
  state?: GameState;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  variant?: "default" | "compact";
}) {
  const state = useGameStateSlices(
    ["collaborators", "contacts", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const [isSISExpanded, setIsSISExpanded] = useState(false);
  const reservation = collaborator.technicianCourseReservation;
  const sisUnlocked = isSISTechnicianCourseUnlocked(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const recoveryPending = courseXUnlocked && needsCourseXRecovery(collaborator.forms);
  const definitions = collaborator.forms.flatMap((formId) => {
    const definition = getFormDefinition(formId);
    return definition &&
      (courseXUnlocked || formId !== "course-x") &&
      !recoveryPending &&
      collaborator.instructorForms.includes(formId) &&
      !(collaborator.technicianForms ?? []).includes(formId)
      ? [definition]
      : [];
  });
  const variantClass = variant === "compact" ? " training-compact" : "";

  if (collaborator.training && getTrainingPhase(collaborator.training) === "technician") {
    return null;
  }
  if (reservation?.formId === "course-x" && !courseXUnlocked) {
    return null;
  }
  if (reservation && (courseXUnlocked || reservation.formId !== "course-x")) {
    const definition = getFormDefinition(reservation.formId);
    const startMonth = getGameMonthName(reservation.eligibleMonth);
    const startYear = getGameYear(reservation.eligibleMonth);
    const courseName = definition?.longName ?? reservation.formId;
    const reservationDescription =
      `Corso Tecnico SIS prenotato: ${courseName}. ` +
      `Partenza da ${startMonth}, anno ${startYear}, appena il collaboratore \u00e8 libero.`;
    return (
      <div
        className={`training-future technician-course-reservation${variantClass}`}
        role="status"
        aria-label={reservationDescription}
        title={reservationDescription}
      >
        <span className="technician-course-badge" aria-hidden="true">SIS</span>
        <span className="technician-course-reservation-copy">
          <strong>{courseName}</strong>
          <small>Prenotato &middot; {startMonth}, anno {startYear}</small>
        </span>
      </div>
    );
  }
  if (!onBookTechnicianCourse || definitions.length === 0) return null;
  if (!sisUnlocked) return null;
  const selected = definitions.find((definition) => definition.id === selectedFormId) ??
    (definitions.length === 1 ? definitions[0] : undefined);
  const cost = selected
    ? applyQualifyingCourseDiscount(
        state.upgrades,
        getTechnicianCourseCost(selected.cost),
      )
    : 0;
  const lacksFunds = selected ? state.school.euros < cost : false;
  const options = definitions.map((definition) => ({
    definition,
    costLabel: formatCurrency(applyQualifyingCourseDiscount(
      state.upgrades,
      getTechnicianCourseCost(definition.cost),
    )),
    contextLabel: "Corso Tecnico SIS",
  }));

  return (
    <div
      className={`training-control technician-course-control${isSISExpanded ? " is-expanded" : ""}${variantClass}`}
    >
      <button
        type="button"
        className="technician-course-heading"
        aria-expanded={isSISExpanded}
        onClick={() => setIsSISExpanded((expanded) => !expanded)}
      >
        <span className="technician-course-badge">SIS</span>
        <span className="technician-course-heading-copy">
          <strong>Corso Tecnici</strong>
        </span>
        <span className="technician-course-toggle" aria-hidden="true">
          {isSISExpanded ? "\u2212" : "+"}
        </span>
      </button>
      {isSISExpanded ? (
        <>
      <div className="training-form-choice">
        {definitions.length > 1 ? (
          <TrainingOptionPicker
            displayName={collaborator.displayName}
            label="Scegli il percorso da Tecnico"
            options={options}
            selectedFormId={selectedFormId}
            onSelect={setSelectedFormId}
          />
        ) : selected ? (
          <>
            <span className="training-form-label">Percorso Tecnico alla SIS</span>
            <TrainingFormPreview definition={selected} />
          </>
        ) : null}
      </div>
      <button
        type="button"
        className="training-start-button"
        disabled={!selected || lacksFunds}
        onClick={() => selected && onBookTechnicianCourse(collaborator.id, selected.id)}
      >
        {!selected
          ? "Seleziona una Forma"
          : lacksFunds
            ? `Servono ${formatCurrency(cost)}`
            : `Prenota SIS · ${formatCurrency(cost)}`}
      </button>
        </>
      ) : null}
    </div>
  );
}

export function InstructorCompactTraining({
  collaborator,
  state: stateOverride,
  onStartTraining,
  onBookTechnicianCourse,
  collaboratorsById,
  showTechnicianCourse = true,
}: {
  collaborator: Collaborator;
  state?: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  collaboratorsById: Map<string, Collaborator>;
  showTechnicianCourse?: boolean;
}) {
  return (
    <div className="instructor-compact-training" aria-label="Formazione istruttore">
      <TrainingControl
        personId={collaborator.id}
        displayName={collaborator.displayName}
        student={collaborator}
        state={stateOverride}
        collaboratorsById={collaboratorsById}
        onStartTraining={onStartTraining}
        variant="compact"
      />
      {showTechnicianCourse ? (
        <TechnicianCourseControl
          collaborator={collaborator}
          state={stateOverride}
          onBookTechnicianCourse={onBookTechnicianCourse}
          variant="compact"
        />
      ) : null}
    </div>
  );
}

export function InstructorPanel({
  collaborator,
  state: stateOverride,
  onStartTraining,
  onBookTechnicianCourse,
  collaboratorsById,
}: {
  collaborator: Collaborator;
  state?: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  collaboratorsById: Map<string, Collaborator>;
}) {
  const state = useGameStateSlices(
    ["collaborators", "contacts", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const teachingCount = selectInstructorTeachingCount(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const teaching = useInstructorTeachingEntries(state, collaborator.id);
  const now = useGameTime(
    teaching.length > 0,
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  return (
    <div className="instructor-panel">
      <div className="instructor-panel-heading">
        <span><strong>Lezioni automatiche</strong><small>{teachingCount}/{capacity} allievi</small></span>
      </div>
      {teaching.length > 0
        ? <InstructorTeachingSummary
            entries={teaching}
            now={now}
            agonistCourseUnlocked={isAgonistCourseUnlocked(state.upgrades)}
          />
        : <small>In attesa del prossimo allievo compatibile.</small>}
      <TrainingControl
        personId={collaborator.id}
        displayName={collaborator.displayName}
        student={collaborator}
        state={stateOverride}
        collaboratorsById={collaboratorsById}
        onStartTraining={onStartTraining}
      />
      <TechnicianCourseControl
        collaborator={collaborator}
        state={stateOverride}
        onBookTechnicianCourse={onBookTechnicianCourse}
      />
    </div>
  );
}

export function TrainingControl({
  personId,
  displayName,
  student,
  state: stateOverride,
  onStartTraining,
  collaboratorsById,
  variant = "default",
}: {
  personId: string;
  displayName: string;
  student: FormStudent;
  state?: GameState;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  variant?: "default" | "compact" | "roster";
}) {
  const state = useGameStateSlices(
    ["collaborators", "contacts", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const now = useGameTime(
    Boolean(student.training),
    GAME_CONFIG.progressUpdateIntervalMs,
  );
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const recoveryPending = courseXUnlocked && needsCourseXRecovery(student.forms);
  const annualTrainingAvailable =
    getFormTrainingCount(student, trainingYear) < annualTrainingLimit;
  const collaborator = collaboratorsById.get(personId);
  const hasAssignedInstructor = state.collaborators.some(
    (candidate) => candidate.assignment === "instructor",
  );
  const variantClass = variant === "compact"
    ? " training-compact"
    : variant === "roster"
      ? " training-roster"
      : "";

  if (!state.unlocks.forms) {
    return <div className={`training-locked${variantClass}`}><span>Formazione</span><strong>Disponibile dal primo iscritto</strong></div>;
  }
  if (student.training?.formId === "course-x" && !courseXUnlocked) {
    const progress = getTrainingProgress(student.training, now);
    const waitingForEquipment = student.training.status === "waitingForEquipment";
    return (
      <div className={`training-progress${variantClass}`}>
        <span>Formazione precedente in corso</span>
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
  if (student.training) {
    const definition = isAgonistCourse(student.training.formId)
      ? undefined
      : getFormDefinition(student.training.formId);
    const instructor = student.training.instructorId
      ? collaboratorsById.get(student.training.instructorId)
      : undefined;
    const technician = student.training.technicianId
      ? collaboratorsById.get(student.training.technicianId)
      : undefined;
    const trainingPhase = getTrainingPhase(student.training);
    const courseTitle = trainingPhase === "instructor"
      ? `Corso Istruttori · ${definition?.longName ?? "Forma"}`
      : trainingPhase === "technician"
        ? `Corso Tecnico SIS · ${definition?.longName ?? "Forma"}`
        : getTrainingCourseTitle(
            student.training.formId,
            isAgonistCourseUnlocked(state.upgrades),
            student.training.agonistCourseGrantsStats,
          );
    const progress = getTrainingProgress(student.training, now);
    const waitingForEquipment = student.training.status === "waitingForEquipment";
    return (
      <div className={`training-progress${variantClass}`}>
        <span>
          {courseTitle}
          {definition?.branch ? ` — ${definition.branch}` : ""}
          {instructor ? ` · con ${instructor.displayName}` : ""}
          {technician ? ` · con il Tecnico ${technician.displayName}` : ""}
          {student.training.trainingTrack === "combined-instructor" && trainingPhase === "athlete"
            ? " · attestato incluso"
            : ""}
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
            (courseXUnlocked || formId !== "course-x") &&
            !recoveryPending &&
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
        courseXUnlocked,
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
        ? "Avvia Corso Istruttori"
        : selectedCost === 0
          ? "Avvia gratuitamente"
          : `Paga e avvia · ${formatCurrency(selectedCost)}`;
  const trainingOptions = available.map((definition) => {
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
    const hasInstructorDiscount = !qualification && cost < definition.cost;
    return {
      definition,
      costLabel: formatCurrency(cost),
      contextLabel: qualification
        ? "Corso Istruttori"
        : hasInstructorDiscount
          ? "Sconto Istruttore"
          : cost > definition.cost
            ? "Qualifica inclusa"
            : undefined,
    };
  });

  return (
    <div className={`training-control${variantClass}${needsSelection ? " has-options" : ""}`}>
      <div className="training-form-choice">
        {needsSelection ? (
          <TrainingOptionPicker
            displayName={displayName}
            label={qualificationDefinitions.length > 0
              ? "Scegli la prossima formazione"
              : "Scegli la specializzazione d'arma"}
            options={trainingOptions}
            selectedFormId={selectedFormId}
            onSelect={setSelectedFormId}
          />
        ) : (
          <span className="training-form-label">Prossima formazione · anno formativo {trainingYear}</span>
        )}
        {selected && !needsSelection ? <TrainingFormPreview definition={selected} /> : null}
      </div>
      <button
        type="button"
        className="training-start-button"
        disabled={!selected || state.school.euros < selectedCost}
        onClick={() => selected && onStartTraining(personId, selected.id)}
      >
        {actionLabel}
      </button>
    </div>
  );
}
