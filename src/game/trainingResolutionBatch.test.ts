import { describe, expect, it } from "vitest";
import { isAgonistCourse } from "../content/forms";
import { getAvailableSwords } from "./equipment";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { addMessage } from "./stateUpdates";
import {
  processWaitingTrainings,
  resolveFormTraining,
  resolveFormTrainingBatch,
  startAgonistCourse,
  startFormTraining,
} from "./trainingFlow";
import { recruitCollaborator } from "./collaboratorFlow";
import type { Contact, GameState } from "./types";

const NOW = 50_000;
const dependencies = { addMessage, recruitCollaborator };

function createMembersInCompletedTraining(count: number): GameState {
  const initial = createInitialState(1_000, "", false);
  const template = initial.contacts[0];
  const contacts: Contact[] = Array.from({ length: count }, (_, index) => ({
    ...template,
    id: `member-${index}`,
    firstName: `Member ${index}`,
    lastName: "Batch",
    email: `member-${index}@example.test`,
    acquiredAt: index,
    status: "enrolled",
    forms: [],
    formBranchPreferences: [],
    training: {
      formId: "form-1",
      startedAt: 1_000,
      completesAt: NOW,
      status: "running",
      equipmentUsed: 1,
      wearPerSword: 1,
      trainingTrack: "athlete",
      trainingPhase: "athlete",
      trainingBaseDurationMs: 10_000,
      trainingDurationMultiplier: 1,
    },
    specialProfileId: undefined,
    secretLegendaryId: undefined,
  }));
  return {
    ...initial,
    contacts,
    school: {
      ...initial.school,
      activeMembers: contacts.length,
      currentMonth: 9,
    },
    unlocks: { ...initial.unlocks, forms: true },
    equipment: {
      ...initial.equipment,
      totalSwords: count,
      availableSwords: 0,
      damagedSwords: 0,
      wear: 0,
    },
  };
}

function resolveSequentially(state: GameState, ids: readonly string[]): GameState {
  let nextState = state;
  for (const id of ids) {
    nextState = resolveFormTraining(nextState, id, NOW, dependencies);
  }
  return nextState;
}

function processWaitingSequentially(state: GameState): GameState {
  const waitingIds = [...state.contacts, ...state.collaborators]
    .filter((person) => person.training?.status === "waitingForEquipment")
    .sort((left, right) =>
      (left.training?.startedAt ?? 0) - (right.training?.startedAt ?? 0) ||
      left.id.localeCompare(right.id)
    )
    .map((person) => person.id);

  let nextState = state;
  for (const personId of waitingIds) {
    const contact = nextState.contacts.find((candidate) => candidate.id === personId);
    const collaborator = nextState.collaborators.find((candidate) => candidate.id === personId);
    const person = collaborator ?? contact;
    const waiting = person?.training;
    if (!person || waiting?.status !== "waitingForEquipment") continue;
    if (getAvailableSwords(nextState.equipment) < (waiting.equipmentUsed ?? 1)) continue;

    nextState = {
      ...nextState,
      contacts: contact
        ? nextState.contacts.map((candidate) => candidate.id === personId
          ? { ...candidate, training: undefined }
          : candidate)
        : nextState.contacts,
      collaborators: collaborator
        ? nextState.collaborators.map((candidate) => candidate.id === personId
          ? { ...candidate, training: undefined }
          : candidate)
        : nextState.collaborators,
    };
    nextState = isAgonistCourse(waiting.formId)
      ? startAgonistCourse(
          nextState,
          personId,
          waiting.requestedInstructorId ?? "",
          NOW,
        )
      : startFormTraining(nextState, personId, waiting.formId, NOW);

    const restarted = nextState.collaborators.find((candidate) => candidate.id === personId) ??
      nextState.contacts.find((candidate) => candidate.id === personId);
    if (!restarted?.training) {
      nextState = {
        ...nextState,
        contacts: contact
          ? nextState.contacts.map((candidate) => candidate.id === personId
            ? { ...candidate, training: waiting }
            : candidate)
          : nextState.contacts,
        collaborators: collaborator
          ? nextState.collaborators.map((candidate) => candidate.id === personId
            ? { ...candidate, training: waiting }
            : candidate)
          : nextState.collaborators,
      };
    }
  }
  return nextState;
}

describe("batched training resolution", () => {
  it("matches the sequential order for 1,000 simultaneous completions", () => {
    const state = createMembersInCompletedTraining(1_000);
    const ids = state.contacts.map((contact) => contact.id);

    const sequential = resolveSequentially(state, ids);
    const batched = resolveFormTrainingBatch(state, ids, NOW, dependencies);

    expect(batched).toEqual(sequential);
    expect(batched.randomSeed).toBe(sequential.randomSeed);
    expect(batched.statistics.formsCompleted).toBe(sequential.statistics.formsCompleted);
    expect(batched.equipment).toEqual(sequential.equipment);
    expect(batched.messages).toEqual(sequential.messages);
  });

  it("restarts waiting lessons in the same chronological order as the sequential flow", () => {
    const state = createMembersInCompletedTraining(40);
    const waiting: GameState = {
      ...state,
      school: { ...state.school, euros: 600 },
      equipment: {
        ...state.equipment,
        totalSwords: 20,
        availableSwords: 20,
      },
      contacts: state.contacts.map((contact, index) => ({
        ...contact,
        training: {
          formId: "form-1",
          startedAt: 10_000 + (index % 4),
          completesAt: 10_000 + (index % 4),
          status: "waitingForEquipment",
          equipmentUsed: 1,
          wearPerSword: 1,
        },
      })),
    };

    expect(processWaitingTrainings(waiting, NOW)).toEqual(
      processWaitingSequentially(waiting),
    );
  });

  it("yields a large deadline and reaches the same final state over cooperative slices", () => {
    const state = createMembersInCompletedTraining(250);
    const completedInOneTick = gameReducer(state, { type: "TICK", now: NOW });

    const firstSlice = gameReducer(state, {
      type: "TICK",
      now: NOW,
      stepBudget: 8,
      workBudget: 100,
    });
    expect(firstSlice.contacts.filter((contact) =>
      contact.training?.completesAt === NOW
    )).toHaveLength(150);

    let sliced = firstSlice;
    for (let slice = 0; slice < 2; slice += 1) {
      sliced = gameReducer(sliced, {
        type: "TICK",
        now: NOW,
        stepBudget: 8,
        workBudget: 100,
      });
    }

    expect(sliced).toEqual(completedInOneTick);
  });
});
