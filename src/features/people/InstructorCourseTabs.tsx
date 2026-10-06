import { useState } from "react";
import { isSISTechnicianCourseUnlocked } from "../../content/upgrades";
import { useGameStateSlices } from "../../game/GameStateContext";
import { getTrainingPhase } from "../../game/teacherTrainingFlow";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { InstructorCompactTraining, TechnicianCourseControl } from "./TrainingControl";

type CourseTab = "instructor" | "technician";

/**
 * C2 (06/10): Corso Istruttori and Corso Tecnici SIS of one instructor behind
 * two tabs, green and violet like the Scheda Istruttori. Without the SIS only
 * the Corso Istruttori, as before.
 */
export function InstructorCourseTabs({
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
  const state = useGameStateSlices(["upgrades"], stateOverride);
  const studyingTechnician = Boolean(
    collaborator.training && getTrainingPhase(collaborator.training) === "technician",
  );
  const [tab, setTab] = useState<CourseTab>(
    studyingTechnician || collaborator.technicianCourseReservation ? "technician" : "instructor",
  );
  const instructorTraining = (
    <InstructorCompactTraining
      collaborator={collaborator}
      state={stateOverride}
      onStartTraining={onStartTraining}
      collaboratorsById={collaboratorsById}
      showTechnicianCourse={false}
    />
  );
  if (!isSISTechnicianCourseUnlocked(state.upgrades)) return instructorTraining;

  const tabButton = (id: CourseTab, label: string) => (
    <button
      type="button"
      role="tab"
      className={`course-tab is-${id}${tab === id ? " is-active" : ""}`}
      aria-selected={tab === id}
      onClick={() => setTab(id)}
    >
      <i aria-hidden="true" />
      {label}
    </button>
  );
  return (
    <div className="course-tabs">
      <div className="course-tabs-bar" role="tablist" aria-label={`Corsi di ${collaborator.displayName}`}>
        {tabButton("instructor", "Istruttori")}
        {tabButton("technician", "Tecnici SIS")}
      </div>
      <div className={`course-tabs-panel is-${tab}`} role="tabpanel">
        {tab === "instructor"
          ? studyingTechnician
            ? (
              <div className="training-locked training-compact">
                <span>Formazione Istruttore</span>
                <strong>Disponibile al termine del Corso Tecnico</strong>
              </div>
            )
            : instructorTraining
          : studyingTechnician
            // The training in progress is the Corso Tecnico: its bar lives here.
            ? instructorTraining
            : (
              <TechnicianCourseControl
                collaborator={collaborator}
                state={stateOverride}
                onBookTechnicianCourse={onBookTechnicianCourse}
                variant="compact"
                presentation="inline"
                showUnavailableState
              />
            )}
      </div>
    </div>
  );
}
