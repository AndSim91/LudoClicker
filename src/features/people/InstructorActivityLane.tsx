import type { CSSProperties, ReactNode } from "react";

export type InstructorActivityLaneTone = "student" | "instructor" | "technician";

type LaneStyle = CSSProperties & {
  "--instructor-lane-basis": string;
};

export function InstructorActivityLane({
  title,
  tone,
  rowCount,
  children,
}: {
  title: string;
  tone: InstructorActivityLaneTone;
  rowCount: number;
  children: ReactNode;
}) {
  if (rowCount <= 0) return null;

  const visibleRows = Math.min(rowCount, 7);
  const style: LaneStyle = {
    "--instructor-lane-basis": `${32 + visibleRows * 38}px`,
  };

  return (
    <section
      className={`instructor-activity-lane is-${tone}`}
      aria-label={title}
      style={style}
    >
      <h4>{title}</h4>
      <div className="instructor-activity-lane-body">
        {children}
      </div>
    </section>
  );
}
