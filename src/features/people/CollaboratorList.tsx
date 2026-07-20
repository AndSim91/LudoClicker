import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { COLLABORATOR_ASSIGNMENT_LABELS } from "../../content/collaboratorRoles";
import { getEmailBuildLength } from "../../content/emailBuild";
import { getCollaboratorBonusSummary } from "../../content/forms";
import { PERSON_RARITIES } from "../../content/rarities";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getSocialUnlockRequirementLabel } from "../../game/unlocks";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import { selectActiveEmail } from "../../game/selectors";
import { formatCurrency } from "../../shared/formatters";
import { CollaboratorMasterySummary } from "./CollaboratorMasterySummary";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { InstructorPanel, TrainingControl } from "./TrainingControl";

const COLLABORATORS_PER_PAGE = 25;

function getTimedProgress(startedAt: number, completesAt: number, now: number): number {
  const duration = completesAt - startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, Math.round(((now - startedAt) / duration) * 100)));
}

function CollaboratorAutomationProgress({
  state,
  collaboratorId,
  assignment,
  now,
  activeEmail,
}: {
  state: GameState;
  collaboratorId: string;
  assignment: CollaboratorAssignment;
  now: number;
  activeEmail: ReturnType<typeof selectActiveEmail>;
}) {
  if (assignment === "writing") {
    const email = activeEmail;
    if (!email || email.status !== "writing") return <small>In attesa</small>;
    const length = getEmailBuildLength(email);
    const progress = length === 0
      ? 100
      : Math.min(100, Math.round((email.revealedCharacters / length) * 100));
    return (
      <div className="collaborator-automation-progress">
        <span>{email.subject}</span><strong>{progress}%</strong>
        <ProgressBar
          className="collaborator-progress-bar"
          label={`Scrittura di ${email.subject}`}
          value={progress}
        />
      </div>
    );
  }
  if (assignment === "events") {
    const event = state.acquisitionEvents.find((candidate) =>
      candidate.status === "running" && candidate.collaboratorId === collaboratorId
    );
    if (!event) return <small>In attesa</small>;
    const progress = getTimedProgress(event.startedAt, event.resolvesAt, now);
    return (
      <div className="collaborator-automation-progress">
        <span>{event.title}</span><strong>{progress}%</strong>
        <ProgressBar className="collaborator-progress-bar" label={event.title} value={progress} />
      </div>
    );
  }
  if (assignment === "lessons") {
    const progress = Math.min(100, Math.floor(state.automation.lessonBuffer * 100));
    return (
      <div className="collaborator-automation-progress">
        <span>Prossimo punto Arena o Stile</span><strong>{progress}%</strong>
        <ProgressBar
          className="collaborator-progress-bar"
          label="Progresso miglioramento atleta"
          value={progress}
        />
        <small className="collaborator-last-result">
          {state.automation.lastImprovedAthlete
            ? `Ultimo atleta migliorato: ${state.automation.lastImprovedAthlete}`
            : "Nessun atleta migliorato finora"}
        </small>
      </div>
    );
  }
  if (assignment === "social") {
    const progress = Math.min(100, Math.floor(state.automation.socialBuffer * 100));
    return (
      <div className="collaborator-automation-progress">
        <span>Prossimo rendimento · {formatCurrency(state.school.activeMembers * GAME_CONFIG.socialIncomePerMember)}</span><strong>{progress}%</strong>
        <ProgressBar
          className="collaborator-progress-bar"
          label="Progresso ciclo pubblicitario Social"
          value={progress}
        />
        <small className="collaborator-last-result">Ciclo base 60 s · 10% prova · 20% nuovo contatto</small>
      </div>
    );
  }
  if (assignment === "equipment") {
    if (state.equipment.wear <= 0) {
      return <small>Usura attrezzatura: 0% · In attesa</small>;
    }
    const progress = Math.min(100, Math.floor(state.automation.equipmentBuffer * 100));
    return (
      <div className="collaborator-automation-progress">
        <span>Usura attrezzatura: {state.equipment.wear}%</span><strong>{progress}%</strong>
        <ProgressBar
          className="collaborator-progress-bar"
          label="Progresso riduzione usura"
          value={progress}
        />
      </div>
    );
  }
  return null;
}

export function CollaboratorList({
  state,
  onAssign,
  onStartTraining,
  onPayInstructorCertificates,
  onToggleInstructorAutomation,
  onToggleAgonistCourses,
  collaboratorsById,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
  onToggleAgonistCourses?: (enabled: boolean) => void;
  collaboratorsById: Map<string, GameState["collaborators"][number]>;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const contactsById = useMemo(
    () => new Map<string, Contact>(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const activeEmail = selectActiveEmail(state);
  const hasTimedAutomation = state.acquisitionEvents.some((event) =>
    event.status === "running" && event.collaboratorId !== undefined
  );
  const now = useGameTime(hasTimedAutomation, 1_000);
  const pageCount = Math.max(
    1,
    Math.ceil(state.collaborators.length / COLLABORATORS_PER_PAGE),
  );
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleCollaborators = state.collaborators.slice(
    page * COLLABORATORS_PER_PAGE,
    (page + 1) * COLLABORATORS_PER_PAGE,
  );

  return (
    <section className="collaborator-list" aria-label="Collaboratori delle Onde">
      {(state.upgrades["technical-arena"] ?? 0) >= 1 ? (
        <div className="agonist-course-setting">
          <span>
            <strong>Corso Agonisti</strong>
            <small>Protegge gli allievi a rischio senza altre Forme disponibili.</small>
          </span>
          <label className="instructor-toggle">
            <input
              type="checkbox"
              checked={state.automation.agonistCoursesEnabled}
              onChange={(event) => onToggleAgonistCourses?.(event.target.checked)}
            /> Attivo
          </label>
        </div>
      ) : null}
      {state.collaborators.length === 0 ? (
        <div className="people-empty">
          <Icon name="contact" />
          <strong>Nessun collaboratore disponibile</strong>
          <span>Gli Ultra Rari diventano collaboratori dopo il Corso Y; i Leggendari lo sono dall'iscrizione.</span>
        </div>
      ) : visibleCollaborators.map((collaborator) => {
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
                    const suffix = disabled
                      ? ` — si sblocca con ${getSocialUnlockRequirementLabel()}`
                      : "";
                    return (
                      <option value={value} key={value} disabled={disabled}>
                        {label}{suffix}
                      </option>
                    );
                  })}
                </select>
              </label>
              <CollaboratorAutomationProgress
                state={state}
                collaboratorId={collaborator.id}
                assignment={collaborator.assignment}
                now={now}
                activeEmail={activeEmail}
              />
              <div className="collaborator-training">
                <span className="collaborator-action-label">Formazione</span>
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
              </div>
            </div>
          </article>
        );
      })}
      {pageCount > 1 ? (
        <nav className="list-pagination" aria-label="Pagine collaboratori">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setRequestedPage((current) => Math.max(0, current - 1))}
          >
            Precedente
          </button>
          <span>Pagina {page + 1} di {pageCount}</span>
          <button
            type="button"
            disabled={page === pageCount - 1}
            onClick={() => setRequestedPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Successiva
          </button>
        </nav>
      ) : null}
    </section>
  );
}
