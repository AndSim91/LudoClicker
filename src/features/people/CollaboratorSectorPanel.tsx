import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import { FORM_DEFINITIONS, getCollaboratorProductivity } from "../../content/forms";
import {
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasCompletedCourseX } from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import { selectActiveEmail } from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  Contact,
  FormId,
  GameState,
} from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";
import { CollaboratorDetailDrawer } from "./CollaboratorDetailDrawer";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";
import {
  getInstructorCoverageForms,
  getInstructorTeachingEntries,
  getInstructorTeachingTitle,
  getInstructorTrainingProgress,
} from "./instructorGroupPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";

type InstructorPanelTab = "lessons" | "instructors" | "coverage";

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function getInstructorActivity(
  collaborator: Collaborator,
  state: GameState,
  teachingCount: number,
): { title: string; detail: string } {
  if (teachingCount > 0) {
    return {
      title: "Insegnamento in corso...",
      detail: `${teachingCount} ${teachingCount === 1 ? "allievo seguito" : "allievi seguiti"}`,
    };
  }
  if (collaborator.training) {
    return { title: "Formazione personale", detail: "Forma o attestato in corso" };
  }
  if ((state.upgrades["athletic-preparation"] ?? 0) > 0) {
    return {
      title: "Preparazione atletica",
      detail: "Disponibile come priorità finale",
    };
  }
  return { title: "In attesa", detail: "Nessun allievo compatibile" };
}

