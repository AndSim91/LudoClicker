import { addAdminContacts, addAdminEuros, addAdminMembers } from "./adminFlow";
import { buyOfficialSword, maintainEquipment } from "./equipment";
import { startAcquisitionEvent } from "./eventFlow";
import { markAllMessagesRead, markMessageRead } from "./inboxFlow";
import { cancelMemberEnrollment } from "./membershipFlow";
import { toggleMemberFavorite } from "./memberPreferences";
import { freezeGameState } from "./offline";
import { processOfflinePassiveProgress } from "./offlineProgress";
import { updateProfileName } from "./profileFlow";
import { foundSchool } from "./schoolProgressionFlow";
import {
  assignCollaborator,
  payInstructorCertificates,
  toggleInstructorAutomation,
} from "./trainingFlow";
import type { FormId, GameAction, GameState } from "./types";
import { buyUpgrade } from "./upgradeFlow";

type ActionType = GameAction["type"];
type ActionByType<Type extends ActionType> = Extract<GameAction, { type: Type }>;

export type GameActionHandlers = {
  [Type in ActionType]: (
    state: GameState,
    action: ActionByType<Type>,
  ) => GameState;
};

export interface GameActionHandlerDependencies {
  write: (state: GameState, now: number) => GameState;
  tick: (state: GameState, now: number, gainMultiplier: number) => GameState;
  runSocialCampaign: (state: GameState, now: number) => GameState;
  startFormTraining: (
    state: GameState,
    personId: string,
    formId: FormId,
    now: number,
  ) => GameState;
}

export function createGameActionHandlers(
  dependencies: GameActionHandlerDependencies,
): GameActionHandlers {
  return {
    WRITE: (state, action) => dependencies.write(state, action.now),
    TICK: (state, action) => dependencies.tick(
      state,
      action.now,
      action.gainMultiplier ?? 1,
    ),
    RESUME_FROM_PAUSE: (state, action) => freezeGameState(
      state,
      action.now,
      action.elapsedMs,
    ),
    OFFLINE_PASSIVE_PROGRESS: (state, action) => processOfflinePassiveProgress(
      state,
      action.now,
      action.elapsedMs,
      action.rawElapsedMs,
    ),
    REPLACE_STATE: (_state, action) => action.state,
    ADMIN_ADD_CONTACTS: (state, action) => addAdminContacts(state, action.amount),
    ADMIN_ADD_MEMBERS: (state, action) => addAdminMembers(state, action.amount),
    ADMIN_ADD_EUROS: (state, action) => addAdminEuros(state, action.amount),
    UPDATE_PROFILE_NAME: (state, action) => updateProfileName(state, action.displayName),
    FOUND_SCHOOL: (state, action) => foundSchool(state, action.details, action.now),
    BUY_UPGRADE: (state, action) => buyUpgrade(state, action.upgradeId),
    MARK_MESSAGE_READ: (state, action) => markMessageRead(state, action.messageId),
    MARK_ALL_MESSAGES_READ: (state) => markAllMessagesRead(state),
    MAINTAIN_EQUIPMENT: (state, action) => maintainEquipment(state, action.now),
    BUY_OFFICIAL_SWORD: (state) => buyOfficialSword(state),
    ASSIGN_COLLABORATOR: (state, action) => assignCollaborator(
      state,
      action.collaboratorId,
      action.assignment,
      action.now,
    ),
    TOGGLE_INSTRUCTOR_AUTOMATION: (state, action) => toggleInstructorAutomation(
      state,
      action.collaboratorId,
      action.enabled,
      action.now,
    ),
    TOGGLE_MEMBER_FAVORITE: (state, action) => toggleMemberFavorite(
      state,
      action.contactId,
    ),
    CANCEL_MEMBER_ENROLLMENT: (state, action) => cancelMemberEnrollment(
      state,
      action.contactId,
    ),
    PAY_INSTRUCTOR_CERTIFICATES: (state, action) => payInstructorCertificates(
      state,
      action.collaboratorId,
    ),
    RUN_SOCIAL_CAMPAIGN: (state, action) => dependencies.runSocialCampaign(state, action.now),
    START_FORM_TRAINING: (state, action) => dependencies.startFormTraining(
      state,
      action.personId,
      action.formId,
      action.now,
    ),
    START_ACQUISITION_EVENT: (state, action) => startAcquisitionEvent(
      state,
      action.definitionId,
      action.now,
    ),
  };
}

export function dispatchGameAction(
  state: GameState,
  action: GameAction,
  handlers: GameActionHandlers,
): GameState {
  const handler = handlers[action.type] as unknown as (
    currentState: GameState,
    currentAction: GameAction,
  ) => GameState;
  return handler(state, action);
}
