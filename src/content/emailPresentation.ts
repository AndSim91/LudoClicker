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
    label: "Bozza disastrata",
    description: "Una mail breve, simpatica e piena di refusi, errori e italiano creativo.",
  },
  1: {
    label: "Correzione grammaticale",
    description: "Gli errori spariscono, ma le battute e l'energia della bozza restano.",
  },
  2: {
    label: "Email professionale",
    description: "Testo ordinato e professionale con firma completa, ancora senza HTML.",
  },
  3: {
    label: "Card della lezione",
    description: "La struttura migliora e compaiono pulsanti visivi che non portano da nessuna parte.",
  },
  4: {
    label: "Dettagli della prova",
    description: "Il testo si allunga e racconta il percorso LudoSport, le Forme e le armi sportive.",
  },
  5: {
    label: "Contatti",
    description: "La stessa idea diventa una mail più fluida, elegante e persuasiva.",
  },
  6: {
    label: "Sezione video",
    description: "Un testo lungo, entusiasta e curioso spiega perché vale la pena cominciare.",
  },
  7: {
    label: "Mail finale HTML",
    description: "Il massimo splendore: testo approfondito, gerarchia visiva e grafica da campagna.",
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
