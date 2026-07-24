import {
  COLLABORATOR_MASTERY_XP_PER_SECOND,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryRoleLabel,
  getCollaboratorMasteryDefinition,
  getCollaboratorMasteryLevel,
} from "../content/mastery";
import { addInboxMessage } from "./messages";
import { makeGameId } from "./ids";
import type {
  GameState,
  InboxMessage,
} from "./types";

export function addMessage(
  state: GameState,
  now: number,
  subject: string,
  preview: string,
  tone: InboxMessage["tone"] = "positive",
  category: NonNullable<InboxMessage["category"]> = "focused",
  threadKey?: InboxMessage["threadKey"],
): GameState {
  const message: InboxMessage = {
    id: makeGameId("message", now, state.messages.length),
    sender: "Ordine delle Onde",
    subject,
    preview,
    receivedAt: now,
    tone,
    unread: true,
    category,
    threadKey,
  };
  return { ...state, messages: addInboxMessage(state.messages, message) };
}

export function addAssignedCollaboratorMasteryExperience(
  state: GameState,
  elapsedMs: number,
  now: number,
): GameState {
  const amount = (Math.max(0, elapsedMs) / 1_000) *
    COLLABORATOR_MASTERY_XP_PER_SECOND;
  if (!Number.isFinite(amount) || amount <= 0) return state;

  const leveledUp: Array<{
    displayName: string;
    role: NonNullable<GameState["collaborators"][number]["assignment"]>;
    levelName: string;
    multiplier: number;
  }> = [];
  const nextState: GameState = {
    ...state,
    collaborators: state.collaborators.map((collaborator) => {
      const role = collaborator.assignment;
      if (!role) return collaborator;
      const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
      const currentXp = Math.max(0, mastery[role] ?? 0);
      const nextXp = currentXp + amount;
      if (getCollaboratorMasteryLevel(nextXp) > getCollaboratorMasteryLevel(currentXp)) {
        const definition = getCollaboratorMasteryDefinition(nextXp);
        leveledUp.push({
          displayName: collaborator.displayName,
          role,
          levelName: definition.name,
          multiplier: definition.multiplier,
        });
      }
      return {
        ...collaborator,
        mastery: { ...mastery, [role]: nextXp },
      };
    }),
  };

  return leveledUp.reduce(
    (currentState, collaborator) => addMessage(
      currentState,
      now,
      `Maestria raggiunta: ${collaborator.displayName}`,
      `${collaborator.displayName} è ora ${collaborator.levelName} in ${getCollaboratorMasteryRoleLabel(collaborator.role, currentState.unlocks.social)}. Bonus del settore: +${Math.round(collaborator.multiplier * 100)}%.`,
      "positive",
      "other",
      "collaborators",
    ),
    nextState,
  );
}
