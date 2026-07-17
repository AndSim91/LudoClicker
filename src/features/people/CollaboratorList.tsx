import { Icon } from "../../components/common/Icon";
import { COLLABORATOR_ASSIGNMENT_LABELS } from "../../content/collaboratorRoles";
import { getCollaboratorBonusSummary } from "../../content/forms";
import { PERSON_RARITIES } from "../../content/rarities";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { CollaboratorMasterySummary } from "./CollaboratorMasterySummary";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { InstructorPanel, TrainingControl } from "./TrainingControl";

export function CollaboratorList({
  state,
  onAssign,
  onStartTraining,
  onToggleInstructorAutomation,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
}) {
  const contactsById = new Map<string, Contact>(
    state.contacts.map((contact) => [contact.id, contact]),
  );

  return (
    <section className="collaborator-list" aria-label="Collaboratori delle Onde">
      {state.collaborators.length === 0 ? (
        <div className="people-empty">
          <Icon name="contact" />
          <strong>Nessun collaboratore disponibile</strong>
          <span>Gli Ultra Rari diventano collaboratori dopo il Corso Y; i Leggendari lo sono dall'iscrizione.</span>
        </div>
      ) : state.collaborators.map((collaborator) => {
        const contact = contactsById.get(collaborator.contactId);
        const bonusSummary = getCollaboratorBonusSummary(collaborator);
        return (
          <article className={`collaborator-row rarity-${collaborator.rarity}`} key={collaborator.id}>
            <div className="collaborator-identity">
              <div className={`person-avatar rarity-${collaborator.rarity}`} aria-hidden="true">
                {collaborator.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}
              </div>
              <div className="collaborator-copy">
                <PersonName displayName={collaborator.displayName} rarity={collaborator.rarity} />
                <span className={`collaborator-tier rarity-${collaborator.rarity}`}>
                  {PERSON_RARITIES[collaborator.rarity].collaboratorBadgeLabel}
                </span>
                <span className={`rarity-address rarity-${collaborator.rarity}`}>{contact?.email}</span>
              </div>
            </div>
            <div className="collaborator-profile">
              <div className="collaborator-section-heading">
                <strong>
                  {collaborator.forms.length} {collaborator.forms.length === 1
                    ? "forma conosciuta"
                    : "forme conosciute"}
                </strong>
              </div>
              <FormLogoStrip forms={collaborator.forms} />
              <div className="collaborator-bonus">
                <span>Bonus attivo</span>
                <strong className="form-bonus-summary">
                  {bonusSummary || "Nessun bonus d'arma attivo"}
                </strong>
              </div>
              <CollaboratorMasterySummary collaborator={collaborator} />
              {collaborator.assignment === "instructor" || collaborator.instructorForms.length > 0
                ? <small className="collaborator-certificates">Attestati da istruttore: {collaborator.instructorForms.length}</small>
                : null}
            </div>
            <div className="collaborator-actions">
              <label className="collaborator-assignment">
                <span>Assegnazione</span>
                <select
                  aria-label="Assegnazione"
                  value={collaborator.assignment ?? ""}
                  onChange={(event) => onAssign(
                    collaborator.id,
                    (event.target.value || null) as CollaboratorAssignment,
                  )}
                >
                  <option value="">Non assegnato</option>
                  {Object.entries(COLLABORATOR_ASSIGNMENT_LABELS).map(([value, label]) => {
                    const disabled = value === "social" && !state.unlocks.social;
                    const suffix = disabled ? " — si sblocca con 10 iscritti" : "";
                    return (
                      <option value={value} key={value} disabled={disabled}>
                        {label}{suffix}
                      </option>
                    );
                  })}
                </select>
              </label>
              <div className="collaborator-training">
                <span className="collaborator-action-label">Formazione</span>
                {collaborator.assignment === "instructor" ? (
                  <InstructorPanel
                    collaborator={collaborator}
                    state={state}
                    onStartTraining={onStartTraining}
                    onToggle={onToggleInstructorAutomation}
                  />
                ) : (
                  <TrainingControl
                    personId={collaborator.id}
                    displayName={collaborator.displayName}
                    student={collaborator}
                    state={state}
                    onStartTraining={onStartTraining}
                  />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
