import { AGONIST_COURSE_ID, FORM_DEFINITIONS, getTrainingCourseTitle } from "../../content/forms";
import type { FormId, TrainingCourseId } from "../../game/types";
import type { CourseRing, FormActivity } from "./formActivity";
import type { FormCoverageCount } from "./instructorGroupPresentation";

/** Fixed height (06/10): the table always shows this many rows and scrolls inside the card. */
const VISIBLE_ROWS = 8;

function RingCell({ ring, tone, text }: { ring?: CourseRing; tone: string; text: string }) {
  if (!ring) return <span className="instructor-table-none">—</span>;
  return (
    <span className={`instructor-table-bar is-${tone}${ring.waiting ? " is-waiting" : ""}`}>
      <i style={{ width: ring.waiting ? "100%" : `${ring.progress}%` }} />
      <span>{text}</span>
    </span>
  );
}

const percent = (ring: CourseRing) => `${Math.round(ring.progress)}%`;

/**
 * Outlook, concept O2 (06/10): the Copertura didattica as an office table, one
 * row per Form that someone teaches, studies or attends. Rows with a course on
 * top, the quiet ones in grey below; the card never changes height.
 */
export function InstructorCoverageTable({
  counts,
  activity,
  showTechnicians,
  courseXUnlocked,
  agonist,
}: {
  counts: ReadonlyMap<FormId, FormCoverageCount>;
  activity: ReadonlyMap<TrainingCourseId, FormActivity>;
  showTechnicians: boolean;
  courseXUnlocked: boolean;
  /** Arena Tecnica / Corso Agonisti: undefined while Percorso Tecnico is locked. */
  agonist?: { starred: boolean };
}) {
  const forms = FORM_DEFINITIONS
    .map(({ id }) => id)
    .filter((id) => (courseXUnlocked || id !== "course-x") && (counts.has(id) || activity.has(id)));
  const ids: TrainingCourseId[] = agonist ? [...forms, AGONIST_COURSE_ID] : forms;
  const busy = (id: TrainingCourseId) => activity.has(id);
  const ordered = [...ids.filter(busy), ...ids.filter((id) => !busy(id))];
  const number = (value = 0, studying = 0) => `${value}${studying > 0 ? ` +${studying}` : ""}`;

  return (
    <table className="instructor-coverage-table">
      <thead>
        <tr>
          <th scope="col">Forma</th>
          <th scope="col" className="is-number">Istruttori</th>
          <th scope="col" className="is-number">Tecnici</th>
          <th scope="col" className="is-students">Allievi</th>
          <th scope="col">Corso Istruttori</th>
          <th scope="col">Corso Tecnici</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((id) => {
          const count = id === AGONIST_COURSE_ID ? undefined : counts.get(id);
          const rings = activity.get(id) ?? {};
          const students = rings.students;
          const name = id === AGONIST_COURSE_ID
            ? getTrainingCourseTitle(id, agonist?.starred ?? false)
            : FORM_DEFINITIONS.find((form) => form.id === id)?.longName ?? id;
          return (
            <tr key={id} className={busy(id) ? undefined : "is-quiet"}>
              <th scope="row">{name}</th>
              <td className="is-number">{count ? number(count.instructors, count.studyingInstructors) : "—"}</td>
              <td className="is-number">{count && showTechnicians ? number(count.technicians, count.studyingTechnicians) : "—"}</td>
              <td>
                <RingCell
                  ring={students}
                  tone="students"
                  text={!students ? "" : students.waiting
                    ? `${students.count} · in attesa di spade`
                    : `${students.count} ${id === AGONIST_COURSE_ID ? (students.count === 1 ? "atleta" : "atleti") : students.count === 1 ? "allievo" : "allievi"} · ${percent(students)}`}
                />
              </td>
              <td>
                <RingCell ring={rings.instructorCourse} tone="instructor" text={rings.instructorCourse ? percent(rings.instructorCourse) : ""} />
              </td>
              <td>
                <RingCell
                  ring={rings.technicianCourse}
                  tone="technician"
                  text={!rings.technicianCourse ? "" : rings.technicianCourse.waiting ? "prenotato" : percent(rings.technicianCourse)}
                />
              </td>
            </tr>
          );
        })}
        {Array.from({ length: Math.max(0, VISIBLE_ROWS - ordered.length) }, (_, index) => (
          <tr key={`empty-${index}`} className="is-empty" aria-hidden="true"><td colSpan={6} /></tr>
        ))}
      </tbody>
    </table>
  );
}