function SectorCollaboratorRow({
  state,
  collaborator,
  contact,
  now,
  onOpen,
}: {
  state: GameState;
  collaborator: Collaborator;
  contact?: Contact;
  now: number;
  onOpen: () => void;
}) {
  const activeEmail = selectActiveEmail(state);
  const teachingEntries = getInstructorTeachingEntries(state).filter(
    (entry) => entry.instructorId === collaborator.id,
  );
  const automation = collaborator.assignment === "instructor"
    ? undefined
    : getCollaboratorAutomationPresentation({
        state,
        collaboratorId: collaborator.id,
        assignment: collaborator.assignment,
        now,
        activeEmail,
      });
  const activity = collaborator.assignment === "instructor"
    ? getInstructorActivity(collaborator, state, teachingEntries.length)
    : {
        title: automation?.title ?? "In attesa",
        detail: automation?.detail ?? "Nessuna attività in corso",
      };
  const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
  const masteryProgress = getCollaboratorMasteryProgress(
    mastery[collaborator.assignment ?? "instructor"],
  );
  const officialStats = contact && hasCompletedCourseX(collaborator.forms)
    ? getContactPreparation(contact, collaborator.forms)
    : undefined;

  return (
    <article
      className={`sector-roster-row ${getRarityClassName(
        collaborator.rarity,
        Boolean(contact?.secretLegendaryId),
      )}`}
    >
      <div className="sector-roster-identity" data-label="Collaboratore">
        <span
          className={`person-avatar ${getRarityClassName(
            collaborator.rarity,
            Boolean(contact?.secretLegendaryId),
          )}`}
          aria-hidden="true"
        >
          {getInitials(collaborator.displayName)}
        </span>
        <span>
          <PersonName
            displayName={collaborator.displayName}
            rarity={collaborator.rarity}
            secretLegendary={Boolean(contact?.secretLegendaryId)}
          />
          {contact ? <small>{contact.email}</small> : null}
        </span>
      </div>

      <div className="sector-roster-mastery" data-label="Maestria">
        <strong>{masteryProgress.definition.name}</strong>
        <small>{masteryProgress.currentXp} XP</small>
        <ProgressBar
          label={`Maestria di ${collaborator.displayName}`}
          value={masteryProgress.progress}
        />
      </div>

      <div className="sector-roster-activity" data-label="Attività">
        <strong>{activity.title}</strong>
        <small>{activity.detail}</small>
      </div>

      <div className="sector-roster-stats" data-label="Arena / Stile">
        <span><small>Arena</small>{officialStats ? <OfficialStatValue value={officialStats.arena} /> : <strong>???</strong>}</span>
        <span><small>Stile</small>{officialStats ? <OfficialStatValue value={officialStats.style} /> : <strong>???</strong>}</span>
      </div>

      <FormLogoStrip
        className="sector-form-strip"
        forms={collaborator.forms}
        instructorForms={collaborator.instructorForms}
        showLabels={false}
      />

      <button
        type="button"
        className="sector-roster-details"
        onClick={onOpen}
        aria-label={`Apri dettagli di ${collaborator.displayName}`}
      >
        Dettagli
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

function InstructorLessonsPanel({ state, now }: { state: GameState; now: number }) {
  const entries = getInstructorTeachingEntries(state);
  if (entries.length === 0) {
    return (
      <div className="sector-panel-empty">
        <Icon name="clock" />
        <strong>In attesa</strong>
        <span>Nessuna lezione o Corso Agonisti è in corso.</span>
      </div>
    );
  }

  return (
    <div className="sector-lessons-list">
      {entries.map((entry) => {
        const progress = getInstructorTrainingProgress(entry.training, now);
        const waiting = entry.training.status === "waitingForEquipment";
        const instructor = state.collaborators.find(
          (candidate) => candidate.id === entry.instructorId,
        );
        return (
          <article key={`${entry.id}-${entry.training.startedAt}`}>
            <span>
              <strong>{entry.displayName}</strong>
              <small>{getInstructorTeachingTitle(entry, state.upgrades["technical-arena"] ?? 0)}</small>
            </span>
            <span>
              <strong>{instructor?.displayName ?? "Istruttore in assegnazione"}</strong>
              <small>{waiting ? "In attesa di spade" : "Lezione in corso"}</small>
            </span>
            <span className="sector-lesson-progress">
              <strong>{waiting ? "In attesa" : `${Math.round(progress)}%`}</strong>
              <ProgressBar
                label={`Formazione di ${entry.displayName}`}
                value={progress}
                durationMs={entry.training.completesAt - entry.training.startedAt}
              />
            </span>
          </article>
        );
      })}
    </div>
  );
}

function InstructorCoveragePanel({ instructors }: { instructors: Collaborator[] }) {
  const coverageForms = new Set(getInstructorCoverageForms(instructors));
  const definitions = FORM_DEFINITIONS.filter((definition) => coverageForms.has(definition.id));
  if (definitions.length === 0) {
    return (
      <div className="sector-panel-empty">
        <Icon name="warning" />
        <strong>Nessuna Forma coperta</strong>
        <span>Forma gli istruttori e ottieni gli attestati per avviare le lezioni automatiche.</span>
      </div>
    );
  }

  return (
    <div className="sector-coverage-list">
      {definitions.map((definition) => {
        const certified = instructors.filter((instructor) =>
          instructor.instructorForms.includes(definition.id),
        );
        return (
          <article key={definition.id}>
            <FormLogoStrip
              className="sector-form-strip"
              forms={[definition.id]}
              instructorForms={[definition.id]}
              showLabels={false}
            />
            <span>
              <strong>{definition.longName}</strong>
              <small>{definition.branch ?? "Percorso lineare"}</small>
            </span>
            <span>
              {certified.map((instructor) => instructor.displayName).join(", ")}
            </span>
          </article>
        );
      })}
    </div>
  );
}

export function CollaboratorSectorPanel({
  state,
  role,
  collaboratorsById,
  onStartTraining,
  onPayInstructorCertificates,
  onClose,
}: {
  state: GameState;
  role: CollaboratorMasteryRole;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onPayInstructorCertificates?: (collaboratorId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<InstructorPanelTab>(
    role === "instructor" ? "lessons" : "instructors",
  );
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const assigned = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment === role),
    [role, state.collaborators],
  );
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const hasTimedWork = getInstructorTeachingEntries(state).length > 0 ||
    state.acquisitionEvents.some((event) => event.status === "running");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const selectedCollaborator = selectedCollaboratorId
    ? state.collaborators.find((collaborator) => collaborator.id === selectedCollaboratorId)
    : undefined;
  const selectedAutomation = selectedCollaborator
    ? getCollaboratorAutomationPresentation({
        state,
        collaboratorId: selectedCollaborator.id,
        assignment: selectedCollaborator.assignment,
        now,
        activeEmail: selectActiveEmail(state),
      })
    : undefined;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !selectedCollaboratorId) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedCollaboratorId]);

  const roleLabel = role === "instructor"
    ? "Istruttori"
    : getCollaboratorAssignmentLabel(role, state.unlocks.social);
  const productivity = assigned.reduce(
    (total, collaborator) => total + getCollaboratorProductivity(collaborator, role),
    0,
  );

  return (
    <>
      <button
        type="button"
        className="sector-panel-backdrop"
        aria-label={`Chiudi ${roleLabel} cliccando sullo sfondo`}
        onClick={onClose}
      />
      <aside className="collaborator-sector-panel" role="dialog" aria-labelledby="sector-panel-title">
        <header>
          <div>
            <span>{role === "instructor" ? "Centro didattico" : "Settore operativo"}</span>
            <h2 id="sector-panel-title">{roleLabel}</h2>
          </div>
          <button type="button" aria-label={`Chiudi pannello ${roleLabel}`} onClick={onClose} autoFocus>
            <Icon name="close" />
          </button>
        </header>

        <div className="sector-panel-summary">
          <span><strong>{assigned.length}</strong><small>Collaboratori</small></span>
          <span><strong>{productivity.toFixed(1)}×</strong><small>Potenza complessiva</small></span>
          {role === "instructor" ? (
            <span><strong>{getInstructorCoverageForms(assigned).length}</strong><small>Forme coperte</small></span>
          ) : null}
        </div>

        {role === "instructor" ? (
          <nav className="sector-panel-tabs" aria-label="Sezioni del centro didattico">
            <button type="button" className={tab === "lessons" ? "is-active" : ""} onClick={() => setTab("lessons")}>Lezioni</button>
            <button type="button" className={tab === "instructors" ? "is-active" : ""} onClick={() => setTab("instructors")}>Istruttori</button>
            <button type="button" className={tab === "coverage" ? "is-active" : ""} onClick={() => setTab("coverage")}>Copertura Forme</button>
          </nav>
        ) : null}

        <div className="sector-panel-content">
          {role === "instructor" && tab === "lessons" ? (
            <InstructorLessonsPanel state={state} now={now} />
          ) : role === "instructor" && tab === "coverage" ? (
            <InstructorCoveragePanel instructors={assigned} />
          ) : assigned.length === 0 ? (
            <div className="sector-panel-empty">
              <Icon name="people" />
              <strong>Nessun collaboratore assegnato</strong>
              <span>Usa il pulsante + nella box del settore per assegnarne uno.</span>
            </div>
          ) : (
            <div className="sector-roster">
              <div className="sector-roster-head" aria-hidden="true">
                <span>Collaboratore</span><span>Maestria</span><span>Attività</span><span>Arena / Stile</span><span>Forme</span><span />
              </div>
              {assigned.map((collaborator) => (
                <SectorCollaboratorRow
                  key={collaborator.id}
                  state={state}
                  collaborator={collaborator}
                  contact={contactsById.get(collaborator.contactId)}
                  now={now}
                  onOpen={() => setSelectedCollaboratorId(collaborator.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {selectedCollaborator && selectedAutomation ? (
        <CollaboratorDetailDrawer
          state={state}
          collaborator={selectedCollaborator}
          contact={contactsById.get(selectedCollaborator.contactId)}
          automation={selectedAutomation}
          collaboratorsById={collaboratorsById}
          onAssign={() => undefined}
          onStartTraining={onStartTraining}
          onPayInstructorCertificates={onPayInstructorCertificates}
          allowAssignment={false}
          onClose={() => setSelectedCollaboratorId(null)}
        />
      ) : null}
    </>
  );
}
