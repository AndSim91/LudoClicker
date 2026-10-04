import { useState } from "react";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  getUpgradeEffectTotal,
  isOperationalPrioritiesUnlocked,
} from "../../content/upgrades";
import {
  getShiftRow,
  getShiftShare,
  getShiftSummary,
} from "../../game/collaboratorFallback";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { CollaboratorMasteryRole, GameState } from "../../game/types";

/**
 * «Turni e precedenza» (proposta B): one row of sectors. Whoever is idle helps
 * the first sector of the row that is working, and the same row decides who
 * spends scarce euros and swords first. Turni shows the states, Priorità
 * operative lets the player reorder (a click moves a sector one place ahead,
 * or drag it).
 */
export function ShiftControl({
  state: stateOverride,
  onMove,
}: {
  state?: GameState;
  onMove: (assignment: CollaboratorMasteryRole, toIndex: number) => void;
}) {
  const state = useGameStateSlices(
    ["acquisitionEvents", "collaboratorManagement", "collaborators", "contacts", "emails", "equipment", "gadgets", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const [dragged, setDragged] = useState<CollaboratorMasteryRole | null>(null);
  const shifts = getUpgradeEffectTotal(state.upgrades, "collaboratorFallbackTier") > 0;
  const movable = isOperationalPrioritiesUnlocked(state.upgrades);
  if (!shifts && !movable) return null;

  const row = getShiftRow(state);
  const full = state.collaboratorManagement.operationalPriorities;
  const summary = shifts ? getShiftSummary(state) : undefined;
  const share = Math.round(getShiftShare(state) * 100);
  const title = shifts && movable ? "Turni e precedenza" : shifts ? "Turni" : "Precedenza";
  const help = [
    shifts ? `Chi è fermo dà il ${share}% della sua resa al primo settore della fila che sta lavorando. Gli Istruttori possono aiutare ma non ricevono aiuto.` : "",
    "Quando fondi e spade non bastano per tutti, si serve prima chi sta a sinistra.",
    movable ? "Clic su un settore per farlo passare avanti, o trascinalo." : "Con «Priorità operative» potrai cambiare l'ordine.",
  ].filter(Boolean).join(" ");
  const label = (role: CollaboratorMasteryRole) => getCollaboratorAssignmentLabel(role, state.unlocks.social);
  const moveTo = (role: CollaboratorMasteryRole, target: CollaboratorMasteryRole) =>
    onMove(role, full.indexOf(target));

  return (
    <section className={`shift-control${shifts ? " is-on" : ""}`} aria-labelledby="shift-control-title">
      <header title={help}>
        <strong id="shift-control-title">{title}</strong>
        {shifts ? <span className="shift-control-share">{share}%</span> : null}
        <span className="shift-control-help" aria-hidden="true">?</span>
        <p className="sr-only">{help}</p>
      </header>
      <ol className="shift-control-row">
        {row.map((role, index) => {
          const idle = summary?.idleRoles.has(role) ?? false;
          const helpers = summary?.receiver === role ? summary.helpers.length : 0;
          const content = (
            <>
              <span className="shift-control-position">{index + 1}</span>
              <strong>{label(role)}</strong>
              {helpers > 0 ? (
                <span className="shift-control-state is-receiving" title={`${helpers} ${helpers === 1 ? "persona ferma dà" : "persone ferme danno"} una mano`}>
                  +{helpers}<span className="sr-only"> in aiuto</span>
                </span>
              ) : idle ? (
                <span className="shift-control-state">fermo</span>
              ) : null}
            </>
          );
          const className = `shift-control-sector${idle ? " is-idle" : ""}${dragged === role ? " is-dragging" : ""}`;
          return (
            <li key={role}>
              {movable ? (
                <button
                  type="button"
                  className={className}
                  draggable
                  aria-label={index > 0 ? `${index + 1}º ${label(role)}: passa avanti` : `1º ${label(role)}`}
                  onClick={() => { if (index > 0) moveTo(role, row[index - 1]); }}
                  onDragStart={(event) => { setDragged(role); event.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(event) => { if (dragged) event.preventDefault(); }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragged && dragged !== role) moveTo(dragged, role);
                    setDragged(null);
                  }}
                  onDragEnd={() => setDragged(null)}
                >
                  {content}
                </button>
              ) : (
                <span className={className}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
