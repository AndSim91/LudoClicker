import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { TabButton } from "../../components/common/TabButton";
import { GAME_CONFIG } from "../../game/config";
import type {
  CollaboratorAssignment,
  FormId,
  GameState,
} from "../../game/types";
import { isCollaboratorAreaVisible } from "../../game/unlocks";
import { CollaboratorList } from "./CollaboratorList";
import { MemberList } from "./MemberList";
import { RarityOverview } from "./RarityOverview";

type PeopleTab = "members" | "collaborators";

export function PeopleView({
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
  const [tab, setTab] = useState<PeopleTab>("members");
  const members = useMemo(
    () => state.contacts.filter((contact) => contact.status === "enrolled"),
    [state.contacts],
  );
  const collaboratorsByContactId = useMemo(
    () => new Map(
      state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
    ),
    [state.collaborators],
  );
  const collaboratorsById = useMemo(
    () => new Map(state.collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [state.collaborators],
  );
  const showCollaborators = isCollaboratorAreaVisible(state);
  const showRarityOverview =
    state.statistics.emailsSent >= GAME_CONFIG.rarityOverviewEmailsSent ||
    members.some((contact) => contact.rarity !== "common") ||
    showCollaborators;

  return (
    <main className="overview-view people-view">
      <header>
        <Icon name="people" />
        <div><h1>Iscritti</h1><p>Iscritti e Collaboratori delle Onde</p></div>
      </header>
      <div className="people-tabs" role="tablist" aria-label="Categorie iscritti">
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          Iscritti attivi ({members.length})
        </TabButton>
        {showCollaborators ? (
          <TabButton active={tab === "collaborators"} onClick={() => setTab("collaborators")}>
            Collaboratori ({state.collaborators.length})
          </TabButton>
        ) : null}
      </div>
      {showRarityOverview ? <RarityOverview state={state} /> : null}

      {tab === "collaborators" ? (
        <CollaboratorList
          state={state}
          onAssign={onAssign}
          onStartTraining={onStartTraining}
          onToggleInstructorAutomation={onToggleInstructorAutomation}
          collaboratorsById={collaboratorsById}
        />
      ) : (
        <MemberList
          state={state}
          members={members}
          collaboratorsByContactId={collaboratorsByContactId}
          collaboratorsById={collaboratorsById}
          onStartTraining={onStartTraining}
        />
      )}
    </main>
  );
}
