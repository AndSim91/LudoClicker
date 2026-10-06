import type { ReactNode } from "react";
import { getFormLogo } from "../../content/formLogos";
import { BRANCH_FORM_IDS, FORM_BRANCHES, FORM_DEFINITIONS, getFormDefinition } from "../../content/forms";
import { isCourseXUnlocked } from "../../content/upgrades";
import { useOptionalGameState } from "../../game/GameStateContext";
import type { FormBranch, FormId, TrainingCourseId } from "../../game/types";
import { useOutlookTheme } from "../../shared/useOutlookTheme";
import { CourseRings } from "./CourseRings";
import type { CourseRing, FormActivity } from "./formActivity";
import type { FormCoverageCount } from "./instructorGroupPresentation";
import { FormLogoStrip } from "./PersonPresentation";

const BRANCH_MARKS: Record<FormBranch, { letter: string; className: string }> = {
  "Spada Lunga": { letter: "L", className: "is-long" },
  Staffa: { letter: "S", className: "is-staff" },
  "Doppia spada corta": { letter: "D", className: "is-double" },
};

const TAIL: FormId[] = ["form-6", "form-7"];

const formName = (formId: FormId) => getFormDefinition(formId)?.longName ?? formId;

/**
 * The skeleton of the curriculum: the trunk (F1, Corso X if unlocked, F2,
 * Corso Y), one lane per weapon with Forms 3–5, then F6 and F7. Each caller
 * decides how a single Form is drawn.
 */
function FormPathSkeleton({
  className = "",
  ariaLabel,
  title,
  node,
  isLaneActive,
}: {
  className?: string;
  ariaLabel: string;
  title?: string;
  node: (formId: FormId) => ReactNode;
  isLaneActive: (ids: readonly FormId[]) => boolean;
}) {
  const state = useOptionalGameState();
  const courseX = state ? isCourseXUnlocked(state.upgrades) : true;
  const trunk: FormId[] = courseX
    ? ["form-1", "course-x", "form-2", "course-y"]
    : ["form-1", "form-2", "course-y"];
  return (
    <div className={`form-path-map${className ? ` ${className}` : ""}`} aria-label={ariaLabel} title={title}>
      <span className="form-path-segment">{trunk.map(node)}</span>
      <span className="form-path-lanes">
        {FORM_BRANCHES.map((branch) => {
          const ids = BRANCH_FORM_IDS[branch];
          const mark = BRANCH_MARKS[branch];
          return (
            <span key={branch} className={`form-path-lane ${mark.className}${isLaneActive(ids) ? " is-active" : ""}`}>
              <span className="form-path-lane-mark" title={branch} aria-hidden="true">{mark.letter}</span>
              {ids.map(node)}
            </span>
          );
        })}
      </span>
      <span className="form-path-segment">{TAIL.map(node)}</span>
    </div>
  );
}

/**
 * Percorso delle Forme in Modalità Onde (concept G2, 06/10): the whole
 * curriculum is always drawn. Learned Forms light up, the rest stay in shadow.
 * A Form the person may teach gets a notch underneath (concept B2, 06/10):
 * gold for the instructor certificate, lilac for the Technician qualification.
 */
export function FormPathMap({
  forms,
  instructorForms = [],
  technicianForms = [],
}: {
  forms: readonly FormId[];
  instructorForms?: readonly FormId[];
  technicianForms?: readonly FormId[];
}) {
  const learned = new Set(forms);
  const node = (formId: FormId) => {
    const lit = learned.has(formId);
    const technician = technicianForms.includes(formId);
    const instructor = instructorForms.includes(formId);
    return (
      <span
        key={formId}
        className={`form-path-node${lit ? " is-learned" : ""}${formId === "course-y" ? " is-course-y" : ""}${
          lit && technician ? " is-technician" : lit && instructor ? " is-instructor" : ""}`}
        title={`${formName(formId)}${lit ? "" : " · da fare"}${technician ? " · Qualifica da Tecnico" : instructor ? " · Attestato da istruttore" : ""}`}
      >
        <img src={getFormLogo(formId).assetPath} alt="" />
      </span>
    );
  };
  const learnedNames = FORM_BRANCHES.flatMap((branch) => BRANCH_FORM_IDS[branch])
    .concat(TAIL)
    .filter((formId) => learned.has(formId));
  const trunkLearned = (["form-1", "course-x", "form-2", "course-y"] as FormId[]).filter((formId) => learned.has(formId));
  const names = [...trunkLearned, ...learnedNames].map(formName);

  return (
    <FormPathSkeleton
      ariaLabel={names.length > 0 ? `Forme conosciute: ${names.join(", ")}` : "Forme conosciute: nessuna"}
      title={names.length > 0 ? `Forme conosciute: ${names.join(", ")}` : undefined}
      node={node}
      isLaneActive={(ids) => ids.some((formId) => learned.has(formId))}
    />
  );
}

const ringText = (label: string, ring: CourseRing | undefined, booked = "in attesa di spade") =>
  !ring ? "" : ` · ${label} ${ring.waiting ? booked : `${Math.round(ring.progress)}%`}`;

