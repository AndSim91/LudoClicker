import type { EmailPresentationLevel, UpgradeLevels } from "../game/types";

export const EMAIL_PRESENTATION_LEVELS: Record<
  EmailPresentationLevel,
  { label: string; description: string }
> = {
  0: {
    label: "Bozza con refusi",
    description: "Una mail breve, personale e ancora piena di piccoli errori.",
  },
  1: {
    label: "Controllo ortografico",
    description: "La stessa mail, ripulita da refusi ed errori grammaticali.",
  },
  2: {
    label: "Email professionale",
    description: "Firma completa, paragrafi leggibili e spaziatura coerente.",
  },
  3: {
    label: "Invito personalizzato",
    description: "Un nuovo set di inviti più lunghi parla meglio al destinatario.",
  },
  4: {
    label: "Call to action",
    description: "Link e pulsanti rendono immediato il passo successivo.",
  },
  5: {
    label: "Impaginazione",
    description: "La mail riceve una struttura CSS ordinata e riconoscibile.",
  },
  6: {
    label: "Pubblicità vincente",
    description: "Il testo diventa un volantino completo con immagini e dettagli.",
  },
  7: {
    label: "Corso di Marketing",
    description: "Una campagna completa spiega lo sport in modo approfondito.",
  },
};

export function getEmailPresentationLevel(upgrades: UpgradeLevels): EmailPresentationLevel {
  if ((upgrades["marketing-course"] ?? 0) > 0) return 7;
  if ((upgrades["winning-advertising"] ?? 0) > 0) return 6;
  if ((upgrades["email-layout"] ?? 0) > 0) return 5;
  if ((upgrades["call-to-action"] ?? 0) > 0) return 4;
  if ((upgrades["personalized-invite"] ?? 0) > 0) return 3;
  if ((upgrades["professional-email"] ?? 0) > 0) return 2;
  if ((upgrades["spell-check"] ?? 0) > 0) return 1;
  return 0;
}
