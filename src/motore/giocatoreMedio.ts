/**
 * Il giocatore medio del motore di test (regole di Andrea del 14/10/2026,
 * Project: claude/motore-giocatore-medio.md). Usa solo le azioni del gioco, come
 * farebbe una persona: nessuna scorciatoia sullo stato.
 */
import { ACQUISITION_EVENTS } from "../content/events";
import { getAvailableForms, getInstructorFormCost } from "../content/forms";
import { TUTORIAL_SCENES } from "../content/tutorialScenes";
import {
  getAnnualFormTrainingLimit,
  getMaxGameSpeed,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getFormTrainingYear } from "../game/calendar";
import { GAME_CONFIG } from "../game/config";
import { gameReducer } from "../game/engine";
import { canStartAcquisitionEvent } from "../game/eventFlow";
import { getExpectedEventContacts } from "../game/eventRewards";
import { getEligibleSchoolContacts } from "../game/tournamentSimulation";
import { getAthleteTournamentStats } from "../game/athleteStats";
import { canFoundSchool, type GameArea } from "../game/progression";
import {
  getPrestigeReputationPreview,
  getReputationLevel,
  REPUTATION_UPGRADE_IDS,
  type ReputationSpending,
} from "../game/reputation";
import { isOfficialSwordSupplierVisible } from "../game/unlocks";
import type {
  CollaboratorAssignment,
  GadgetProductId,
  GameAction,
  GameState,
  RockPaperScissorsChoice,
} from "../game/types";

export const REGOLE = {
  inputPerSecondo: 8,
  /** Avvisi e finestre (Pianificazione, tutorial, scene, minigiochi): entro mezzo minuto. */
  reazioneMs: 30_000,
  /** ponytail: gesti di routine (eventi, Compra tutto, riparazioni) ogni 5 s di gioco attivo; da tarare. */
  routineMs: 5_000,
  riuscitaMinigiochi: 0.7,
  /** Fonda se la crescita annua degli iscritti è sotto il 5%... */
  sogliaCrescita: 0.05,
  /** ...e nell'anno ha potuto comprare meno di 5 Upgrade. */
  sogliaUpgrade: 5,
  /**
   * Andrea (15/10): il «muro» è il primo mese in cui, rispetto a 12 mesi prima, gli
   * iscritti sono cresciuti meno del 5% e sono stati comprati meno di 5 Upgrade.
   * Dal muro il giocatore gioca ancora un anno, poi fonda.
   */
  mesiDopoIlMuro: 12,
  /** ponytail: quante spade compra in Pianificazione, da tarare: una ogni 4 iscritti. */
  spadePerIscritto: 0.25,
  prioritaCollaboratori: ["instructor", "writing", "gadget", "events", "equipment"] as const,
} as const;

const VIEWS: GameArea[] = [
  "mail", "events", "contacts", "upgrades", "tournaments", "gadget", "network", "ludowiki", "settings",
];

