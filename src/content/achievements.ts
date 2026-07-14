import type { AchievementId, GameState } from "../game/types";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  euroReward: number;
  condition: (state: GameState) => boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "first-email", title: "Prima email inviata", description: "La campagna è ufficialmente cominciata.", euroReward: 5, condition: (state) => state.statistics.emailsSent >= 1 },
  { id: "first-member", title: "Primo iscritto", description: "L'Ordine delle Onde cresce di una persona.", euroReward: 10, condition: (state) => state.statistics.membersEnrolled >= 1 },
  { id: "persistent-invites", title: "Dieci inviti e immutato ottimismo", description: "La perseveranza amministrativa è stata riconosciuta.", euroReward: 10, condition: (state) => state.statistics.emailsSent >= 10 && state.statistics.trialsBooked === 0 },
  { id: "first-event", title: "Primo evento completato", description: "Pubblico, prove e contatti sono entrati nel report.", euroReward: 5, condition: (state) => state.statistics.eventsCompleted >= 1 && state.statistics.contactsAcquired >= 1 },
  { id: "hundred-contacts", title: "Cento contatti raccolti", description: "L'elenco richiede ormai uno scorrimento significativo.", euroReward: 25, condition: (state) => state.statistics.contactsAcquired >= 100 },
  { id: "first-maintenance", title: "Prima manutenzione completata", description: "Le spade non si sono sistemate completamente da sole.", euroReward: 5, condition: (state) => state.statistics.maintenanceCompleted >= 1 },
  { id: "first-collaborator", title: "Primo collaboratore", description: "Una mano in più è entrata ufficialmente nell'organizzazione.", euroReward: 10, condition: (state) => state.statistics.collaboratorsRecruited >= 1 },
  { id: "first-form", title: "Prima Forma completata", description: "La formazione dei collaboratori è iniziata.", euroReward: 15, condition: (state) => state.statistics.formsCompleted >= 1 },
  { id: "thousand-emails", title: "Mille email inviate", description: "La tastiera chiede formalmente una pausa che non otterrà.", euroReward: 100, condition: (state) => state.statistics.emailsSent >= 1_000 },
  { id: "first-school", title: "Prima nuova scuola fondata", description: "La prima sede precedente è entrata nella rete permanente.", euroReward: 50, condition: (state) => state.network.schools.length >= 1 },
  { id: "ten-schools", title: "Rete di dieci scuole", description: "Il coordinamento multi-sede è ormai un lavoro a tempo pieno.", euroReward: 250, condition: (state) => state.network.schools.length >= 10 },
  { id: "no-recognizable-reference", title: "Nessun riferimento legalmente riconoscibile", description: "Venti eventi a tema gestiti con impeccabile prudenza narrativa.", euroReward: 20, condition: (state) => state.acquisitionEvents.filter((event) => event.definitionId === "themed-event" && event.status === "completed").length >= 20 },
];

export function getNewAchievements(state: GameState) {
  return ACHIEVEMENTS.filter(
    (definition) => !state.achievements.includes(definition.id) && definition.condition(state),
  );
}
