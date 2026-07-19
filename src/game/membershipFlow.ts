import { getUpgradeEffectTotal } from "../content/upgrades";
import {
  getSchoolYear,
  getSchoolYearStartMonth,
  isSchoolYearDepartureMonth,
} from "./calendar";
import { GAME_CONFIG } from "./config";
import { roundCurrency, scaleCurrencyGain } from "./economy";
import { getMemberAnnualDepartureChance } from "./formulas";
import { addMessage } from "./stateUpdates";
import { nextRandom } from "./random";
import type { GameState, SpecialCollaboratorId } from "./types";
import { processTournamentAtMonthEnd } from "./tournamentFlow";

export function departMembers(
  state: GameState,
  memberIds: Iterable<string>,
  adjustActiveMembers = true,
): GameState {
  const requestedIds = new Set(memberIds);
  const departed = state.contacts.filter(
    (contact) =>
      contact.status === "enrolled" &&
      contact.rarity !== "legendary" &&
      !state.tournaments.immuneContactIds.includes(contact.id) &&
      requestedIds.has(contact.id),
  );
  if (departed.length === 0) return state;

  const departedIds = new Set(departed.map((contact) => contact.id));
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const retainedProgress = { ...state.legendaryCollaborators.retainedProgress };
  const departedProfileIds = new Set<SpecialCollaboratorId>();
  for (const member of departed) {
    if (!member.specialProfileId) continue;
    const collaborator = collaboratorsByContactId.get(member.id);
    departedProfileIds.add(member.specialProfileId);
    retainedProgress[member.specialProfileId] = {
      forms: [...(collaborator?.forms ?? member.forms)],
      instructorForms: [...(collaborator?.instructorForms ?? [])],
      formBranchPreferences: [
        ...(collaborator?.formBranchPreferences ?? member.formBranchPreferences ?? []),
      ],
      joinedAt: collaborator?.joinedAt ?? member.acquiredAt,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? member.lastFormTrainingYear,
    };
  }

  return {
    ...state,
    contacts: state.contacts.map((contact) =>
      departedIds.has(contact.id)
        ? {
            ...contact,
            status: "departed",
            forms: [...(collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms)],
            formBranchPreferences: [
              ...(collaboratorsByContactId.get(contact.id)?.formBranchPreferences ??
                contact.formBranchPreferences ?? []),
            ],
            lastFormTrainingYear:
              collaboratorsByContactId.get(contact.id)?.lastFormTrainingYear ??
              contact.lastFormTrainingYear,
            training: undefined,
          }
        : contact,
    ),
    collaborators: state.collaborators.filter(
      (collaborator) => !departedIds.has(collaborator.contactId),
    ),
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      enrolledProfileIds: state.legendaryCollaborators.enrolledProfileIds.filter(
        (profileId) => !departedProfileIds.has(profileId),
      ),
      retainedProgress,
    },
    school: adjustActiveMembers
      ? {
          ...state.school,
          activeMembers: Math.max(0, state.school.activeMembers - departed.length),
        }
      : state.school,
    statistics: {
      ...state.statistics,
      membersDeparted: state.statistics.membersDeparted + departed.length,
    },
  };
}

function processMemberDepartures(
  state: GameState,
  completedSchoolYear: number,
  now: number,
): GameState {
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const firstMonthOfCompletedYear = getSchoolYearStartMonth(completedSchoolYear);
  const eligibleMembers = state.contacts.filter((contact) =>
    contact.status === "enrolled" &&
    contact.rarity !== "legendary" &&
    !state.tournaments.immuneContactIds.includes(contact.id) &&
    !collaboratorsByContactId.has(contact.id) &&
    (contact.enrolledMonth ?? state.school.currentMonth) <= firstMonthOfCompletedYear &&
    (collaboratorsByContactId.get(contact.id)?.lastFormTrainingYear ??
      contact.lastFormTrainingYear) !== completedSchoolYear
  );
  if (eligibleMembers.length === 0) return state;

  let nextSeed = state.randomSeed;
  const departedIds = new Set<string>();
  for (const member of eligibleMembers) {
    const [roll, seedAfterRoll] = nextRandom(nextSeed);
    nextSeed = seedAfterRoll;
    const collaborator = collaboratorsByContactId.get(member.id);
    const forms = collaborator?.forms ?? member.forms;
    const departureChance = getMemberAnnualDepartureChance(
      forms,
      member.rarity,
      state.network.schools.length,
    );
    if (roll < departureChance) departedIds.add(member.id);
  }
  if (departedIds.size === 0) return { ...state, randomSeed: nextSeed };

  const departed = eligibleMembers.filter((member) => departedIds.has(member.id));
  const names = departed
    .slice(0, 3)
    .map((member) => `${member.firstName} ${member.lastName}`)
    .join(", ");
  const others = departed.length > 3 ? ` e altri ${departed.length - 3}` : "";
  const updated: GameState = departMembers(
    { ...state, randomSeed: nextSeed },
    departedIds,
  );
  return addMessage(
    updated,
    now,
    departed.length === 1
      ? "Un iscritto ha lasciato la scuola"
      : `${departed.length} iscritti hanno lasciato la scuola`,
    `${names}${others} ${departed.length === 1 ? "ha" : "hanno"} lasciato la scuola dopo un anno senza formazione. Ogni Forma completata riduce questo rischio.`,
    "neutral",
    "focused",
    "departures",
  );
}

export function collectFees(state: GameState, now: number, gainMultiplier: number): GameState {
  if (now < state.school.nextFeeAt) return state;
  const periods = Math.floor((now - state.school.nextFeeAt) / GAME_CONFIG.gameMonthMs) + 1;
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  let nextState = state;
  for (let period = 0; period < periods; period += 1) {
    const currentMonth = nextState.school.currentMonth;
    const completedSchoolYear = getSchoolYear(currentMonth);
    nextState = processTournamentAtMonthEnd(
      nextState,
      currentMonth,
      nextState.school.nextFeeAt,
    );
    const earned = scaleCurrencyGain((
      (nextState.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
        nextState.network.schools.length * GAME_CONFIG.networkIncomePerSchool) *
      (1 + getUpgradeEffectTotal(nextState.upgrades, "incomeMultiplier")) *
      networkMultiplier
    ), gainMultiplier);
    nextState = {
      ...nextState,
      school: {
        ...nextState.school,
        euros: roundCurrency(nextState.school.euros + earned),
        currentMonth: currentMonth + 1,
        nextFeeAt: nextState.school.nextFeeAt + GAME_CONFIG.gameMonthMs,
      },
      statistics: {
        ...nextState.statistics,
        eurosEarned: roundCurrency(nextState.statistics.eurosEarned + earned),
      },
    };
    if (isSchoolYearDepartureMonth(currentMonth)) {
      nextState = processMemberDepartures(nextState, completedSchoolYear, now + period);
    }
  }
  return nextState;
}
