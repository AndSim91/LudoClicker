import type { AcquisitionEventId } from "../game/types";

export interface AcquisitionEventDefinition {
  id: AcquisitionEventId;
  title: string;
  location: string;
  description: string;
  durationMs: number;
  cost: number;
  baseAttendance: number;
  demonstrationRate: number;
  contactRate: number;
  varianceMin: number;
  varianceMax: number;
  risk: "Basso" | "Medio" | "Alto";
  requiredMembers: number;
  requiredSwords: number;
  wearAdded: number;
  availability: string;
}

export const ACQUISITION_EVENTS: AcquisitionEventDefinition[] = [
  {
    id: "park-sparring",
    title: "Sparring al parco",
    location: "Parco di Villa Croce",
    description: "Una sessione informale e gratuita per incontrare poche persone interessate.",
    durationMs: 15_000,
    cost: 0,
    baseAttendance: 8,
    demonstrationRate: 0.65,
    contactRate: 0.4,
    varianceMin: 0.8,
    varianceMax: 1.2,
    risk: "Basso",
    requiredMembers: 0,
    requiredSwords: 2,
    wearAdded: 3,
    availability: "Sempre disponibile",
  },
  {
    id: "public-demo",
    title: "Dimostrazione pubblica",
    location: "Piazza De Ferrari",
    description: "Un appuntamento programmato con maggiore affluenza e materiale organizzativo.",
    durationMs: 45_000,
    cost: 15,
    baseAttendance: 30,
    demonstrationRate: 0.45,
    contactRate: 0.4,
    varianceMin: 0.85,
    varianceMax: 1.2,
    risk: "Medio",
    requiredMembers: 1,
    requiredSwords: 4,
    wearAdded: 8,
    availability: "Programmato per oggi",
  },
  {
    id: "sports-stand",
    title: "Stand sportivo",
    location: "Porto Antico",
    description: "Uno spazio riconoscibile per presentare la disciplina a un pubblico numeroso.",
    durationMs: 60_000,
    cost: 30,
    baseAttendance: 50,
    demonstrationRate: 0.35,
    contactRate: 0.45,
    varianceMin: 0.9,
    varianceMax: 1.15,
    risk: "Basso",
    requiredMembers: 3,
    requiredSwords: 6,
    wearAdded: 10,
    availability: "Disponibile con 3 iscritti",
  },
  {
    id: "local-event",
    title: "Evento locale",
    location: "Piazza delle Erbe",
    description: "Un appuntamento di quartiere dal pubblico generalista e dall'affluenza variabile.",
    durationMs: 40_000,
    cost: 20,
    baseAttendance: 35,
    demonstrationRate: 0.35,
    contactRate: 0.35,
    varianceMin: 0.65,
    varianceMax: 1.4,
    risk: "Medio",
    requiredMembers: 2,
    requiredSwords: 4,
    wearAdded: 7,
    availability: "Disponibile con 2 iscritti",
  },
  {
    id: "themed-event",
    title: "Evento a tema",
    location: "Villa Bombrini",
    description: "Un evento scenografico, accuratamente privo di riferimenti legalmente riconoscibili.",
    durationMs: 60_000,
    cost: 40,
    baseAttendance: 70,
    demonstrationRate: 0.45,
    contactRate: 0.4,
    varianceMin: 0.8,
    varianceMax: 1.25,
    risk: "Medio",
    requiredMembers: 8,
    requiredSwords: 6,
    wearAdded: 12,
    availability: "Disponibile con 8 iscritti",
  },
  {
    id: "school-open-day",
    title: "Open day della scuola",
    location: "Sede dell'Ordine delle Onde",
    description: "Una giornata introduttiva in palestra con contatti meno numerosi ma più interessati.",
    durationMs: 45_000,
    cost: 25,
    baseAttendance: 30,
    demonstrationRate: 0.55,
    contactRate: 0.55,
    varianceMin: 0.9,
    varianceMax: 1.1,
    risk: "Basso",
    requiredMembers: 5,
    requiredSwords: 4,
    wearAdded: 6,
    availability: "Disponibile con 5 iscritti",
  },
  {
    id: "organized-flyering",
    title: "Volantinaggio organizzato benissimo",
    location: "Centro di Genova",
    description: "Un piano impeccabile sulla carta, con risultati deliberatamente imprevedibili.",
    durationMs: 20_000,
    cost: 10,
    baseAttendance: 20,
    demonstrationRate: 0.3,
    contactRate: 0.25,
    varianceMin: 0.35,
    varianceMax: 2.5,
    risk: "Alto",
    requiredMembers: 1,
    requiredSwords: 0,
    wearAdded: 0,
    availability: "Disponibile con 1 iscritto",
  },
];

export function getAcquisitionEventDefinition(id: AcquisitionEventId) {
  return ACQUISITION_EVENTS.find((event) => event.id === id);
}
