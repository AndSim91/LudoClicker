import { dismissMoment } from "./moments";
import { COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID } from "../content/tutorialScenes";
import {
  addAdminContacts,
  addAdminEuros,
  addAdminMembers,
  addAdminSwords,
  resetAdminGadgetSales,
  scheduleAdminLegendaryTrial,
} from "./adminFlow";
import { buyOfficialSword, maintainEquipment } from "./equipment";
import { cancelAcquisitionEvent, startAcquisitionEvent } from "./eventFlow";
import { markAllMessagesRead, markMessageRead } from "./inboxFlow";
import { cancelMemberEnrollment } from "./membershipFlow";
import { toggleMemberFavorite } from "./memberPreferences";
import { playChroniclesHand } from "./chroniclesFlow";
import {
  changeAutomaticShare,
  decrementCollaboratorAssignment,
  incrementCollaboratorAssignment,
  moveOperationalPriority,
  setAutomaticAssignment,
} from "./collaboratorManagement";
import { postponeLightInflationEvent } from "./lightInflation";
import { updateProfileName } from "./profileFlow";
import { foundSchool } from "./schoolProgressionFlow";
import {
  assignCollaborator,
} from "./trainingFlow";
import { bookTechnicianCourse } from "./teacherTrainingFlow";
import { startQuickTeacherTraining } from "./quickTeacherTraining";
import type {
  FormId,
  FormTrainingStartMode,
  GameAction,
  GameState,
} from "./types";
import { startChroniclesTournament } from "./tournamentFlow";
import { buyAllAffordableUpgrades, buyUpgrade, setGameSpeed } from "./upgradeFlow";
import { finishTutorialScene, triggerTutorialScene } from "./tutorialProgress";
import {
  acceptGadgetProduct,
  completeGadgetMinigame,
  dismissGadgetMinigameResult,
  startGadgetMinigame,
  skipGadgetMinigame,
  startGadgetProject,
  startGadgetRevision,
} from "./gadgetFlow";
import {
  cancelReptile,
  completeReptileMinigame,
  organizeReptile,
  startReptileMinigame,
} from "./reptilePreparation";
import { dismissReptileRecap, holdReptileTournamentIfDue } from "./reptileFlow";

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
  sendEmail: (state: GameState, now: number) => GameState;
  tick: (
    state: GameState,
    now: number,
    gainMultiplier: number,
    stepBudget?: number,
    wallNow?: number,
    workBudget?: number,
    allowAutomaticEventStarts?: boolean,
    minStepMs?: number,
    timeBudgetMs?: number,
  ) => GameState;
  startFormTraining: (
    state: GameState,
    personId: string,
    formId: FormId,
    now: number,
    mode?: FormTrainingStartMode,
  ) => GameState;
}

