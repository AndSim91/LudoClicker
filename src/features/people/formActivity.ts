import { getTrainingPhase } from "../../game/teacherTrainingFlow";
import type { Collaborator, FormTraining, TrainingCourseId } from "../../game/types";
import { getInstructorTrainingProgress, type InstructorTeachingEntry } from "./instructorGroupPresentation";

/** One quadrant (concept K2): how many follow the course, how far it is, or dashed while it waits. */
export interface CourseRing {
  count: number;
  /** Average of the running courses, 0–100 (waiting ones don't drag the arc down). */
  progress: number;
  /** Nothing is running: waiting for swords, or a SIS course still booked. */
  waiting: boolean;
}

export interface FormActivity {
  /** Azzurro: athletes (and collaborators as athletes) taught by our Istruttori. */
  students?: CourseRing;
  /** Verde: Corso Istruttori. */
  instructorCourse?: CourseRing;
  /** Viola: Corso Tecnici, in corso o prenotato alla SIS. */
  technicianCourse?: CourseRing;
}

type Tally = { count: number; running: number; progressSum: number };

/**
 * Concept K2 «Quadranti» (06/10): for every Form (and the Corso Agonisti), the
 * three courses that can run on it, from the inside out.
 */
export function getFormActivity(
  studentEntries: readonly InstructorTeachingEntry[],
  instructors: readonly Collaborator[],
  now: number,
): Map<TrainingCourseId, FormActivity> {
  const tallies = new Map<TrainingCourseId, Partial<Record<keyof FormActivity, Tally>>>();
  const add = (courseId: TrainingCourseId, key: keyof FormActivity, training?: FormTraining) => {
    const byKey = tallies.get(courseId) ?? {};
    const tally = byKey[key] ?? { count: 0, running: 0, progressSum: 0 };
    tally.count += 1;
    if (training && training.status !== "waitingForEquipment") {
      tally.running += 1;
      tally.progressSum += getInstructorTrainingProgress(training, now);
    }
    byKey[key] = tally;
    tallies.set(courseId, byKey);
  };

  for (const { training } of studentEntries) {
    const phase = getTrainingPhase(training);
    if (phase === "athlete" || phase === "agonist") add(training.formId, "students", training);
  }
  for (const instructor of instructors) {
    const training = instructor.training;
    const phase = training ? getTrainingPhase(training) : undefined;
    if (training && phase === "instructor") add(training.formId, "instructorCourse", training);
    if (training && phase === "technician") add(training.formId, "technicianCourse", training);
    else if (instructor.technicianCourseReservation) {
      add(instructor.technicianCourseReservation.formId, "technicianCourse");
    }
  }

  const activity = new Map<TrainingCourseId, FormActivity>();
  for (const [courseId, byKey] of tallies) {
    const rings: FormActivity = {};
    for (const [key, tally] of Object.entries(byKey) as [keyof FormActivity, Tally][]) {
      rings[key] = {
        count: tally.count,
        progress: tally.running > 0 ? tally.progressSum / tally.running : 0,
        waiting: tally.running === 0,
      };
    }
    activity.set(courseId, rings);
  }
  return activity;
}
