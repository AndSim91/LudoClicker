import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import type {
  CollaboratorAssignment,
  CollaboratorMasteryRole,
  FormId,
  GameState,
} from "../../game/types";
import { isCollaboratorAreaVisible } from "../../game/unlocks";
import { CollaboratorList } from "./CollaboratorList";
import { CollaboratorSectorView } from "./CollaboratorSectorView";
import { MemberList } from "./MemberList";
import { RarityOverview } from "./RarityOverview";

const ignoreFavoriteToggle = () => undefined;
const ignoreCollaboratorAssignmentChange = () => undefined;

export function PeopleView({
  state,
  onAssign,
  onStartTraining,
  onToggleFavorite,
  onCancelEnrollment,
  onBookTechnicianCourse,
  onIncrementCollaboratorAssignment,
  onDecrementCollaboratorAssignment,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggleFavorite?: (contactId: string) => void;
  onCancelEnrollment?: (contactId: string) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onIncrementCollaboratorAssignment?: (assignment: CollaboratorMasteryRole) => void;
  onDecrementCollaboratorAssignment?: (assignment: CollaboratorMasteryRole) => void;
}) {
  const collaboratorsByContactId = useMemo(
    () =>
      new Map(state.collaborators.map((collaborator) => [collaborator.contactId, collaborator])),
    [state.collaborators],
  );
  const members = useMemo(
    () =>
      state.contacts.filter((contact) => contact.status === "enrolled"),
    [state.contacts],
  );
  const collaboratorsById = useMemo(
    () => new Map(state.collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [state.collaborators],
  );
  const showCollaborators = isCollaboratorAreaVisible(state);
  const showAggregateCollaborators = state.collaboratorManagement.aggregateViewUnlocked;
  const availableCollaborators = state.collaborators.filter(
    (collaborator) => collaborator.assignment === null,
  ).length;
  const showRarityOverview =
    state.statistics.emailsSent >= GAME_CONFIG.rarityOverviewEmailsSent ||
    members.some((contact) => contact.rarity !== "common") ||
    showCollaborators;

  return (
    <main className="overview-view people-view">
      <header>
        <Icon name="people" />
        <div>
          <h1>Iscritti</h1>
          <p>Iscritti e Collaboratori delle Onde</p>
        </div>
      </header>
      {showCollaborators ? (
        <section className="people-section">
          <div className="people-section-heading is-inline-count">
            <h2>Collaboratori</h2>
            <span>{showAggregateCollaborators
              ? `${availableCollaborators}/${state.collaborators.length} liberi`
              : state.collaborators.length}</span>
          </div>
          {showAggregateCollaborators ? (
            <CollaboratorSectorView
              state={state}
              collaboratorsById={collaboratorsById}
              onIncrement={onIncrementCollaboratorAssignment ?? ignoreCollaboratorAssignmentChange}
              onDecrement={onDecrementCollaboratorAssignment ?? ignoreCollaboratorAssignmentChange}
              onStartTraining={onStartTraining}
              onBookTechnicianCourse={onBookTechnicianCourse}
            />
          ) : (
            <CollaboratorList
              state={state}
              onAssign={onAssign}
              onStartTraining={onStartTraining}
              onBookTechnicianCourse={onBookTechnicianCourse}
              collaboratorsById={collaboratorsById}
            />
          )}
        </section>
      ) : null}

      <section className="people-section">
        <div className="people-section-heading is-inline-count">
          <h2>Iscritti attivi</h2>
          <span>{members.length}</span>
        </div>
        <MemberList
          state={state}
          members={members}
          collaboratorsByContactId={collaboratorsByContactId}
          collaboratorsById={collaboratorsById}
          onStartTraining={onStartTraining}
          onToggleFavorite={onToggleFavorite ?? ignoreFavoriteToggle}
          onCancelEnrollment={onCancelEnrollment ?? ignoreFavoriteToggle}
        />
      </section>

      {showRarityOverview ? <RarityOverview state={state} /> : null}
    </main>
  );
}