const activityTitle = (activity: FormActivity | undefined) => !activity ? "" : [
  activity.students
    ? ` · ${activity.students.count} ${activity.students.count === 1 ? "allievo" : "allievi"}${
      activity.students.waiting ? " in attesa di spade" : ` al ${Math.round(activity.students.progress)}%`}`
    : "",
  ringText("Corso Istruttori", activity.instructorCourse),
  ringText("Corso Tecnici", activity.technicianCourse, "prenotato"),
].join("");

/** K2: 46 px of quadrants around a 26 px logo. */
const MEDAL_SIZE = 46;
const MEDAL_RADII = [16, 19, 22] as const;

/**
 * Copertura didattica in Modalità Onde (concept C5, 06/10): the same map, with
 * a column of numbers left of every logo. Gold on top for the Istruttori, lilac
 * below for the Tecnici; whoever is still studying adds a lighter «+1».
 * K2 «Quadranti» (06/10): around every logo the courses running on it, and in
 * the gap at the bottom how many athletes follow it.
 */
export function FormCoverageMap({
  counts,
  activity,
  showTechnicians,
  highlight,
}: {
  counts: ReadonlyMap<FormId, FormCoverageCount>;
  activity: ReadonlyMap<TrainingCourseId, FormActivity>;
  showTechnicians: boolean;
  /** Ufficio formazione: the Forms the two buttons would pick right now. */
  highlight?: { instructor?: FormId; technician?: FormId };
}) {
  const at = (formId: FormId) => counts.get(formId);
  const covered = (formId: FormId) => (at(formId)?.instructors ?? 0) > 0;
  const number = (value: number, studying: number, className: string) => (
    <span className={className}>
      {value + studying > 0 ? value : null}
      {studying > 0 ? <span className="form-cover-studying">+{studying}</span> : null}
    </span>
  );
  const node = (formId: FormId) => {
    const count = at(formId);
    const instructors = count?.instructors ?? 0;
    const technicians = showTechnicians ? count?.technicians ?? 0 : 0;
    const studyingInstructors = count?.studyingInstructors ?? 0;
    const studyingTechnicians = showTechnicians ? count?.studyingTechnicians ?? 0 : 0;
    const lit = instructors > 0;
    const pending = !lit && studyingInstructors + studyingTechnicians > 0;
    const next = highlight?.instructor === formId
      ? " is-next-instructor"
      : highlight?.technician === formId ? " is-next-technician" : "";
    const people = (value: number, one: string, many: string, studying: number) =>
      `${value} ${value === 1 ? one : many}${studying ? ` (+${studying} in corso)` : ""}`;
    const running = activity.get(formId);
    const title = `${formName(formId)} · ${people(instructors, "Istruttore", "Istruttori", studyingInstructors)}${
      showTechnicians ? ` · ${people(technicians, "Tecnico", "Tecnici", studyingTechnicians)}` : ""}${activityTitle(running)}`;
    return (
      <span key={formId} className="form-cover-node" title={title}>
        <span className={`form-cover-numbers${showTechnicians ? " has-technicians" : ""}`} aria-hidden="true">
          {number(instructors, studyingInstructors, "is-instructor")}
          {showTechnicians ? number(technicians, studyingTechnicians, "is-technician") : null}
        </span>
        <span className="form-cover-medal">
          {running ? <CourseRings activity={running} size={MEDAL_SIZE} radii={MEDAL_RADII} /> : null}
          <span className={`form-path-node${lit ? " is-learned" : ""}${pending ? " is-pending" : ""}${next}`}>
            <img src={getFormLogo(formId).assetPath} alt="" />
          </span>
          {running?.students ? <span className="form-cover-students" aria-hidden="true">{running.students.count}</span> : null}
        </span>
      </span>
    );
  };
  const coveredNames = FORM_DEFINITIONS.map(({ id }) => id).filter(covered).map(formName);

  return (
    <FormPathSkeleton
      className="is-coverage"
      ariaLabel={coveredNames.length > 0 ? `Forme insegnabili: ${coveredNames.join(", ")}` : "Forme insegnabili: nessuna"}
      node={node}
      isLaneActive={(ids) => ids.some((formId) => counts.has(formId))}
    />
  );
}

/** Staff rows: the map in Onde, the logos Outlook already had. */
export function StaffForms({
  forms,
  instructorForms,
  technicianForms,
  stripClassName,
  showLabels,
}: {
  forms: FormId[];
  instructorForms?: readonly FormId[];
  technicianForms?: readonly FormId[];
  stripClassName?: string;
  showLabels?: boolean;
}) {
  const outlook = useOutlookTheme();
  return outlook ? (
    <FormLogoStrip
      className={stripClassName}
      forms={forms}
      instructorForms={instructorForms}
      technicianForms={technicianForms}
      showLabels={showLabels}
    />
  ) : (
    <FormPathMap forms={forms} instructorForms={instructorForms} technicianForms={technicianForms} />
  );
}
