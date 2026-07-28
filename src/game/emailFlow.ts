import {
  chooseEmailPresentationLevel,
  getEmailPresentationMix,
} from "../content/emailPresentation";
import { getEmailBuildLength } from "../content/emailBuild";
import { getTrialDurationMs, getUpgradeEffectTotal } from "../content/upgrades";
import { getEmailBookingChance } from "./formulas";
import { GAME_CONFIG } from "./config";
import { createCampaign } from "./campaignContent";
import { makeGameId } from "./ids";
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

export function startNextCampaign(state: GameState, now: number): GameState {
  if (selectActiveEmail(state)) return state;
  const nextContact = state.contacts.find((contact) => contact.status === "available");
  if (!nextContact) return state;

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
  );
  const initialProgress = getUpgradeEffectTotal(
    state.upgrades,
    "emailInitialProgress",
  );
  const email = initialProgress > 0
    ? {
        ...createdEmail,
        revealedCharacters: Math.floor(
          getEmailBuildLength(createdEmail) * Math.min(0.25, initialProgress),
        ),
      }
    : createdEmail;
  return {
    ...state,
    randomSeed,
    contacts: state.contacts.map((contact) =>
      contact.id === nextContact.id ? { ...contact, status: "writing" } : contact,
    ),
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
  const recentEmailResults = state.emails
    .slice()
    .reverse()
    .filter((candidate) => candidate.status === "lost" || candidate.status === "trialBooked");
  const emailLossStreak = recentEmailResults.findIndex((candidate) => candidate.status !== "lost");
  const protectedBooking =
    (emailLossStreak === -1 ? recentEmailResults.length : emailLossStreak) >=
      GAME_CONFIG.conversionGuaranteeFailures;
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
    resolvesAt: now + outcomeDelay,
    result,
    tutorialSceneId: reservesBookingForEventTutorial
      ? FIRST_EVENT_TUTORIAL_SCENE_ID
      : undefined,
    waitForTutorialEvent: waitsForEventTutorial || undefined,
  };

  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    emails: state.emails.map((candidate) =>
      candidate.id === email.id
        ? { ...candidate, status: "sent", sentAt: now, sendCompletesAt: undefined }
        : candidate,
    ),
    contacts: state.contacts.map((contact) =>
      contact.id === email.contactId ? { ...contact, status: "invited" } : contact,
    ),
    pendingEmailOutcomes: [...state.pendingEmailOutcomes, outcome],
    statistics: { ...state.statistics, emailsSent: state.statistics.emailsSent + 1 },
  };
  nextState = startNextCampaign(nextState, now);
  if (state.statistics.emailsSent === 0) {
    nextState = addMessage(
      nextState,
      now,
      "Configurazione campagna completata",
      "Hai inviato la tua prima email! Il sistema registrerà eventuali risposte e appuntamenti automaticamente senza interrompere la stesura delle tue prossime email",
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
      contacts: nextState.contacts.map((contact) =>
        contact.id === outcome.contactId ? { ...contact, status: "lost" } : contact,
      ),
      emails: nextState.emails.map((email) =>
        email.id === outcome.emailId ? { ...email, status: "lost" } : email,
      ),
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
  const startsAt = now + trialWait;
  const trial: ScheduledTrial = {
    id: makeGameId(
      "trial",
      now,
      nextState.historyArchive.completedTrials + nextState.scheduledTrials.length,
    ),
    contactId: outcome.contactId,
    startsAt,
    resolvesAt: startsAt + getTrialDurationMs(
      nextState.upgrades,
      GAME_CONFIG.trialDurationMs,
    ),
    resultSeed: Math.floor(resultSeed * 2_147_483_647),
    status: "scheduled",
    tutorialSceneId: outcome.tutorialSceneId,
  };
  nextState = {
    ...nextState,
    randomSeed: nextSeed,
    contacts: nextState.contacts.map((contact) =>
      contact.id === outcome.contactId ? { ...contact, status: "trialScheduled" } : contact,
    ),
    emails: nextState.emails.map((email) =>
      email.id === outcome.emailId ? { ...email, status: "trialBooked" } : email,
    ),
    scheduledTrials: [...nextState.scheduledTrials, trial],
    statistics: {
      ...nextState.statistics,
      trialsBooked: nextState.statistics.trialsBooked + 1,
    },
  };
  return nextState;
}
