import { describe, expect, it } from "vitest";
import { PROSPECT_EMAIL_PROVIDERS } from "../content/prospectDirectory";
import { PERSON_RARITIES } from "../content/rarities";
import { getSchoolYear } from "./calendar";
import { recruitCollaborator } from "./collaboratorFlow";
import { GAME_CONFIG } from "./config";
import {
  createInitialState,
  gameReducer,
  getLegendaryEnrollmentChance,
} from "./engine";
import {
  getEmailBookingChance,
  getEnrollmentChance,
  getMemberAnnualDepartureChance,
} from "./formulas";
import { selectActiveEmail } from "./selectors";

describe("game engine: funnel", () => {
  it("creates a playable tutorial state", () => {
    const state = createInitialState(1_000);

    expect(state.contacts).toHaveLength(5);
    expect(state.contacts.filter((contact) => contact.status === "available")).toHaveLength(4);
    expect(state.contacts.every((contact) =>
      PROSPECT_EMAIL_PROVIDERS.includes(
        contact.email.split("@")[1] as (typeof PROSPECT_EMAIL_PROVIDERS)[number],
      )
    )).toBe(true);
    expect(selectActiveEmail(state)?.status).toBe("writing");
    expect(state.school.euros).toBe(0);
    expect(state.school.currentMonth).toBe(9);
    expect(getSchoolYear(state.school.currentMonth)).toBe(1);
    expect(state.contacts.every((contact) =>
      contact.rarity === "common" || contact.rarity === "rare"
    )).toBe(true);
    expect(PERSON_RARITIES.common.queueAppearanceChance).toBe(0.8);
    expect(PERSON_RARITIES.rare.queueAppearanceChance).toBe(0.125);
    expect(PERSON_RARITIES["ultra-rare"].queueAppearanceChance).toBe(0.055);
    expect(PERSON_RARITIES.legendary.queueAppearanceChance).toBe(0.02);
    expect(Object.values(PERSON_RARITIES).reduce(
      (total, rarity) => total + rarity.queueAppearanceChance,
      0,
    )).toBe(1);
    expect(getEnrollmentChance(state, "common")).toBe(0.625);
    expect(getEnrollmentChance(state, "rare")).toBe(0.4);
    expect(getEnrollmentChance(state, "ultra-rare")).toBeCloseTo(7 / 30);
    expect(getEnrollmentChance(state, "legendary")).toBe(0.15);
    expect(getEmailBookingChance(state, "common")).toBe(0.4);
    expect(getEmailBookingChance(state, "rare")).toBe(0.5);
    expect(getEmailBookingChance(state, "ultra-rare")).toBe(0.75);
    expect(getEmailBookingChance(state, "legendary")).toBe(1);
    expect(getEmailBookingChance(state, "common") * getEnrollmentChance(state, "common"))
      .toBeCloseTo(0.25);
    expect(getEmailBookingChance(state, "rare") * getEnrollmentChance(state, "rare"))
      .toBeCloseTo(0.2);
    expect(getEmailBookingChance(state, "ultra-rare") * getEnrollmentChance(state, "ultra-rare"))
      .toBeCloseTo(0.175);
    expect(getEmailBookingChance(state, "legendary") * getEnrollmentChance(state, "legendary"))
      .toBeCloseTo(0.15);
  });

  it("reveals only the configured amount of predetermined text", () => {
    const state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    const faster = { ...state, player: { writingPower: 2 } };
    const next = gameReducer(faster, { type: "WRITE", now: 2_000 });

    expect(selectActiveEmail(next)?.revealedCharacters).toBe(2);
    expect(selectActiveEmail(next)?.body.slice(0, 2)).toBe(email.body.slice(0, 2));
    expect(next.statistics.inputs).toBe(1);
  });

  it("guarantees Andrea Simonazzi as the ninth contact in the initial school", () => {
    const initial = createInitialState(1_000);
    const padding = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `padding-${index}`,
      status: "available" as const,
    }));
    const event = {
      id: "tenth-contact-event",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Genova",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const state = gameReducer({
      ...initial,
      randomSeed: 42,
      contacts: [...initial.contacts, ...padding],
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });

    expect(state.contacts.slice(0, 8).every((contact) =>
      contact.rarity === "common" || contact.rarity === "rare"
    )).toBe(true);
    expect(state.contacts[8].rarity).toBe("legendary");
    expect(state.contacts[8].specialProfileId).toBe("andrea-simonazzi");
    expect(state.legendaryCollaborators.encounteredProfileIds).toContain("andrea-simonazzi");
  });

  it("does not guarantee Andrea Simonazzi as the ninth contact in later schools", () => {
    const initial = createInitialState(1_000, "", false);
    const padding = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `later-school-padding-${index}`,
      status: "available" as const,
    }));
    const event = {
      id: "later-school-ninth-contact",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Trieste",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const state = gameReducer({
      ...initial,
      randomSeed: 42,
      contacts: [...initial.contacts, ...padding],
      network: {
        ...initial.network,
        schools: [{
          id: "school-archive",
          name: "Ordine delle Onde",
          city: "Genova",
          motto: "",
          specialization: "generale" as const,
          membersAtTransfer: 80,
          emailsSent: 30,
          eventsCompleted: 50,
          transferredAt: 1_500,
        }],
      },
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });

    expect(state.contacts).toHaveLength(9);
    expect(state.contacts[8].specialProfileId).not.toBe("andrea-simonazzi");
  });

  it("allows Ultra Rare and Legendary contacts only after Andrea in the initial school", () => {
    const initial = createInitialState(1_000);
    const padding = Array.from({ length: 3 }, (_, index) => ({
      ...initial.contacts[index],
      id: `advanced-rarity-padding-${index}`,
      status: "available" as const,
    }));
    const generated = gameReducer({
      ...initial,
      contacts: [...initial.contacts, ...padding],
      statistics: { ...initial.statistics, contactsAcquired: 3 },
    }, {
      type: "ADMIN_ADD_CONTACTS",
      amount: 200,
    });

    expect(generated.contacts[8].specialProfileId).toBe("andrea-simonazzi");
    expect(generated.contacts.slice(9).some((contact) =>
      contact.rarity === "ultra-rare" || contact.rarity === "legendary"
    )).toBe(true);
  });

  it("recruits only Legendary members and Ultra Rare members qualified at Course Y", () => {
    const initial = createInitialState(1_000);
    const contact = { ...initial.contacts[0], status: "enrolled" as const };

    for (const rarity of ["common", "rare", "ultra-rare"] as const) {
      const unchanged = recruitCollaborator(initial, { ...contact, rarity }, 2_000);
      expect(unchanged).toBe(initial);
    }

    const legendary = recruitCollaborator(
      initial,
      { ...contact, rarity: "legendary" },
      2_000,
    );
    const qualifiedUltraRare = recruitCollaborator(
      initial,
      { ...contact, rarity: "ultra-rare", forms: ["course-y"] },
      2_000,
    );

    expect(legendary.collaborators).toHaveLength(1);
    expect(qualifiedUltraRare.collaborators).toHaveLength(1);
  });

  it("repairs every enrolled Legendary regardless of how the state was produced", () => {
    const initial = createInitialState(1_000);
    const legendaryMembers = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `enrolled-legendary-${index}`,
      status: "enrolled" as const,
      rarity: "legendary" as const,
    }));
    const repaired = gameReducer({
      ...initial,
      contacts: [...legendaryMembers, ...initial.contacts.slice(3)],
      school: {
        ...initial.school,
        activeMembers: legendaryMembers.length,
        historicMembers: legendaryMembers.length,
      },
    }, { type: "ADMIN_ADD_EUROS", amount: 1 });

    expect(repaired.collaborators.map((collaborator) => collaborator.contactId))
      .toEqual(legendaryMembers.map((contact) => contact.id));
    expect(repaired.statistics.collaboratorsRecruited).toBe(legendaryMembers.length);

    const repairedAgain = gameReducer(repaired, { type: "ADMIN_ADD_EUROS", amount: 1 });
    expect(repairedAgain.collaborators).toHaveLength(legendaryMembers.length);
    expect(repairedAgain.statistics.collaboratorsRecruited).toBe(legendaryMembers.length);
  });

  it("stores the user name in the active email", () => {
    const state = createInitialState(1_000);

    const updated = gameReducer(state, {
      type: "UPDATE_PROFILE_NAME",
      displayName: "  Andrea   Ungaro  ",
    });

    expect(updated.profile.displayName).toBe("Andrea Ungaro");
    expect(updated.emails[0].body.toLocaleLowerCase("it-IT")).not.toContain("segreteria");
  });

  it("uses the active school details in the HTML signature", () => {
    const initial = createInitialState(1_000, "Legend");
    const state = {
      ...initial,
      school: {
        ...initial.school,
        name: "Ordine del Faro",
        city: "Trieste",
      },
      emails: initial.emails.map((email) => ({
        ...email,
        presentationLevel: 2 as const,
      })),
    };

    const updated = gameReducer(state, {
      type: "UPDATE_PROFILE_NAME",
      displayName: "Nuovo Legend",
    });

    expect(updated.emails[0].body).toContain(
      "Nuovo Legend, Ordine del Faro - Trieste",
    );
  });

  it("determines and stores the first email outcome exactly once", () => {
    const state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    const nearlyComplete = {
      ...state,
      emails: state.emails.map((candidate) => ({
        ...candidate,
        revealedCharacters: candidate.body.length - 1,
      })),
    };
    const sending = gameReducer(nearlyComplete, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });
    const tickedAgain = gameReducer(sent, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(sent.emails.find((candidate) => candidate.id === email.id)?.status).toBe("sent");
    expect(sent.messages.find((message) => message.subject === "Configurazione campagna completata")?.sender)
      .toBe("Ordine delle Onde");
    expect(sent.pendingEmailOutcomes).toHaveLength(1);
    expect(sent.pendingEmailOutcomes[0].result).toBe("trialBooked");
    expect(sent.statistics.emailsSent).toBe(1);
    expect(tickedAgain.pendingEmailOutcomes).toHaveLength(1);
    expect(tickedAgain.statistics.emailsSent).toBe(1);
  });

  it("guarantees a trial booking for every Legendary profile", () => {
    const initial = createInitialState(1_000);
    const email = selectActiveEmail(initial)!;
    const state = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, historicMembers: 1 },
      statistics: { ...initial.statistics, emailsSent: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === email.contactId
          ? {
              ...contact,
              firstName: "Andrea",
              lastName: "Simonazzi",
              rarity: "legendary" as const,
              specialProfileId: "andrea-simonazzi" as const,
            }
          : contact,
      ),
      emails: initial.emails.map((candidate) => ({
        ...candidate,
        revealedCharacters: candidate.body.length - 1,
      })),
    };

    const sending = gameReducer(state, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(getEmailBookingChance(state, "legendary")).toBe(1);
    expect(sent.pendingEmailOutcomes[0].result).toBe("trialBooked");
  });

  it("does not notify when contacts are running low or exhausted", () => {
    const initial = createInitialState(1_000);
    const activeEmail = selectActiveEmail(initial)!;
    const ready = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === activeEmail.contactId
          ? contact
          : { ...contact, status: "lost" as const },
      ),
      emails: [{ ...activeEmail, revealedCharacters: activeEmail.body.length - 1 }],
    };

    const sending = gameReducer(ready, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(sent.messages.some((message) => message.subject === "Stiamo finendo i contatti"))
      .toBe(false);
    expect(sent.messages.some((message) => message.subject === "Contatti terminati")).toBe(false);
  });

  it("completes the protected tutorial funnel and unlocks the first upgrade", () => {
    let state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    state = {
      ...state,
      emails: [{ ...email, revealedCharacters: email.body.length - 1 }],
      school: {
        ...state.school,
        nextFeeAt: 1_000 + GAME_CONFIG.gameMonthMs * 2,
      },
    };
    state = gameReducer(state, { type: "WRITE", now: 2_000 });
    state = gameReducer(state, { type: "TICK", now: 3_000 });
    const outcome = state.pendingEmailOutcomes[0];
    state = gameReducer(state, { type: "TICK", now: outcome.resolvesAt });
    const trial = state.scheduledTrials[0];
    state = gameReducer(state, { type: "TICK", now: trial.resolvesAt });

    expect(state.school.activeMembers).toBe(1);
    expect(state.school.peakActiveMembers).toBe(1);
    expect(state.school.euros).toBe(GAME_CONFIG.enrollmentBonus + 15);
    expect(state.unlocks.upgrades).toBe(true);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.statistics.membersEnrolled).toBe(1);
    expect(state.collaborators).toHaveLength(0);
    expect(state.unlocks.forms).toBe(true);
    expect(state.unlocks.collaborators).toBe(false);
    expect(state.messages.some((message) => message.subject === "Nuovo collaboratore disponibile")).toBe(false);
  });

  it("makes enrollment equally difficult and progressive for every Legendary", () => {
    const initial = createInitialState(1_000);
    const eva = {
      ...initial.contacts[1],
      firstName: "Eva",
      lastName: "Parodi",
      rarity: "legendary" as const,
      specialProfileId: "eva-parodi" as const,
    };
    const trial = {
      id: "trial-eva",
      contactId: eva.id,
      startsAt: 1_500,
      resolvesAt: 2_000,
      resultSeed: 0,
      status: "scheduled" as const,
    };
    const firstAttempt = gameReducer({
      ...initial,
      school: { ...initial.school, historicMembers: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === eva.id ? { ...eva, status: "trialScheduled" as const } : contact,
      ),
      scheduledTrials: [trial],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });
    const protectedAttempt = gameReducer({
      ...initial,
      school: { ...initial.school, historicMembers: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === eva.id ? { ...eva, status: "trialScheduled" as const } : contact,
      ),
      scheduledTrials: [trial],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrollmentAttempts: { "eva-parodi": 5 },
      },
    }, { type: "TICK", now: 2_000 });

    expect(getLegendaryEnrollmentChance(initial, "andrea-simonazzi")).toBe(0.15);
    expect(getLegendaryEnrollmentChance(initial, "eva-parodi")).toBe(0.15);
    expect(firstAttempt.contacts.find((contact) => contact.id === eva.id)?.status).toBe("lost");
    expect(firstAttempt.legendaryCollaborators.enrollmentAttempts["eva-parodi"]).toBe(1);
    expect(firstAttempt.collaborators).toHaveLength(0);
    expect(protectedAttempt.contacts.find((contact) => contact.id === eva.id)?.status).toBe("enrolled");
    expect(protectedAttempt.collaborators).toHaveLength(1);
    expect(protectedAttempt.collaborators[0].rarity).toBe("legendary");
    expect(protectedAttempt.unlocks.forms).toBe(true);
    expect(protectedAttempt.messages.find((message) => message.subject === "Nuovo collaboratore disponibile")?.preview)
      .toBe("Eva Parodi è il nuovo collaboratore della scuola. Può aiutare in vari settori automatizzando il lavoro o potenziandone l'efficacia.\n\nPuoi impiegarlo in Redazione, Eventi, Lezioni, Social, Attrezzatura o come Istruttore.\n\nPuò anche migliorare nel tempo la sua efficacia impiegandolo più tempo in un solo ruolo.");
  });

  it("applies the same enrollment progression to Andrea and every other Legendary", () => {
    const initial = createInitialState(1_000);
    const withEqualAttempts = {
      ...initial,
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrollmentAttempts: {
          "andrea-simonazzi": 2,
          "eva-parodi": 2,
        },
      },
    };

    expect(getLegendaryEnrollmentChance(withEqualAttempts, "andrea-simonazzi"))
      .toBe(getLegendaryEnrollmentChance(withEqualAttempts, "eva-parodi"));
  });

  it("guarantees Andrea Simonazzi's enrollment in the initial school for every roll", () => {
    const initial = createInitialState(1_000, "", false);
    const andrea = {
      ...initial.contacts[0],
      firstName: "Andrea",
      lastName: "Simonazzi",
      rarity: "legendary" as const,
      specialProfileId: "andrea-simonazzi" as const,
      status: "trialScheduled" as const,
    };

    for (const resultSeed of [0, 1, 123, 2_147_483_646]) {
      const trial = {
        id: `trial-andrea-${resultSeed}`,
        contactId: andrea.id,
        startsAt: 1_500,
        resolvesAt: 2_000,
        resultSeed,
        status: "scheduled" as const,
      };
      const ready = {
        ...initial,
        school: {
          ...initial.school,
          activeMembers: 3,
          peakActiveMembers: 3,
          historicMembers: 3,
        },
        contacts: initial.contacts.map((contact) =>
          contact.id === andrea.id ? andrea : contact,
        ),
        scheduledTrials: [trial],
      };

      const resolved = gameReducer(ready, { type: "TICK", now: trial.resolvesAt });

      expect(
        resolved.contacts.find((contact) => contact.id === andrea.id)?.status,
      ).toBe("enrolled");
      expect(resolved.legendaryCollaborators.enrolledProfileIds)
        .toContain("andrea-simonazzi");
    }
  });

  it("schedules booked trials without adding an inbox message", () => {
    let state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    state = {
      ...state,
      emails: [{ ...email, revealedCharacters: email.body.length - 1 }],
    };
    state = gameReducer(state, { type: "WRITE", now: 2_000 });
    state = gameReducer(state, { type: "TICK", now: 3_000 });
    const outcome = state.pendingEmailOutcomes[0];
    const messagesBeforeBooking = state.messages;

    state = gameReducer(state, { type: "TICK", now: outcome.resolvesAt });

    expect(state.scheduledTrials).toHaveLength(1);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.messages).toBe(messagesBeforeBooking);
    expect(state.messages.some((message) => message.subject === "Nuova lezione di prova prenotata"))
      .toBe(false);
  });

  it("collects periodic fees without duplicating a period", () => {
    const initial = createInitialState(1_000);
    const dueAt = 10_000;
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: dueAt },
    };
    const paid = gameReducer(state, { type: "TICK", now: dueAt });
    const sameTick = gameReducer(paid, { type: "TICK", now: dueAt });

    expect(paid.school.euros).toBe(2 * GAME_CONFIG.monthlyMemberFee);
    expect(paid.school.currentMonth).toBe(10);
    expect(sameTick.school.euros).toBe(paid.school.euros);
  });

  it("advances game months even without active members", () => {
    const initial = createInitialState(1_000);
    const advanced = gameReducer(initial, {
      type: "TICK",
      now: 1_000 + GAME_CONFIG.gameMonthMs * 3,
    });

    expect(advanced.school.currentMonth).toBe(12);
    expect(advanced.school.euros).toBe(0);
  });

  it("lets ignored ordinary members leave in the June to July transition", () => {
    const initial = createInitialState(1_000);
    const [ignored, trained, legendary, collaboratorMember, recent] = initial.contacts;
    const contacts = [
      { ...ignored, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 1 },
      { ...trained, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 1, lastFormTrainingYear: 1 },
      {
        ...legendary,
        firstName: "Andrea",
        lastName: "Simonazzi",
        status: "enrolled" as const,
        rarity: "legendary" as const,
        specialProfileId: "andrea-simonazzi" as const,
        enrolledMonth: 1,
      },
      { ...collaboratorMember, status: "enrolled" as const, rarity: "rare" as const, enrolledMonth: 1 },
      { ...recent, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 2 },
    ];
    const state = {
      ...initial,
      randomSeed: 7,
      contacts,
      school: { ...initial.school, activeMembers: 5, currentMonth: 18, nextFeeAt: 2_000 },
      collaborators: [{
        id: "collaborator-protected",
        contactId: collaboratorMember.id,
        displayName: `${collaboratorMember.firstName} ${collaboratorMember.lastName}`,
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: null,
        rarity: "rare" as const,
      }],
    };

    const renewed = gameReducer(state, { type: "TICK", now: 2_000 });

    expect(renewed.contacts.find((contact) => contact.id === ignored.id)?.status).toBe("departed");
    expect(renewed.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(3);
    expect(renewed.school.activeMembers).toBe(3);
    expect(renewed.statistics.membersDeparted).toBe(2);
    expect(renewed.messages.some((message) => message.subject === "2 iscritti hanno lasciato la scuola")).toBe(true);

    const septemberState = gameReducer({
      ...state,
      school: { ...state.school, currentMonth: 20 },
    }, { type: "TICK", now: 2_000 });
    expect(septemberState.statistics.membersDeparted).toBe(0);
    expect(septemberState.contacts.filter((contact) => contact.status === "departed")).toHaveLength(0);
  });

  it("reduces annual departure risk and applies the Form 7 rarity curve", () => {
    expect(getMemberAnnualDepartureChance([])).toBe(0.8);
    expect(getMemberAnnualDepartureChance(["form-1", "course-x"])).toBe(0.65);
    expect(getMemberAnnualDepartureChance(["form-1", "course-x", "form-2", "course-y"])).toBe(0.5);
    expect(getMemberAnnualDepartureChance([], "legendary")).toBeCloseTo(0.08);

    const formSeven = ["form-1", "course-x", "form-2", "course-y", "form-3-staff", "form-4-staff", "form-5-staff", "form-6", "form-7"] as const;
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 0)).toBe(0.025);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 0)).toBe(0.005);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 0)).toBe(0);
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 1)).toBeCloseTo(0.03);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 1)).toBeCloseTo(0.01);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 1)).toBeCloseTo(0.005);
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 3)).toBeCloseTo(0.04);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 3)).toBeCloseTo(0.02);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 3)).toBeCloseTo(0.015);
  });

  it("lets Andrea leave under the same rules and retains his full progress", () => {
    const initial = createInitialState(1_000);
    const [andreaContact, evaContact] = initial.contacts;
    const contacts = initial.contacts.map((contact) => {
      if (contact.id === andreaContact.id) {
        return {
          ...contact,
          firstName: "Andrea",
          lastName: "Simonazzi",
          status: "enrolled" as const,
          rarity: "legendary" as const,
          specialProfileId: "andrea-simonazzi" as const,
          enrolledMonth: 1,
        };
      }
      if (contact.id === evaContact.id) {
        return {
          ...contact,
          firstName: "Eva",
          lastName: "Parodi",
          status: "enrolled" as const,
          rarity: "legendary" as const,
          specialProfileId: "eva-parodi" as const,
          enrolledMonth: 1,
        };
      }
      return { ...contact, status: "lost" as const };
    });
    const collaborators = [
      {
        id: "collaborator-andrea",
        contactId: andreaContact.id,
        displayName: "Andrea Simonazzi",
        joinedAt: 1_000,
        forms: ["form-1" as const],
        instructorForms: ["form-1" as const],
        assignment: "writing" as const,
        rarity: "legendary" as const,
        specialProfileId: "andrea-simonazzi" as const,
        lastFormTrainingYear: 0,
      },
      {
        id: "collaborator-eva",
        contactId: evaContact.id,
        displayName: "Eva Parodi",
        joinedAt: 500,
        forms: ["form-1" as const, "course-x" as const, "form-2" as const],
        instructorForms: ["form-1" as const, "form-2" as const],
        assignment: "lessons" as const,
        rarity: "legendary" as const,
        specialProfileId: "eva-parodi" as const,
        lastFormTrainingYear: 0,
      },
    ];
    const renewed = gameReducer({
      ...initial,
      randomSeed: 7,
      contacts,
      collaborators,
      school: {
        ...initial.school,
        activeMembers: 2,
        peakActiveMembers: 2,
        historicMembers: 2,
        currentMonth: 18,
        nextFeeAt: 2_000,
      },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: ["andrea-simonazzi", "eva-parodi"],
        enrolledProfileIds: ["andrea-simonazzi", "eva-parodi"],
      },
    }, { type: "TICK", now: 2_000 });

    expect(renewed.contacts.find((contact) => contact.id === andreaContact.id)).toMatchObject({
      status: "departed",
      forms: ["form-1"],
    });
    expect(renewed.collaborators.some((collaborator) =>
      collaborator.specialProfileId === "andrea-simonazzi"
    )).toBe(false);
    expect(renewed.contacts.find((contact) => contact.id === evaContact.id)?.status)
      .toBe("enrolled");
    expect(renewed.collaborators.some((collaborator) =>
      collaborator.specialProfileId === "eva-parodi"
    )).toBe(true);
    expect(renewed.legendaryCollaborators.enrolledProfileIds)
      .toEqual(["eva-parodi"]);
    expect(renewed.legendaryCollaborators.retainedProgress["andrea-simonazzi"]).toEqual({
      forms: ["form-1"],
      instructorForms: ["form-1"],
      formBranchPreferences: [],
      joinedAt: 1_000,
      lastFormTrainingYear: 0,
    });
  });
});
