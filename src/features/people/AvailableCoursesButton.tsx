import { Icon } from "../../components/common/Icon";

/**
 * Prima dell'Ufficio formazione (concept C, 13/10): quanti corsi Istruttori e
 * Tecnici si possono avviare adesso; il clic apre il Centro didattico.
 */
export function AvailableCoursesButton({
  instructors,
  technicians,
  showTechnicians,
  onOpen,
}: {
  instructors: number;
  technicians: number;
  showTechnicians: boolean;
  onOpen: () => void;
}) {
  const rows = [
    { kind: "instructor", count: instructors, label: "Corsi Istruttori disponibili" },
    ...(showTechnicians
      ? [{ kind: "technician", count: technicians, label: "Corsi Tecnici disponibili" }]
      : []),
  ];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <button
      type="button"
      className="instructor-available-courses"
      aria-label={total > 0
        ? `Apri il Centro didattico · ${rows.map((row) => `${row.count} ${row.label}`).join(" · ")}`
        : "Nessun corso da avviare"}
      disabled={total === 0}
      onClick={onOpen}
    >
      {rows.map((row) => (
        <span key={row.kind} className={`instructor-available-row is-${row.kind}`}>
          <b>{row.count}</b>
          <span>{row.label}</span>
        </span>
      ))}
      <span className="instructor-available-go">
        {total > 0 ? <>Apri il Centro didattico <Icon name="arrowRight" /></> : "Nessun corso da avviare"}
      </span>
    </button>
  );
}
