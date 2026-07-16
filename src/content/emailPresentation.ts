import type {
  EmailPresentationLevel,
  UpgradeId,
  UpgradeLevels,
} from "../game/types";

export interface EmailCatalogStage {
  level: Exclude<EmailPresentationLevel, 0>;
  upgradeId: UpgradeId;
}

export interface EmailPresentationMix {
  previousLevel: EmailPresentationLevel;
  newLevel: EmailPresentationLevel;
  purchasedLevels: number;
  previousCatalogShare: number;
  newCatalogShare: number;
}

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

export const EMAIL_CATALOG_STAGES: EmailCatalogStage[] = [
  { level: 1, upgradeId: "spell-check" },
  { level: 2, upgradeId: "professional-email" },
  { level: 3, upgradeId: "personalized-invite" },
  { level: 4, upgradeId: "call-to-action" },
  { level: 5, upgradeId: "email-layout" },
  { level: 6, upgradeId: "winning-advertising" },
  { level: 7, upgradeId: "marketing-course" },
];

const EMAIL_UPGRADE_MAX_LEVEL = 5;

function clampPurchasedLevels(level: number): number {
  return Math.min(EMAIL_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(level)));
}

export function getEmailPresentationLevel(upgrades: UpgradeLevels): EmailPresentationLevel {
  for (let index = EMAIL_CATALOG_STAGES.length - 1; index >= 0; index -= 1) {
    const stage = EMAIL_CATALOG_STAGES[index];
    if ((upgrades[stage.upgradeId] ?? 0) > 0) return stage.level;
  }
  return 0;
}

export function getEmailPresentationMix(upgrades: UpgradeLevels): EmailPresentationMix {
  const newLevel = getEmailPresentationLevel(upgrades);
  if (newLevel === 0) {
    return {
      previousLevel: 0,
      newLevel: 0,
      purchasedLevels: 0,
      previousCatalogShare: 0,
      newCatalogShare: 1,
    };
  }

  const stage = EMAIL_CATALOG_STAGES[newLevel - 1];
  const purchasedLevels = clampPurchasedLevels(upgrades[stage.upgradeId] ?? 0);
  const newCatalogShare = purchasedLevels / EMAIL_UPGRADE_MAX_LEVEL;
  return {
    previousLevel: (newLevel - 1) as EmailPresentationLevel,
    newLevel,
    purchasedLevels,
    previousCatalogShare: 1 - newCatalogShare,
    newCatalogShare,
  };
}

export function chooseEmailPresentationLevel(
  upgrades: UpgradeLevels,
  roll: number,
): EmailPresentationLevel {
  const mix = getEmailPresentationMix(upgrades);
  return roll < mix.newCatalogShare ? mix.newLevel : mix.previousLevel;
}
