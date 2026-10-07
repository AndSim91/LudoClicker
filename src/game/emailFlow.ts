import {
  chooseEmailPresentationLevel,
  getEmailExpansion,
  getEmailPresentationMix,
} from "../content/emailPresentation";
import { getEmailBuildLength } from "../content/emailBuild";
import { getTrialDurationMs, getUpgradeEffectTotal } from "../content/upgrades";
import { getEmailBookingChance } from "./formulas";
import { GAME_CONFIG } from "./config";
import { createCampaign } from "./campaignContent";
import { ANDREA_SIMONAZZI_ID, materializePooledContact } from "./contacts";
import { makeGameId } from "./ids";
import { replaceById } from "./replaceById";
import { nextRandom, randomBetween } from "./random";
import { addMessage } from "./stateUpdates";
import { selectActiveEmail } from "./selectors";
import {
  FIRST_EVENT_TUTORIAL_SCENE_ID,
  isTutorialSceneFinished,
  isTutorialScenePending,
} from "./tutorialProgress";
import type {
  GameState,
  PendingEmailOutcome,
  ScheduledTrial,
} from "./types";

/** Andrea Simonazzi in the initial school: his first iter is a tutorial and runs in seconds. */
function isTutorialAndrea(state: GameState, contactId: string): boolean {
  return state.network.schoolCount === 0 &&
    state.contacts.find((contact) => contact.id === contactId)?.specialProfileId ===
      ANDREA_SIMONAZZI_ID;
}

export function startNextCampaign(currentState: GameState, now: number): GameState {
  if (selectActiveEmail(currentState)) return currentState;
  let state = currentState;
  let nextContact = state.contacts.find((contact) => contact.status === "available");
  if (!nextContact) {
    const pooled = materializePooledContact(state, now);
    if (!pooled) return state;
    ({ state, contact: nextContact } = pooled);
  }

  const mix = getEmailPresentationMix(state.upgrades);
  let presentationLevel = mix.newLevel;
  let randomSeed = state.randomSeed;
  if (mix.newCatalogShare > 0 && mix.newCatalogShare < 1) {
    const [roll, nextSeed] = nextRandom(randomSeed);
    presentationLevel = chooseEmailPresentationLevel(state.upgrades, roll);
    randomSeed = nextSeed;
  }
  const createdEmail = createCampaign(
    nextContact,
    state.historyArchive.emails.count + state.emails.length,
    now,
    state.profile.displayName,
    presentationLevel,
    state.school.name,
    state.school.city,
    getEmailExpansion(state.upgrades, presentationLevel),
  );
  const initialProgress = getUpgradeEffectTotal(
    state.upgrades,
    "emailInitialProgress",
  );
  const startShare = Math.min(0.25, initialProgress);
  const email = startShare > 0
    ? {
        ...createdEmail,
        revealedCharacters: Math.floor(getEmailBuildLength(createdEmail) * startShare),
      }
    : createdEmail;
  return {
    ...state,
    randomSeed,
    contacts: replaceById(state.contacts, nextContact.id, (contact) => ({
      ...contact,
      status: "writing",
    })),
    emails: [...state.emails, email],
  };
}

