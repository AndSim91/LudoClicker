import { ProgressBar } from "../../components/common/ProgressBar";
import { COLLABORATOR_MASTERY_LEVELS } from "../../content/mastery";
import type { Collaborator, CollaboratorMasteryRole } from "../../game/types";
import { getAverageSectorMastery } from "./sectorMasteryPresentation";

export function SectorMasteryIndicator({
  collaborators,
  role,
  className = "",
}: {
  collaborators: readonly Collaborator[];
  role: CollaboratorMasteryRole;
  className?: string;
}) {
  const average = getAverageSectorMastery(collaborators, role);
  const nextLevel = COLLABORATOR_MASTERY_LEVELS[average.progress.level + 1];
  const levelLabel = collaborators.length > 0
    ? average.progress.definition.name
    : "—";
  const progressLabel = collaborators.length === 0
    ? "Nessuno qui, per ora."
    : nextLevel
      ? `Maestria media verso ${nextLevel.name}`
      : "Maestria media al livello massimo";

  return (
    <span className={`sector-mastery-average${className ? ` ${className}` : ""}`}>
      <ProgressBar
        variant="circular"
        value={average.progress.progress}
        label={progressLabel}
        valueText={`${Math.round(average.averageXp)} XP medi · ${levelLabel}`}
        title={`${Math.round(average.averageXp)} XP medi · ${levelLabel}`}
      />
      <span>
        <small>Maestria media</small>
        <strong>{levelLabel}</strong>
      </span>
    </span>
  );
}