export function act(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

/** Finestre che fermano il gioco: il giocatore le chiude dopo mezzo minuto. */
export function finestraAperta(state: GameState): string | undefined {
  if (state.annual?.planningOpen) return "pianificazione";
  if (state.moments.queue.length > 0) return "scena";
  if (state.gadgets.minigame) return "collaudo";
  const reptile = state.tournaments.reptile;
  if (reptile.activeEdition?.minigame.status === "ready") return "reptile";
  if (reptile.unseenRecap) return "reptile-esito";
  if (state.tournaments.chronicles.activeChallenge) return "sfida";
  if (tutorialDaChiudere(state)) return "tutorial";
  return undefined;
}

function tutorialDaChiudere(state: GameState) {
  const done = new Set([...state.tutorial.completedSceneIds, ...state.tutorial.skippedSceneIds]);
  return TUTORIAL_SCENES.find((scene) => !done.has(scene.id) && VIEWS.some((activeView) => {
    try {
      return scene.canStart({ state, activeView, equipmentOpen: true, reptileOpen: true });
    } catch {
      return false;
    }
  }));
}

function sceltaACaso(seed: number): RockPaperScissorsChoice {
  return (["rock", "paper", "scissors"] as const)[Math.abs(seed) % 3];
}

/** Chiude la prima finestra aperta come farebbe il giocatore medio. */
export function chiudiFinestra(state: GameState, now: number, rng: () => number): GameState {
  if (state.annual?.planningOpen) return confermaPianificazione(state, now);
  if (state.moments.queue.length > 0) return act(state, { type: "DISMISS_MOMENT" });
  const minigame = state.gadgets.minigame;
  if (minigame) {
    if (minigame.status === "ready") return act(state, { type: "START_GADGET_MINIGAME", productId: minigame.productId });
    if (minigame.status === "running") {
      return act(state, {
        type: "COMPLETE_GADGET_MINIGAME",
        productId: minigame.productId,
        score: Math.round(100 * REGOLE.riuscitaMinigiochi),
      });
    }
    return act(state, { type: "DISMISS_GADGET_MINIGAME_RESULT", productId: minigame.productId });
  }
  const reptile = state.tournaments.reptile;
  if (reptile.activeEdition?.minigame.status === "ready") {
    const started = act(state, { type: "START_REPTILE_MINIGAME", now });
    // ponytail: «giornata perfetta» fissa a 1.000 punti; conta solo il rapporto (bonus).
    return act(started, {
      type: "COMPLETE_REPTILE_MINIGAME",
      score: 1_000 * REGOLE.riuscitaMinigiochi,
      available: 1_000,
      now,
    });
  }
  if (reptile.unseenRecap) return act(state, { type: "DISMISS_REPTILE_RECAP" });
  if (state.tournaments.chronicles.activeChallenge) {
    // Morra cinese: è fortuna pura, il 70% dei minigiochi non si applica.
    return act(state, { type: "PLAY_CHRONICLES_HAND", choice: sceltaACaso(Math.floor(rng() * 3)), now });
  }
  const scene = tutorialDaChiudere(state);
  if (scene) return act(state, { type: "FINISH_TUTORIAL_SCENE", sceneId: scene.id, skipped: false });
  return state;
}

function confermaPianificazione(state: GameState, now: number): GameState {
  const swords = Math.max(
    0,
    Math.ceil(state.school.activeMembers * REGOLE.spadePerIscritto) - state.equipment.totalSwords,
  );
  const plan = { courses: [], repair: true, swords: isOfficialSwordSupplierVisible(state) ? swords : 0 };
  const confirmed = act(state, { type: "CONFIRM_ANNUAL_PLAN", plan, now });
  if (!confirmed.annual?.planningOpen) return confirmed;
  // Fondi insufficienti: solo la riparazione, poi niente.
  const repairOnly = act(state, { type: "CONFIRM_ANNUAL_PLAN", plan: { ...plan, swords: 0 }, now });
  if (!repairOnly.annual?.planningOpen) return repairOnly;
  return act(state, { type: "CONFIRM_ANNUAL_PLAN", plan: { courses: [], repair: false, swords: 0 }, now });
}

/**
 * Priorità Istruttori > Scrittura > Gadget > Eventi > Attrezzatura (Andrea, 14/10):
 * a cascata, ogni settore ha al massimo le persone di quello prima. Il giocatore
 * ricalcola la distribuzione su tutti, così quando si aprono le Forme il primo
 * collaboratore diventa Istruttore, come chiede il tutorial.
 */
export function distribuzioneACascata(state: GameState): CollaboratorAssignment[] {
  const open = REGOLE.prioritaCollaboratori.filter((role) => {
    if (role === "gadget") return state.unlocks.gadget;
    if (role === "instructor") return state.unlocks.forms;
    return true;
  });
  const counts = open.map(() => 0);
  const result: CollaboratorAssignment[] = [];
  for (let person = 0; person < state.collaborators.length; person += 1) {
    let index = 0;
    for (let candidate = 1; candidate < open.length; candidate += 1) {
      if (counts[candidate] < counts[candidate - 1]) { index = candidate; break; }
    }
    counts[index] += 1;
    result.push(open[index]);
  }
  return result;
}

function assegnaCollaboratori(state: GameState, now: number): GameState {
  if (state.collaboratorManagement.aggregateViewUnlocked) {
    // Le barre partono tutte a 3 e i settori aperti dopo entrano a 3 da soli (gioco, 14/10/2026).
    return state.collaboratorManagement.automaticShares
      ? state
      : act(state, { type: "SET_AUTOMATIC_ASSIGNMENT", enabled: true });
  }
  const wanted = distribuzioneACascata(state);
  // I primi arrivati tengono il posto più in alto nella lista.
  const order = [...state.collaborators].sort((left, right) => left.joinedAt - right.joinedAt);
  let next = state;
  order.forEach((collaborator, index) => {
    if (collaborator.assignment === wanted[index]) return;
    next = act(next, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment: wanted[index],
      now,
    });
  });
  return next;
}

