import {
  COLLABORATOR_MASTERY_ROLE_LABELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryDefinition,
  getCollaboratorMasteryLevel,
} from "../content/mastery";
import { addInboxMessage } from "./messages";
import { makeGameId } from "./ids";
import type {
  Collaborator,
  CollaboratorAssignment,
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

function addMatchingCollaboratorMasteryExperience(
  state: GameState,
  role: Exclude<CollaboratorAssignment, null>,
  amount: number,
  now: number,
  matches: (collaborator: Collaborator) => boolean,
): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return state;

  const leveledUp: Array<{ displayName: string; levelName: string; multiplier: number }> = [];
  const nextState: GameState = {
    ...state,
    collaborators: state.collaborators.map((collaborator) => {
      if (!matches(collaborator)) return collaborator;
      const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
      const currentXp = Math.max(0, mastery[role] ?? 0);
      const nextXp = currentXp + amount;
      if (getCollaboratorMasteryLevel(nextXp) > getCollaboratorMasteryLevel(currentXp)) {
        const definition = getCollaboratorMasteryDefinition(nextXp);
        leveledUp.push({
          displayName: collaborator.displayName,
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
      `${collaborator.displayName} è ora ${collaborator.levelName} in ${COLLABORATOR_MASTERY_ROLE_LABELS[role]}. Bonus del settore: +${Math.round(collaborator.multiplier * 100)}%.`,
      "positive",
      "other",
      "collaborators",
    ),
    nextState,
  );
}

export function addCollaboratorMasteryExperience(
  state: GameState,
  role: CollaboratorAssignment,
  amount: number,
  now: number,
): GameState {
  if (!role) return state;
  return addMatchingCollaboratorMasteryExperience(
    state,
    role,
    amount,
    now,
    (collaborator) => collaborator.assignment === role,
  );
}

export function addCollaboratorMasteryExperienceForCollaborator(
  state: GameState,
  collaboratorId: string,
  role: Exclude<CollaboratorAssignment, null>,
  amount: number,
  now: number,
): GameState {
  return addMatchingCollaboratorMasteryExperience(
    state,
    role,
    amount,
    now,
    (collaborator) => collaborator.id === collaboratorId,
  );
}
