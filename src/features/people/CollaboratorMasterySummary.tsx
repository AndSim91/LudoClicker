import { ProgressBar } from "../../components/common/ProgressBar";
import {
  COLLABORATOR_MASTERY_ROLES,
  COLLABORATOR_MASTERY_ROLE_LABELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import type { Collaborator } from "../../game/types";

export function CollaboratorMasterySummary({ collaborator }: { collaborator: Collaborator }) {
  const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
  const activeRole = collaborator.assignment;
  const activeProgress = activeRole
    ? getCollaboratorMasteryProgress(mastery[activeRole])
    : undefined;
  const activeXpLabel = activeProgress?.nextXp === undefined
    ? `${activeProgress?.currentXp ?? 0} XP`
    : `${activeProgress.currentXp}/${activeProgress.nextXp} XP`;

  return (
    <details className="collaborator-mastery" aria-label={`Maestrie di ${collaborator.displayName}`}>
      <summary>
        <span>Maestria operativa</span>
        <strong>
          {activeRole && activeProgress
            ? `${COLLABORATOR_MASTERY_ROLE_LABELS[activeRole]} · ${activeProgress.definition.name}`
            : "Assegna un ruolo per iniziare"}
        </strong>
        <small>
          {activeProgress
            ? `${activeXpLabel} · +${Math.round(activeProgress.definition.multiplier * 100)}%`
            : "6 percorsi disponibili"}
        </small>
      </summary>
      <div className="mastery-grid">
        {COLLABORATOR_MASTERY_ROLES.map((role) => {
          const progress = getCollaboratorMasteryProgress(mastery[role]);
          const active = collaborator.assignment === role;
          const xpLabel = progress.nextXp === undefined
            ? `${progress.currentXp} XP`
            : `${progress.currentXp}/${progress.nextXp} XP`;
          return (
            <div
              className={active ? "mastery-entry active" : "mastery-entry"}
              key={role}
              title={`${COLLABORATOR_MASTERY_ROLE_LABELS[role]}: ${progress.definition.name}, ${xpLabel}`}
            >
              <strong>{progress.definition.name}</strong>
              <small>
                {COLLABORATOR_MASTERY_ROLE_LABELS[role]} · +{Math.round(progress.definition.multiplier * 100)}% · {xpLabel}
              </small>
              <ProgressBar className="mastery-track" value={progress.progress} ariaHidden />
            </div>
          );
        })}
      </div>
    </details>
  );
}