/** Prima che li avvii l'automazione: sempre l'evento che dà più contatti. */
function avviaEventi(state: GameState, now: number): GameState {
  if (state.collaborators.some((collaborator) => collaborator.assignment === "events")) return state;
  let next = state;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const best = ACQUISITION_EVENTS
      .filter((definition) => canStartAcquisitionEvent(next, definition.id, now))
      .sort((left, right) => getExpectedEventContacts(next, right) - getExpectedEventContacts(next, left))[0];
    if (!best) break;
    const started = act(next, { type: "START_ACQUISITION_EVENT", definitionId: best.id, now });
    if (started === next) break;
    next = started;
  }
  return next;
}

/** Come chiede il tutorial: gli Istruttori si abilitano e imparano la Forma successiva. */
function formaIstruttori(state: GameState, now: number): GameState {
  let next = state;
  for (const instructor of state.collaborators) {
    if (instructor.assignment !== "instructor") continue;
    const uncertified = instructor.forms.find((formId) => !instructor.instructorForms.includes(formId));
    if (uncertified && !instructor.instructorCourse) {
      next = act(next, { type: "START_FORM_TRAINING", personId: instructor.id, formId: uncertified, now });
    }
    const current = next.collaborators.find((candidate) => candidate.id === instructor.id);
    if (!current || current.training) continue;
    const forms = getAvailableForms(
      current,
      getFormTrainingYear(next.school.currentMonth),
      3,
      false,
      getAnnualFormTrainingLimit(next.upgrades),
      isCourseXUnlocked(next.upgrades),
    );
    for (const form of forms) {
      if (next.school.euros < getInstructorFormCost(form.cost)) break;
      const started = act(next, { type: "START_FORM_TRAINING", personId: current.id, formId: form.id, now });
      if (started !== next) { next = started; break; }
    }
  }
  return next;
}

function spadeEManutenzione(state: GameState, now: number): GameState {
  let next = state;
  const waiting = [...next.contacts, ...next.collaborators].some(
    (person) => person.training?.status === "waitingForEquipment",
  );
  if (waiting && isOfficialSwordSupplierVisible(next) && next.school.euros >= GAME_CONFIG.officialSwordCost) {
    next = act(next, { type: "BUY_OFFICIAL_SWORD", now });
  }
  // Andrea (15/10): quasi sempre abbastanza spade per le prove. Prima di «Compra tutto» il
  // giocatore copre le prove già fissate che non hanno ancora una spada; se i Fondi non
  // bastano ne compra quante può.
  if (isOfficialSwordSupplierVisible(next)) {
    const daIniziare = next.scheduledTrials.filter((trial) => trial.status === "scheduled" && trial.startsAt > now).length;
    for (let mancanti = daIniziare - next.equipment.availableSwords; mancanti > 0; mancanti = Math.floor(mancanti / 2)) {
      const bought = act(next, { type: "BUY_OFFICIAL_SWORD", now, amount: mancanti });
      if (bought !== next) { next = bought; break; }
    }
  }
  if (next.equipment.damagedSwords > 0 || next.equipment.wear > 0) {
    next = act(next, { type: "MAINTAIN_EQUIPMENT", now });
  }
  return next;
}

function openEGadget(state: GameState, now: number): GameState {
  let next = act(state, { type: "ORGANIZE_REPTILE", now });
  const chronicles = next.tournaments.chronicles;
  if (chronicles.unlocked && chronicles.keys > 0 && !chronicles.activeChallenge) {
    const team = getEligibleSchoolContacts(next)
      .map((contact) => ({ contact, stats: getAthleteTournamentStats(contact) }))
      .sort((left, right) => (right.stats.arena + right.stats.style) - (left.stats.arena + left.stats.style))
      .slice(0, GAME_CONFIG.chroniclesTeamSize)
      .map(({ contact }) => contact.id);
    next = act(next, { type: "START_CHRONICLES_TOURNAMENT", contactIds: team, now });
  }
  if (next.unlocks.gadget) {
    for (const [productId, product] of Object.entries(next.gadgets.products) as [GadgetProductId, typeof next.gadgets.products[GadgetProductId]][]) {
      if (!product.unlocked) continue;
      if (!product.projectPurchased) next = act(next, { type: "START_GADGET_PROJECT", productId, now });
      else if (product.prototypeCompleted && !product.accepted) next = act(next, { type: "ACCEPT_GADGET_PRODUCT", productId });
    }
  }
  return next;
}

