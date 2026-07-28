import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { ProgressBar } from "../../components/common/ProgressBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { getContactPreparation, hasUnlockedOfficialStats } from "../../game/athleteStats";
import { isCourseXUnlocked } from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
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
  sortSectorCollaborators,
  type SectorCollaboratorSort,
  type SectorCollaboratorSortKey,
} from "./collaboratorSorting";
import { getInstructorTeachingEntries } from "./instructorGroupPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";
import { SectorStatisticsSummary } from "./SectorStatisticsSummary";
import { InstructorCompactActivity, InstructorCompactTraining } from "./TrainingControl";

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function SectorSortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SectorCollaboratorSortKey;
  sort: SectorCollaboratorSort | null;
  onSort: (key: SectorCollaboratorSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <span role="columnheader" aria-sort={active ? sort.direction : "none"}>
      <button
        type="button"
        className={`sector-roster-sort-button${active ? " is-active" : ""}`}
        aria-label={`Ordina collaboratori per ${label}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span aria-hidden="true">
          {active ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </span>
  );
}

function SectorCollaboratorRow({
  state: stateOverride,
  collaborator,
  contact,
  now,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  onOpen,
}: {
  state?: GameState;
  collaborator: Collaborator;
  contact?: Contact;
  now: number;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onOpen: () => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "gadgets",
      "player",
      "school",
      "statistics",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const activeEmail = selectActiveEmail(state);
  const automation = collaborator.assignment === "instructor"
    ? undefined
    : getCollaboratorAutomationPresentation({
        state,
        collaboratorId: collaborator.id,
        assignment: collaborator.assignment,
        now,
        activeEmail,
      });
  const activity = {
    title: automation?.title ?? "In attesa",
    detail: automation?.detail ?? "Nessuna attività in corso",
  };
  const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
  const masteryProgress = getCollaboratorMasteryProgress(
    mastery[collaborator.assignment ?? "instructor"],
  );
  const officialStats = contact && hasUnlockedOfficialStats(collaborator.forms)
    ? getContactPreparation(contact, collaborator.forms)
    : undefined;

  return (
    <article
      className={`sector-roster-row${collaborator.assignment === "instructor" ? " is-instructor" : ""} ${getRarityClassName(
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
        {collaborator.assignment === "instructor" ? (
          <InstructorCompactActivity collaborator={collaborator} state={stateOverride} />
        ) : (
          <>
            <strong>{activity.title}</strong>
            <small>{activity.detail}</small>
          </>
        )}
      </div>

      <div className="sector-roster-stats" data-label="Arena / Stile">
        <span><small>Arena</small>{officialStats ? <OfficialStatValue value={officialStats.arena} /> : <strong>???</strong>}</span>
        <span><small>Stile</small>{officialStats ? <OfficialStatValue value={officialStats.style} /> : <strong>???</strong>}</span>
      </div>

      <FormLogoStrip
        className="sector-form-strip"
        forms={collaborator.forms}
        instructorForms={collaborator.instructorForms}
        technicianForms={collaborator.technicianForms}
        showLabels={false}
      />

      {collaborator.assignment === "instructor" ? (
        <div className="sector-roster-training" data-label="Formazione">
          <InstructorCompactTraining
            collaborator={collaborator}
            state={stateOverride}
            collaboratorsById={collaboratorsById}
            onStartTraining={onStartTraining}
            onBookTechnicianCourse={onBookTechnicianCourse}
          />
        </div>
      ) : null}

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

export function CollaboratorSectorPanel({
  state: stateOverride,
  role,
  collaboratorsById,
  onStartTraining,
  onBookTechnicianCourse,
  onClose,
}: {
  state?: GameState;
  role: CollaboratorMasteryRole;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onClose: () => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "player",
      "school",
      "statistics",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [sort, setSort] = useState<SectorCollaboratorSort | null>(null);
  const assigned = useMemo(
    () => state.collaborators.filter((collaborator) => collaborator.assignment === role),
    [role, state.collaborators],
  );
  const contactsById = useMemo(
    () => new Map(state.contacts.map((contact) => [contact.id, contact])),
    [state.contacts],
  );
  const hasTimedWork = getInstructorTeachingEntries(state, courseXUnlocked).length > 0 ||
    state.acquisitionEvents.some((event) => event.status === "running");
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const sortContext = useMemo(() => ({
    state,
    contactsById,
    activeEmail: selectActiveEmail(state),
    now,
    role,
  }), [contactsById, now, role, state]);
  const sortedAssigned = useMemo(
    () => sortSectorCollaborators(assigned, sort, sortContext),
    [assigned, sort, sortContext],
  );
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

  const handleSort = (key: SectorCollaboratorSortKey) => {
    setSort((current) => current?.key === key
      ? {
          key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : { key, direction: "ascending" });
  };

  const selectSort = (key: SectorCollaboratorSortKey) => {
    setSort((current) => ({
      key,
      direction: current?.direction ?? "ascending",
    }));
  };

  const reverseSort = () => {
    setSort((current) => current
      ? {
          ...current,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        }
      : current);
  };

  return (
    <>
      <button
        type="button"
        className="sector-panel-backdrop"
        aria-label={`Chiudi ${roleLabel} cliccando sullo sfondo`}
        onClick={onClose}
      />
      <aside
        className={`collaborator-sector-panel${role === "instructor" ? " is-instructor" : ""}`}
        role="dialog"
        aria-labelledby="sector-panel-title"
      >
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
          <SectorMasteryIndicator
            className="sector-panel-mastery-summary"
            collaborators={assigned}
            role={role}
          />
          <SectorStatisticsSummary
            state={stateOverride}
            role={role}
            collaborators={assigned}
          />
        </div>

        <div className="sector-panel-content">
          {assigned.length === 0 ? (
            <div className="sector-panel-empty">
              <Icon name="people" />
              <strong>Nessun collaboratore assegnato</strong>
              <span>Usa il pulsante + nella box del settore per assegnarne uno.</span>
            </div>
          ) : (
            <div className="sector-roster">
              <div className="sector-roster-sort-mobile" aria-label="Ordina collaboratori del settore">
                <label>
                  <span>Ordina per</span>
                  <select
                    aria-label="Campo di ordinamento collaboratori del settore"
                    value={sort?.key ?? ""}
                    onChange={(event) => selectSort(event.target.value as SectorCollaboratorSortKey)}
                  >
                    <option value="" disabled>Seleziona</option>
                    <option value="name">Collaboratore</option>
                    <option value="mastery">Maestria</option>
                    <option value="activity">Attività</option>
                    <option value="arena">Arena</option>
                    <option value="style">Stile</option>
                    <option value="forms">Forme</option>
                    {role === "instructor" ? <option value="training">Formazione</option> : null}
                  </select>
                </label>
                <button type="button" disabled={!sort} onClick={reverseSort}>
                  {sort?.direction === "descending" ? "Decrescente ↓" : "Crescente ↑"}
                </button>
              </div>
              <div className="sector-roster-head" role="row">
                <SectorSortableHeader label="Collaboratore" sortKey="name" sort={sort} onSort={handleSort} />
                <SectorSortableHeader label="Maestria" sortKey="mastery" sort={sort} onSort={handleSort} />
                <SectorSortableHeader label="Attività" sortKey="activity" sort={sort} onSort={handleSort} />
                <span
                  className="sector-roster-stat-sort"
                  role="columnheader"
                  aria-sort={sort?.key === "arena" || sort?.key === "style" ? sort.direction : "none"}
                >
                  <button
                    type="button"
                    className={sort?.key === "arena" ? "is-active" : ""}
                    aria-label="Ordina collaboratori per Arena"
                    onClick={() => handleSort("arena")}
                  >Arena {sort?.key === "arena" ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}</button>
                  <button
                    type="button"
                    className={sort?.key === "style" ? "is-active" : ""}
                    aria-label="Ordina collaboratori per Stile"
                    onClick={() => handleSort("style")}
                  >Stile {sort?.key === "style" ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}</button>
                </span>
                <SectorSortableHeader label="Forme" sortKey="forms" sort={sort} onSort={handleSort} />
                {role === "instructor" ? (
                  <SectorSortableHeader label="Formazione" sortKey="training" sort={sort} onSort={handleSort} />
                ) : null}
                <span aria-hidden="true" />
              </div>
              {sortedAssigned.map((collaborator) => (
                <SectorCollaboratorRow
                  key={collaborator.id}
                  state={stateOverride}
                  collaborator={collaborator}
                  contact={contactsById.get(collaborator.contactId)}
                  now={now}
                  collaboratorsById={collaboratorsById}
                  onStartTraining={onStartTraining}
                  onBookTechnicianCourse={onBookTechnicianCourse}
                  onOpen={() => setSelectedCollaboratorId(collaborator.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {selectedCollaborator && selectedAutomation ? (
        <CollaboratorDetailDrawer
          state={stateOverride}
          collaborator={selectedCollaborator}
          contact={contactsById.get(selectedCollaborator.contactId)}
          automation={selectedAutomation}
          collaboratorsById={collaboratorsById}
          onAssign={() => undefined}
          onStartTraining={onStartTraining}
          onBookTechnicianCourse={onBookTechnicianCourse}
          allowAssignment={false}
          onClose={() => setSelectedCollaboratorId(null)}
        />
      ) : null}
    </>
  );
}
