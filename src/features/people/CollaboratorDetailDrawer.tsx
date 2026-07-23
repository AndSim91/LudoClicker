import { useEffect } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  COLLABORATOR_ASSIGNMENT_LABELS,
  getCollaboratorAssignmentLabel,
} from "../../content/collaboratorRoles";
import { getCollaboratorBonusSummary } from "../../content/forms";
import { PERSON_RARITIES } from "../../content/rarities";
import type {
  Collaborator,
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { CollaboratorMasterySummary } from "./CollaboratorMasterySummary";
import type { CollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { InstructorPanel, TrainingControl } from "./TrainingControl";

export function CollaboratorDetailDrawer({
  state,
  collaborator,
  contact,
  automation,
  collaboratorsById,
  onAssign,
  onStartTraining,
  onPayInstructorCertificates,
  onToggleInstructorAutomation,
  onClose,
}: {
  state: GameState;
  collaborator: Collaborator;
  contact?: Contact;
  automation: CollaboratorAutomationPresentation;
  collaboratorsById: Map<string, Collaborator>;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const bonusSummary = getCollaboratorBonusSummary(collaborator) ||
    "Nessun bonus d'arma attivo";
  const badgeLabel = PERSON_RARITIES[collaborator.rarity].collaboratorBadgeLabel;

  return (
    <aside
      className="collaborator-detail-drawer"
      role="dialog"
      aria-labelledby="collaborator-detail-title"
    >
      <header className="collaborator-detail-heading">
        <h2 id="collaborator-detail-title">Scheda collaboratore</h2>
        <button
          type="button"
          className="collaborator-detail-close"
          aria-label="Chiudi scheda collaboratore"
          onClick={onClose}
          autoFocus
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>
      </header>

      <div className="collaborator-detail-scroll">
        <section className="collaborator-detail-identity">
          <div className={`person-avatar ${getRarityClassName(collaborator.rarity, Boolean(contact?.secretLegendaryId))}`} aria-hidden="true">
            {collaborator.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </div>
          <div>
            <PersonName
              displayName={collaborator.displayName}
              rarity={collaborator.rarity}
              secretLegendary={Boolean(contact?.secretLegendaryId)}
            />
            {badgeLabel ? <span>{badgeLabel}</span> : null}
            {contact ? (
              <span className={`rarity-address ${getRarityClassName(collaborator.rarity, Boolean(contact.secretLegendaryId))}`}>{contact.email}</span>
            ) : null}
          </div>
        </section>

        <section className="collaborator-detail-current" aria-label="Attività corrente">
          <div>
            <span>Assegnazione attuale</span>
            <strong>
              {collaborator.assignment
                ? getCollaboratorAssignmentLabel(
                    collaborator.assignment,
                    state.unlocks.social,
                  )
                : "Non assegnato"}
            </strong>
          </div>
          <div>
            <span>Lavoro attuale</span>
            <strong>{automation.title}</strong>
            {automation.detail ? <small>{automation.detail}</small> : null}
          </div>
          <div className="collaborator-detail-progress">
            <span>Progresso</span>
            {automation.progress === undefined ? (
              <strong>—</strong>
            ) : (
              <>
                <strong>{Math.round(automation.progress)}%</strong>
                <ProgressBar
                  className="collaborator-progress-bar"
                  label={automation.progressLabel ?? automation.title}
                  value={automation.progress}
                  durationMs={automation.durationMs}
                />
              </>
            )}
          </div>
        </section>

        <section className="collaborator-detail-profile">
          <div>
            <h3>Forme conosciute</h3>
            <FormLogoStrip
              forms={collaborator.forms}
              instructorForms={collaborator.instructorForms}
            />
          </div>
          <div>
            <h3>Bonus attivo</h3>
            <strong className="form-bonus-summary">{bonusSummary}</strong>
          </div>
        </section>

        <section className="collaborator-detail-section">
          <h3>Maestrie</h3>
          <CollaboratorMasterySummary
            collaborator={collaborator}
            socialUnlocked={state.unlocks.social}
            defaultOpen
          />
        </section>

        <section className="collaborator-detail-section">
          <h3>Formazione</h3>
          {collaborator.assignment === "instructor" ? (
            <InstructorPanel
              collaborator={collaborator}
              state={state}
              onStartTraining={onStartTraining}
              onPayInstructorCertificates={onPayInstructorCertificates}
              onToggle={onToggleInstructorAutomation}
              collaboratorsById={collaboratorsById}
            />
          ) : (
            <TrainingControl
              personId={collaborator.id}
              displayName={collaborator.displayName}
              student={collaborator}
              state={state}
              collaboratorsById={collaboratorsById}
              onStartTraining={onStartTraining}
            />
          )}
        </section>

        <section className="collaborator-detail-section collaborator-detail-certificates">
          <h3>Attestati da istruttore</h3>
          <span>{collaborator.instructorForms.length} attestati</span>
        </section>

        <label className="collaborator-detail-assignment">
          <span>Assegnazione</span>
          <select
            aria-label={`Assegnazione di ${collaborator.displayName}`}
            data-tutorial-region={state.unlocks.social
              ? "collaborator-social-assignment"
              : undefined}
            data-tutorial-target={state.unlocks.social ? "true" : undefined}
            value={collaborator.assignment ?? ""}
            onChange={(event) => onAssign(
              collaborator.id,
              (event.target.value || null) as CollaboratorAssignment,
            )}
          >
            <option value="">Non assegnato</option>
            {Object.keys(COLLABORATOR_ASSIGNMENT_LABELS).map((value) => (
              <option value={value} key={value}>
                {getCollaboratorAssignmentLabel(
                  value as Exclude<CollaboratorAssignment, null>,
                  state.unlocks.social,
                )}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