export function finalizeEmail(state: GameState, emailId: string, now: number): GameState {
  const email = state.emails.find((candidate) => candidate.id === emailId);
  if (!email || email.status !== "sending") return state;

  const [bookingRoll, afterRoll] = nextRandom(state.randomSeed);
  const [outcomeDelay, nextSeed] = randomBetween(
    afterRoll,
    GAME_CONFIG.emailOutcomeMinMs,
    GAME_CONFIG.emailOutcomeMaxMs,
  );
  const guaranteedTutorialBooking = state.statistics.emailsSent === 0;
  const waitsForEventTutorial =
    isTutorialSceneFinished(state, "first-invitation") &&
    isTutorialScenePending(state, FIRST_EVENT_TUTORIAL_SCENE_ID);
  const reservesBookingForEventTutorial = guaranteedTutorialBooking && waitsForEventTutorial;
  // Lost emails in a row, newest first, up to the last booked trial.
  let emailLossStreak = 0;
  for (let index = state.emails.length - 1; index >= 0; index -= 1) {
    const { status } = state.emails[index];
    if (status === "trialBooked") break;
    if (status === "lost") emailLossStreak += 1;
  }
  const protectedBooking = emailLossStreak >= GAME_CONFIG.conversionGuaranteeFailures;
  const contactRarity = state.contacts.find(
    (contact) => contact.id === email.contactId,
  )?.rarity ?? "common";
  const result =
    guaranteedTutorialBooking || protectedBooking ||
      bookingRoll < getEmailBookingChance(state, contactRarity)
      ? "trialBooked"
      : "lost";
  const outcome: PendingEmailOutcome = {
    id: makeGameId("outcome", now, state.statistics.emailsSent),
    emailId: email.id,
    contactId: email.contactId,
    resolvesAt: now + (isTutorialAndrea(state, email.contactId)
      ? GAME_CONFIG.tutorialAndreaOutcomeMs
      : outcomeDelay),
    result,
    tutorialSceneId: reservesBookingForEventTutorial
      ? FIRST_EVENT_TUTORIAL_SCENE_ID
      : undefined,
    waitForTutorialEvent: waitsForEventTutorial || undefined,
  };

  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    emails: replaceById(state.emails, email.id, (candidate) => ({
      ...candidate,
      status: "sent",
      sentAt: now,
      sendCompletesAt: undefined,
    })),
    contacts: replaceById(state.contacts, email.contactId, (contact) => ({
      ...contact,
      status: "invited",
    })),
    pendingEmailOutcomes: [...state.pendingEmailOutcomes, outcome],
    statistics: { ...state.statistics, emailsSent: state.statistics.emailsSent + 1 },
  };
  nextState = startNextCampaign(nextState, now);
  if (state.statistics.emailsSent === 0) {
    nextState = addMessage(
      nextState,
      now,
      "Inviata la prima email!",
      "Adesso si aspetta. Le risposte arriveranno da sole: tu intanto continua a scrivere.",
      "system",
    );
  }
  return nextState;
}

export function resolveEmailOutcome(
  state: GameState,
  outcome: PendingEmailOutcome,
  now: number,
): GameState {
  if (!state.pendingEmailOutcomes.some((candidate) => candidate.id === outcome.id)) return state;

  let nextState: GameState = {
    ...state,
    pendingEmailOutcomes: state.pendingEmailOutcomes.filter(
      (candidate) => candidate.id !== outcome.id,
    ),
  };

  if (outcome.result === "lost") {
    return {
      ...nextState,
      contacts: replaceById(nextState.contacts, outcome.contactId, (contact) => ({
        ...contact,
        status: "lost",
      })),
      emails: replaceById(nextState.emails, outcome.emailId, (email) => ({
        ...email,
        status: "lost",
      })),
      statistics: {
        ...nextState.statistics,
        contactsLost: nextState.statistics.contactsLost + 1,
      },
    };
  }

  const [trialWait, seedAfterWait] = randomBetween(
    nextState.randomSeed,
    GAME_CONFIG.trialWaitMinMs,
    GAME_CONFIG.trialWaitMaxMs,
  );
  const [resultSeed, nextSeed] = nextRandom(seedAfterWait);
  const tutorialAndrea = isTutorialAndrea(nextState, outcome.contactId);
  const startsAt = now + (tutorialAndrea ? GAME_CONFIG.tutorialAndreaTrialWaitMs : trialWait);
  const trial: ScheduledTrial = {
    id: makeGameId(
      "trial",
      now,
      nextState.historyArchive.completedTrials + nextState.scheduledTrials.length,
    ),
    contactId: outcome.contactId,
    startsAt,
    resolvesAt: startsAt + (tutorialAndrea
      ? GAME_CONFIG.tutorialAndreaTrialDurationMs
      : getTrialDurationMs(nextState.upgrades, GAME_CONFIG.trialDurationMs)),
    resultSeed: Math.floor(resultSeed * 2_147_483_647),
    status: "scheduled",
    tutorialSceneId: outcome.tutorialSceneId,
  };
  nextState = {
    ...nextState,
    randomSeed: nextSeed,
    contacts: replaceById(nextState.contacts, outcome.contactId, (contact) => ({
      ...contact,
      status: "trialScheduled",
    })),
    emails: replaceById(nextState.emails, outcome.emailId, (email) => ({
      ...email,
      status: "trialBooked",
    })),
    scheduledTrials: [...nextState.scheduledTrials, trial],
    statistics: {
      ...nextState.statistics,
      trialsBooked: nextState.statistics.trialsBooked + 1,
    },
  };
  return nextState;
}
