import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { getAgonistCourseLogo } from "../../content/formLogos";
import { CourseRings } from "./CourseRings";
import type { CourseRing } from "./formActivity";

export interface AthleticPreparationStatus {
  unlocked: boolean;
  active: boolean;
  summer: boolean;
  paused: boolean;
  instructorCount: number;
}

export interface AgonistCourseStatus {
  /** Percorso Tecnico 1: Arena Tecnica exists. */
  unlocked: boolean;
  /** Nessun Rancore 1: it becomes the Corso Agonisti, with the star and the azzurro logo. */
  starred: boolean;
  ring?: CourseRing;
}

function AthleticPreparation({ status }: { status: AthleticPreparationStatus }) {
  if (!status.unlocked) return <div className="instructor-training-cell is-locked" aria-hidden="true" />;
  const { active, summer, paused, instructorCount } = status;
  return (
    <div className={`athletic-preparation-course instructor-training-cell${active ? "" : " is-inactive"}`}>
      <span className="athletic-preparation-course-logo" aria-hidden="true"><Icon name="trend" /></span>
      <strong>Preparazione atletica</strong>
      <ProgressBar
        className={`instructor-preparation-loop${active ? "" : " is-inactive"}`}
        label={!active ? "Preparazione atletica in attesa" : summer ? "Preparazione atletica estiva" : "Preparazione atletica continuativa"}
        value={0}
        valueText={!active
          ? "In attesa di istruttori disponibili"
          : paused ? "Attività in pausa" : summer ? "Ritmo estivo, più lento" : "Attività continuativa"}
        indeterminate={active}
        paused={paused}
      />
      <small>{!active
        ? "In attesa di Istruttori liberi"
        : `${summer ? "Ritmo estivo" : "Attività continuativa"} · ${instructorCount} ${instructorCount === 1 ? "Istruttore" : "Istruttori"}`}</small>
    </div>
  );
}

function AgonistCourse({ status }: { status: AgonistCourseStatus }) {
  if (!status.unlocked) return <div className="instructor-training-cell is-locked" aria-hidden="true" />;
  const { ring, starred } = status;
  const name = starred ? "Corso Agonisti" : "Arena Tecnica";
  const text = !ring
    ? "nessun atleta"
    : ring.waiting
      ? <><b>{ring.count}</b> in attesa di spade</>
      : <><b>{ring.count}</b> {ring.count === 1 ? "atleta" : "atleti"} · {Math.round(ring.progress)}%</>;
  return (
    <div className={`instructor-agonist-course instructor-training-cell${ring ? "" : " is-idle"}${starred ? " is-starred" : ""}`}>
      <span className="instructor-agonist-medal">
        <CourseRings activity={{ students: ring }} size={34} radii={[15.5]} idleTrack />
        <img src={getAgonistCourseLogo(starred).assetPath} alt={`${name} — emblema generato`} />
        {starred ? <span className="agonist-course-star" aria-hidden="true">★</span> : null}
      </span>
      <strong>{name}</strong>
      <small>{text}</small>
    </div>
  );
}

/**
 * K2 (06/10): under the map, one row for what isn't a Form. Preparazione
 * atletica on the left, Arena Tecnica / Corso Agonisti on the right. Before
 * they unlock the place stays empty, so the card keeps its height.
 */
export function InstructorTrainingRow({
  preparation,
  agonist,
}: {
  preparation: AthleticPreparationStatus;
  agonist: AgonistCourseStatus;
}) {
  return (
    <div className="instructor-training-row">
      <AthleticPreparation status={preparation} />
      <AgonistCourse status={agonist} />
    </div>
  );
}
