import { MISSED_RENEWAL_EVENT } from "../content/narrativeEvents";
import {
  getAthleteImmunityStatus,
  isAthleteImmuneFromDeparture,
  type AthleteDepartureContext,
} from "./athleteImmunity";
import { isSchoolYearDepartureMonth } from "./calendar";
import { GAME_CONFIG } from "./config";
import { roundCurrency, scaleCurrencyGain } from "./economy";
import { getMemberAnnualDepartureChance } from "./formulas";
import { makeGameId } from "./ids";
import { getMonthlyOperationalIncome } from "./membershipEconomy";
import { addMessage } from "./stateUpdates";
import { nextRandom } from "./random";
import type { GameState, SpecialCollaboratorId } from "./types";
import { processTournamentAtMonthEnd } from "./tournamentFlow";

export function departMembers(
  state: GameState,
  memberIds: Iterable<string>,
  adjustActiveMembers = true,
  departureContext: AthleteDepartureContext = "unexpected-event",
): GameState {
  const requestedIds = new Set(memberIds);
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const immunityContext = {
    currentMonth: state.school.currentMonth,
    tournamentQualification: state.tournaments.qualification,
  };
  const departed = state.contacts.filter(
    (contact) => {
      const collaborator = collaboratorsByContactId.get(contact.id);
      const immunity = getAthleteImmunityStatus(
        immunityContext,
        contact,
        collaborator ?? contact,
        Boolean(collaborator),
      );
      return contact.status === "enrolled" &&
        requestedIds.has(contact.id) &&
        !isAthleteImmuneFromDeparture(immunity, departureContext);
    },
  );
  if (departed.length === 0) return state;

  const departedIds = new Set(departed.map((contact) => contact.id));
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
      mastery: collaborator?.mastery ? { ...collaborator.mastery } : undefined,
      arenaBase: member.arenaBase,
      styleBase: member.styleBase,
      tournamentExperience: member.tournamentExperience,
      agonistCourseCompletions: member.agonistCourseCompletions,
      agonistCourseArenaBonus: member.agonistCourseArenaBonus,
      agonistCourseStyleBonus: member.agonistCourseStyleBonus,
      lastAgonistCourseYear: member.lastAgonistCourseYear,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? member.lastFormTrainingYear,
      formTrainingYearCount:
        collaborator?.formTrainingYearCount ?? member.formTrainingYearCount,
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
            formTrainingYearCount:
              collaboratorsByContactId.get(contact.id)?.formTrainingYearCount ??
              contact.formTrainingYearCount,
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

export function cancelMemberEnrollment(
  state: GameState,
  contactId: string,
): GameState {
  const member = state.contacts.find(
    (contact) => contact.id === contactId && contact.status === "enrolled",
  );
  if (!member) return state;

  const removedCollaboratorId = state.collaborators.find(
    (collaborator) => collaborator.contactId === contactId,
  )?.id;
  const departed = departMembers(
    state,
    [contactId],
    true,
    "manual-cancellation",
  );
  if (departed === state) return state;

  const secretLegendaryId = member.secretLegendaryId;
  return {
    ...departed,
    contacts: departed.contacts.map((contact) =>
      removedCollaboratorId && contact.training?.instructorId === removedCollaboratorId
        ? { ...contact, training: undefined }
        : contact,
    ),
    collaborators: departed.collaborators.map((collaborator) =>
      removedCollaboratorId && collaborator.training?.instructorId === removedCollaboratorId
        ? { ...collaborator, training: undefined }
        : collaborator,
    ),
    network: secretLegendaryId
      ? {
          ...departed.network,
          secretLegendaries: {
            ...departed.network.secretLegendaries,
            [secretLegendaryId]: {
              ...departed.network.secretLegendaries[secretLegendaryId],
              status: "external",
              enrolledContactId: undefined,
            },
          },
        }
      : departed.network,
    tournaments: {
      ...departed.tournaments,
      immuneContactIds: departed.tournaments.immuneContactIds.filter((id) => id !== contactId),
    },
  };
}

function processMemberDepartures(
  state: GameState,
  now: number,
): GameState {
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const immunityContext = {
    currentMonth: state.school.currentMonth,
    tournamentQualification: state.tournaments.qualification,
  };
  const eligibleMembers = state.contacts.filter((contact) => {
    const collaborator = collaboratorsByContactId.get(contact.id);
    const immunity = getAthleteImmunityStatus(
      immunityContext,
      contact,
      collaborator ?? contact,
      Boolean(collaborator),
    );
    return contact.status === "enrolled" &&
      !isAthleteImmuneFromDeparture(immunity, "annual-rollout");
  });
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
    true,
    "annual-rollout",
  );
  const withNarrative: GameState = {
    ...updated,
    narrative: {
      ...updated.narrative,
      history: [
        ...updated.narrative.history,
        ...departed.map((member, index) => ({
          id: makeGameId("narrative", now, updated.narrative.history.length + index),
          definitionId: MISSED_RENEWAL_EVENT.id,
          title: MISSED_RENEWAL_EVENT.title,
          occurredAt: now,
          summary: MISSED_RENEWAL_EVENT.description,
          person: {
            displayName: `${member.firstName} ${member.lastName}`,
            rarity: member.rarity,
          },
        })),
      ].slice(-GAME_CONFIG.narrativeHistoryLimit),
    },
    statistics: {
      ...updated.statistics,
      narrativeEvents: updated.statistics.narrativeEvents + departed.length,
    },
  };
  return addMessage(
    withNarrative,
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
  let nextState = state;
  for (let period = 0; period < periods; period += 1) {
    const currentMonth = nextState.school.currentMonth;
    nextState = processTournamentAtMonthEnd(
      nextState,
      currentMonth,
      nextState.school.nextFeeAt,
    );
    const earned = scaleCurrencyGain(
      getMonthlyOperationalIncome(nextState),
      gainMultiplier,
    );
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
      nextState = processMemberDepartures(nextState, now + period);
    }
  }
  return nextState;
}
