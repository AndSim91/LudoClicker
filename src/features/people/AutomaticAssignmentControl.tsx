import { Icon } from "../../components/common/Icon";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  getAutomaticAssignmentRoles,
  getCollaboratorAssignmentCounts,
} from "../../game/collaboratorManagement";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { CollaboratorMasteryRole, GameState } from "../../game/types";

/**
 * «Assegnazione automatica» (4.7): one switch. On, free and new collaborators
 * follow the sector shares (editable here); the assigned ones never move and
 * the manual controls rest. Off, everything is back in the player's hands.
 */
export function AutomaticAssignmentControl({
  state: stateOverride,
  onToggle,
  onChangeShare,
}: {
  state?: GameState;
  onToggle: (enabled: boolean) => void;
  onChangeShare: (assignment: CollaboratorMasteryRole, delta: number) => void;
}) {
  const state = useGameStateSlices(
    ["collaboratorManagement", "collaborators", "unlocks"],
    stateOverride,
  );
  const shares = state.collaboratorManagement.automaticShares;
  const roles = getAutomaticAssignmentRoles(state);
  const counts = getCollaboratorAssignmentCounts(state);
  const totalShare = roles.reduce((total, role) => total + (shares?.[role] ?? 0), 0);

  return (
    <section className={`automatic-assignment${shares ? " is-on" : ""}`} aria-labelledby="automatic-assignment-title">
      <header>
        <label className="switch-toggle">
          <input
            type="checkbox"
            checked={Boolean(shares)}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            aria-describedby="automatic-assignment-help"
          />
          <strong id="automatic-assignment-title">Assegnazione automatica</strong>
        </label>
        <p id="automatic-assignment-help">
          {shares
            ? "Liberi e nuovi arrivati vanno dove manca più gente, e ci va chi è più portato. Chi ha già un posto non si muove."
            : "Tiene le proporzioni dei settori anche con i nuovi arrivati."}
        </p>
      </header>
      {shares ? (
        <ul className="automatic-assignment-shares" aria-label="Proporzioni dei settori">
          {roles.map((role) => {
            const label = getCollaboratorAssignmentLabel(role, state.unlocks.social);
            const share = shares[role] ?? 0;
            const percent = totalShare > 0 ? Math.round(share / totalShare * 100) : 0;
            return (
              <li key={role}>
                <span>
                  <strong>{label}</strong>
                  <small>{counts[role]} assegnati</small>
                </span>
                <span className="sector-staffing-stepper">
                  <button
                    type="button"
                    onClick={() => onChangeShare(role, -1)}
                    disabled={share <= 0}
                    aria-label={`Riduci la quota di ${label}`}
                  >
                    <Icon name="minus" />
                  </button>
                  <span aria-label={`Quota di ${label}: ${percent}%`}><strong>{percent}%</strong></span>
                  <button
                    type="button"
                    onClick={() => onChangeShare(role, 1)}
                    disabled={share >= 100}
                    aria-label={`Aumenta la quota di ${label}`}
                  >
                    <Icon name="plus" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
