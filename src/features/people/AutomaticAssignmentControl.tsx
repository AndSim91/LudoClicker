import { Icon } from "../../components/common/Icon";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  AUTOMATIC_MAX_LEVEL,
  getAutomaticAssignmentRoles,
  getAutomaticSectorCounts,
  getAutomaticShareLevel,
} from "../../game/collaboratorManagement";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { CollaboratorMasteryRole, GameState } from "../../game/types";

/** Shown instead of the full name when the panel is phone-narrow. */
const SHORT_LABELS: Partial<Record<string, string>> = {
  Redazione: "Redaz.",
  Attrezzatura: "Attrezz.",
  Istruttore: "Istrutt.",
};

const NOTCHES = Array.from({ length: AUTOMATIC_MAX_LEVEL }, (_, index) => index + 1);

/**
 * «Assegnazione automatica» (4.7): one switch. On, each sector has an effort
 * bar of five notches, independent of the others; changing one moves people
 * right away and the newcomers follow the bars. Off, everything is back in
 * the player's hands.
 */
export function AutomaticAssignmentControl({
  state: stateOverride,
  onToggle,
  onChangeShare,
}: {
  state?: GameState;
  onToggle: (enabled: boolean) => void;
  onChangeShare: (assignment: CollaboratorMasteryRole, level: number) => void;
}) {
  const state = useGameStateSlices(
    ["collaboratorManagement", "collaborators", "unlocks"],
    stateOverride,
  );
  const shares = state.collaboratorManagement.automaticShares;
  const roles = getAutomaticAssignmentRoles(state);
  const counts = getAutomaticSectorCounts(state);
  const finishingLessons = Object.keys(state.collaboratorManagement.automaticPendingMoves ?? {}).length;
  const help = shares
    ? "Più tacche, più persone in quel settore. Si spostano subito, e ci va chi è più portato."
    : "Divide i collaboratori tra i settori con delle barre di impegno, nuovi arrivati compresi.";
  const finishingText = `${finishingLessons} ${finishingLessons === 1 ? "finisce" : "finiscono"} le lezioni, poi ${finishingLessons === 1 ? "cambia" : "cambiano"} settore`;

  return (
    <section className={`automatic-assignment${shares ? " is-on" : ""}`} aria-labelledby="automatic-assignment-title">
      <header>
        <label className="switch-toggle" title={help}>
          <input
            type="checkbox"
            checked={Boolean(shares)}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            aria-describedby="automatic-assignment-help"
          />
          <strong id="automatic-assignment-title">Assegnazione automatica</strong>
        </label>
        <p id="automatic-assignment-help" className={shares ? "sr-only" : undefined}>{help}</p>
      </header>
      {shares ? (
        <ul className="automatic-assignment-shares" aria-label="Impegno dei settori">
          {roles.map((role) => {
            const label = getCollaboratorAssignmentLabel(role, state.unlocks.social);
            const level = getAutomaticShareLevel(shares[role]);
            const people = counts[role];
            return (
              <li key={role}>
                <strong className="automatic-assignment-label" title={label}>
                  <span className="is-full">{label}</span>
                  <span className="is-short" aria-hidden="true">{SHORT_LABELS[label] ?? label}</span>
                </strong>
                <span
                  className="automatic-assignment-effort"
                  role="group"
                  aria-label={`Impegno di ${label}: ${level} su ${AUTOMATIC_MAX_LEVEL}`}
                >
                  {NOTCHES.map((notch) => (
                    <button
                      key={notch}
                      type="button"
                      className={notch <= level ? "is-filled" : undefined}
                      aria-pressed={notch <= level}
                      aria-label={`${label}: impegno ${notch} su ${AUTOMATIC_MAX_LEVEL}`}
                      onClick={() => onChangeShare(role, notch === level ? notch - 1 : notch)}
                    />
                  ))}
                </span>
                <span className="automatic-assignment-people" title={`${people} ${people === 1 ? "persona" : "persone"}`}>
                  {people}
                  <span className="sr-only"> {people === 1 ? "persona" : "persone"}</span>
                </span>
                {role === "instructor" && finishingLessons > 0 ? (
                  <span className="automatic-assignment-finishing" title={finishingText}>
                    <Icon name="clock" />
                    {finishingLessons}
                    <span className="sr-only">: {finishingText}</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