export function createGameActionHandlers(
  dependencies: GameActionHandlerDependencies,
): GameActionHandlers {
  return {
    WRITE: (state, action) => dependencies.write(state, action.now),
    SEND_EMAIL: (state, action) => dependencies.sendEmail(state, action.now),
    SET_AUTOMATIC_EMAIL_SENDING: (state, action) => {
      const nextState = {
        ...state,
        automation: {
          ...state.automation,
          autoSendEmails: action.enabled,
        },
      };
      return action.enabled
        ? dependencies.sendEmail(nextState, action.now)
        : nextState;
    },
    SET_AUTOMATIC_TEACHING: (state, action) => ({
      ...state,
      automation: {
        ...state.automation,
        autoTeachingEnabled: action.enabled,
      },
    }),
    TICK: (state, action) => dependencies.tick(
      state,
      action.now,
      action.gainMultiplier ?? 1,
      action.stepBudget,
      action.wallNow ?? action.now,
      action.workBudget,
      action.allowAutomaticEventStarts ?? true,
      action.minStepMs,
      action.timeBudgetMs,
    ),
    RESUME_FROM_PAUSE: (state, action) => postponeLightInflationEvent(
      state,
      action.elapsedMs,
    ),
    REPLACE_STATE: (_state, action) => action.state,
    ADMIN_ADD_CONTACTS: (state, action) => addAdminContacts(state, action.amount),
    ADMIN_ADD_MEMBERS: (state, action) => addAdminMembers(state, action.amount),
    ADMIN_ADD_EUROS: (state, action) => addAdminEuros(state, action.amount),
    ADMIN_ADD_SWORDS: (state, action) => addAdminSwords(state, action.amount),
    ADMIN_RESET_GADGET_SALES: (state) => resetAdminGadgetSales(state),
    ADMIN_ADVANCE_MONTH: (state, action) => Number.isFinite(action.now)
      ? dependencies.tick({
          ...state,
          school: {
            ...state.school,
            nextFeeAt: action.now,
          },
        }, action.now, 1)
      : state,
    ADMIN_SCHEDULE_LEGENDARY_TRIAL: (state, action) => scheduleAdminLegendaryTrial(
      state,
      action.now,
    ),
    UPDATE_PROFILE_NAME: (state, action) => updateProfileName(state, action.displayName),
    FOUND_SCHOOL: (state, action) => foundSchool(state, action.details, action.now, action.spending),
    BUY_UPGRADE: (state, action) => buyUpgrade(state, action.upgradeId),
    BUY_ALL_UPGRADES: (state) => buyAllAffordableUpgrades(state),
    SET_GAME_SPEED: (state, action) => setGameSpeed(state, action.speed),
    START_GADGET_PROJECT: (state, action) => startGadgetProject(
      state,
      action.productId,
    ),
    START_GADGET_REVISION: (state, action) => startGadgetRevision(
      state,
      action.productId,
    ),
    START_GADGET_MINIGAME: (state, action) => startGadgetMinigame(
      state,
      action.productId,
    ),
    SKIP_GADGET_MINIGAME: (state, action) => skipGadgetMinigame(state, action.productId),
    COMPLETE_GADGET_MINIGAME: (state, action) => completeGadgetMinigame(
      state,
      action.productId,
      action.score,
    ),
    DISMISS_GADGET_MINIGAME_RESULT: (state, action) =>
      dismissGadgetMinigameResult(state, action.productId),
    ACCEPT_GADGET_PRODUCT: (state, action) => acceptGadgetProduct(
      state,
      action.productId,
    ),
    MARK_MESSAGE_READ: (state, action) => markMessageRead(state, action.messageId),
    MARK_ALL_MESSAGES_READ: (state) => markAllMessagesRead(state),
    DISMISS_MOMENT: (state) => dismissMoment(state),
    SET_AUTOMATIC_ASSIGNMENT: (state, action) => setAutomaticAssignment(state, action.enabled),
    CHANGE_AUTOMATIC_SHARE: (state, action) =>
      changeAutomaticShare(state, action.assignment, action.level),
    FINISH_TUTORIAL_SCENE: (state, action) => finishTutorialScene(
      state,
      action.sceneId,
      action.skipped,
    ),
    MAINTAIN_EQUIPMENT: (state) => maintainEquipment(state),
    BUY_OFFICIAL_SWORD: (state, action) => buyOfficialSword(state, action.amount),
    ASSIGN_COLLABORATOR: (state, action) => assignCollaborator(
      state,
      action.collaboratorId,
      action.assignment,
      action.now,
    ),
    INCREMENT_COLLABORATOR_ASSIGNMENT: (state, action) =>
      incrementCollaboratorAssignment(
        state,
        action.assignment,
      ),
    DECREMENT_COLLABORATOR_ASSIGNMENT: (state, action) =>
      decrementCollaboratorAssignment(
      state,
      action.assignment,
    ),
    MOVE_OPERATIONAL_PRIORITY: (state, action) => moveOperationalPriority(
      state,
      action.assignment,
      action.toIndex,
    ),
    TOGGLE_MEMBER_FAVORITE: (state, action) => toggleMemberFavorite(
      state,
      action.contactId,
    ),
    CANCEL_MEMBER_ENROLLMENT: (state, action) => cancelMemberEnrollment(
      state,
      action.contactId,
    ),
    START_FORM_TRAINING: (state, action) => {
      const collaboratorBefore = state.collaborators.find(
        (collaborator) => collaborator.id === action.personId,
      );
      const memberBefore = state.contacts.find(
        (contact) =>
          contact.id === (collaboratorBefore?.contactId ?? action.personId) &&
          contact.status === "enrolled",
      );
      const nextState = dependencies.startFormTraining(
        state,
        action.personId,
        action.formId,
        action.now,
        action.mode,
      );
      const trainingBefore = collaboratorBefore?.training ?? memberBefore?.training;
      const trainingAfter = collaboratorBefore
        ? nextState.collaborators.find(
            (collaborator) => collaborator.id === collaboratorBefore.id,
          )?.training
        : nextState.contacts.find((contact) => contact.id === memberBefore?.id)?.training;
      const trainingStarted = Boolean(
        trainingAfter &&
        trainingAfter !== trainingBefore &&
        trainingAfter.trainingPhase !== "instructor",
      );

      return memberBefore && state.collaborators.length > 0 && trainingStarted
        ? triggerTutorialScene(nextState, COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID)
        : nextState;
    },
    START_ACQUISITION_EVENT: (state, action) => startAcquisitionEvent(
      state,
      action.definitionId,
      action.now,
    ),
    START_QUICK_TEACHER_TRAINING: (state, action) => startQuickTeacherTraining(
      state,
      action.kind,
      action.now,
    ),
    BOOK_TECHNICIAN_COURSE: (state, action) => bookTechnicianCourse(
      state,
      action.collaboratorId,
      action.formId,
      action.now,
    ),
    CANCEL_ACQUISITION_EVENT: (state, action) => cancelAcquisitionEvent(
      state,
      action.eventId,
    ),
    START_CHRONICLES_TOURNAMENT: (state, action) => startChroniclesTournament(
      state,
      action.contactIds,
      action.now,
    ),
    PLAY_CHRONICLES_HAND: (state, action) => playChroniclesHand(
      state,
      action.choice,
      action.now,
    ),
    ORGANIZE_REPTILE: (state, action) => holdReptileTournamentIfDue(
      organizeReptile(state, action.now),
      action.now,
    ),
    CANCEL_REPTILE: (state) => cancelReptile(state),
    START_REPTILE_MINIGAME: (state, action) => startReptileMinigame(state, action.now),
    COMPLETE_REPTILE_MINIGAME: (state, action) => completeReptileMinigame(
      state,
      action.score,
      action.available,
    ),
    DISMISS_REPTILE_RECAP: (state) => dismissReptileRecap(state),
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