/** Le decisioni che il giocatore prende ogni mezzo minuto. */
export function decidi(state: GameState, now: number): GameState {
  // Prima le spade (se sono rotte non si fa nulla), poi eventi e corsi, poi «Compra tutto».
  let next = spadeEManutenzione(state, now);
  next = act(next, { type: "SET_GAME_SPEED", speed: getMaxGameSpeed(next.upgrades) });
  next = assegnaCollaboratori(next, now);
  next = avviaEventi(next, now);
  next = formaIstruttori(next, now);
  next = openEGadget(next, now);
  // Il Reptile costa la sede: con «Compra tutto» ogni 5 secondi i Fondi non ci arrivano mai.
  // Il giocatore medio mette da parte finché non lo organizza (14/10/2026).
  const reptile = next.tournaments.reptile;
  if (reptile.unlocked && !reptile.activeEdition && next.school.euros < GAME_CONFIG.reptileVenueCost) return next;
  // «Compra tutto» salta i Percorsi Segreti: il giocatore compra a mano quelli scoperti (Corso X, 1 €).
  for (const id of next.secretUpgradeDiscoveries) {
    if ((next.upgrades[id] ?? 0) === 0) next = act(next, { type: "BUY_UPGRADE", upgradeId: id, now });
  }
  next = act(next, { type: "BUY_ALL_UPGRADES", now });
  return next;
}

/** Reputazione in parti uguali: un punto alla volta al ramo più basso, entro il tetto. */
/**
 * Come spende la Reputazione alla fondazione (Andrea, 15/10): «pari» = un punto alla
 * volta al ramo più basso; un ramo = tutti i punti lì (oltre il tetto di 50, alla pari);
 * «rendita» = tutti i punti nella Rendita del Network.
 */
export type ModoReputazione = "pari" | "rendita" | (typeof REPUTATION_UPGRADE_IDS)[number];

export function spesaReputazione(state: GameState, modo: ModoReputazione = "pari"): ReputationSpending {
  let available = state.network.reputation + getPrestigeReputationPreview(state).points;
  if (modo === "rendita") return { upgrades: {}, rent: available };
  const upgrades: Partial<Record<(typeof REPUTATION_UPGRADE_IDS)[number], number>> = {};
  const level = (id: (typeof REPUTATION_UPGRADE_IDS)[number]) => getReputationLevel(state, id) + (upgrades[id] ?? 0);
  while (available > 0) {
    const target = modo !== "pari" && level(modo) < GAME_CONFIG.reputationUpgradeMaxLevel ? modo : REPUTATION_UPGRADE_IDS
      .filter((id) => level(id) < GAME_CONFIG.reputationUpgradeMaxLevel)
      .sort((left, right) => level(left) - level(right))[0];
    if (!target) break;
    upgrades[target] = (upgrades[target] ?? 0) + 1;
    available -= 1;
  }
  return { upgrades, rent: 0 };
}

/** Gli ultimi 12 mesi: iscritti all'inizio e livelli di Upgrade comprati. */
export interface AnnoScolastico {
  iscrittiInizio: number;
  upgradeComprati: number;
}

/** Il muro: crescita sotto il 5% e meno di 5 Upgrade negli ultimi 12 mesi, con la fondazione disponibile. */
export function vuoleFondare(state: GameState, anno: AnnoScolastico): boolean {
  if (!canFoundSchool(state)) return false;
  const crescita = (state.school.activeMembers - anno.iscrittiInizio) / Math.max(1, anno.iscrittiInizio);
  return crescita < REGOLE.sogliaCrescita && anno.upgradeComprati < REGOLE.sogliaUpgrade;
}

export function fonda(state: GameState, numero: number, now: number, modo: ModoReputazione = "pari"): GameState {
  return act(state, {
    type: "FOUND_SCHOOL",
    details: { name: `Scuola ${numero}`, city: `Città ${numero}` },
    now,
    spending: spesaReputazione(state, modo),
  });
}
