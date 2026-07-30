import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import type {
  CollaboratorAssignment,
  CollaboratorMasteryRole,
  FormId,
  FormTrainingStartMode,
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
  state: stateOverride,
  onAssign,
  onStartTraining,
  onToggleFavorite,
  onCancelEnrollment,
  onBookTechnicianCourse,
  onIncrementCollaboratorAssignment,
  onDecrementCollaboratorAssignment,
  onSetCollaboratorFallback,
  onMoveOperationalPriority,
}: {
  state?: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (
    personId: string,
    formId: FormId,
    mode?: FormTrainingStartMode,
  ) => void;
  onToggleFavorite?: (contactId: string) => void;
  onCancelEnrollment?: (contactId: string) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onIncrementCollaboratorAssignment?: (assignment: CollaboratorMasteryRole) => void;
  onDecrementCollaboratorAssignment?: (assignment: CollaboratorMasteryRole) => void;
  onSetCollaboratorFallback?: (
    assignment: CollaboratorMasteryRole,
    fallback: CollaboratorMasteryRole | null,
  ) => void;
  onMoveOperationalPriority?: (
    assignment: CollaboratorMasteryRole,
    direction: "up" | "down",
  ) => void;
}) {
  const state = useGameStateSlices(
    [
      "collaboratorManagement",
      "collaborators",
      "contacts",
      "school",
      "statistics",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
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
      <header className="people-hero">
        <span className="people-page-mark" aria-hidden="true">
          <Icon name="people" />
        </span>
        <div className="people-page-heading">
          <div className="people-page-title-row">
            <h1>Scuola</h1>
          </div>
          <p>Iscritti e Collaboratori delle Onde</p>
        </div>
        <svg
          className="people-hero-waves"
          viewBox="0 0 520 96"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 78 C108 38 207 93 315 49 C387 20 451 13 520 9" />
          <path d="M0 87 C111 47 209 101 321 57 C394 28 457 21 520 17" />
          <path d="M0 96 C117 57 216 108 328 65 C400 37 462 30 520 25" />
          <path d="M42 96 C151 70 232 111 342 72 C410 48 468 41 520 35" />
        </svg>
      </header>
      {showCollaborators ? (
        <section
          className="people-section"
          data-tutorial-region="collaborator-section"
          data-tutorial-target="true"
        >
          <div className="people-section-heading is-inline-count">
            <h2>Collaboratori</h2>
            <span>{showAggregateCollaborators
              ? `${availableCollaborators}/${state.collaborators.length} liberi`
              : state.collaborators.length}</span>
          </div>
          {showAggregateCollaborators ? (
            <CollaboratorSectorView
              state={stateOverride}
              collaboratorsById={collaboratorsById}
              onIncrement={onIncrementCollaboratorAssignment ?? ignoreCollaboratorAssignmentChange}
              onDecrement={onDecrementCollaboratorAssignment ?? ignoreCollaboratorAssignmentChange}
              onSetFallback={onSetCollaboratorFallback}
              onMovePriority={onMoveOperationalPriority}
              onStartTraining={onStartTraining}
              onBookTechnicianCourse={onBookTechnicianCourse}
            />
          ) : (
            <CollaboratorList
              state={stateOverride}
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
          state={stateOverride}
          collaboratorsByContactId={collaboratorsByContactId}
          collaboratorsById={collaboratorsById}
          onStartTraining={onStartTraining}
          onToggleFavorite={onToggleFavorite ?? ignoreFavoriteToggle}
          onCancelEnrollment={onCancelEnrollment ?? ignoreFavoriteToggle}
        />
      </section>

      {showRarityOverview ? <RarityOverview state={stateOverride} /> : null}
    </main>
  );
}
