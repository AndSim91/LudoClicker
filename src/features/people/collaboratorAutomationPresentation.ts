import { getEmailBuildLength } from "../../content/emailBuild";
import { getCollaboratorProductivity } from "../../content/forms";
import { getUpgradeEffectTotal } from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import {
  getEffectiveDamagedSwords,
  getEquipmentAutomaticRepairTarget,
} from "../../game/equipment";
import { selectActiveEmail } from "../../game/selectors";
import { GADGET_DEFINITIONS } from "../../content/gadgets";
import {
  getGadgetWorkDurationMs,
  getGadgetWorkProgress,
} from "../../game/gadgetEconomy";
import {
  getMonthlySocialIncome,
  getSocialContentCharacters,
  getSocialEventPromotionBonus,
} from "../../game/social";
import type { CollaboratorAssignment, GameState } from "../../game/types";
import { formatCurrency, formatPercent } from "../../shared/formatters";

export interface CollaboratorAutomationPresentation {
  title: string;
  detail?: string;
  progress?: number;
  progressLabel?: string;
  durationMs?: number;
  inactive?: boolean;
}

function getTimedProgress(startedAt: number, completesAt: number, now: number): number {
  const duration = completesAt - startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, ((now - startedAt) / duration) * 100));
}

function getAutomationCycleDurationMs(
  state: GameState,
  assignment: Exclude<CollaboratorAssignment, null>,
  work = 1,
): number | undefined {
  const productivity = state.collaborators.reduce(
    (total, collaborator) => collaborator.assignment === assignment
      ? total + getCollaboratorProductivity(collaborator, assignment)
      : total,
    0,
  );
  if (productivity <= 0) return undefined;
  const automationMultiplier = 1 + getUpgradeEffectTotal(
    state.upgrades,
    "automationMultiplier",
  );
  const effectiveProductivity = productivity * automationMultiplier;
  if (assignment === "equipment") {
    return GAME_CONFIG.equipmentRepairIntervalMs * work / effectiveProductivity;
  }
  return undefined;
}

function getProjectedEquipmentProgress({
  buffer,
  requiredWork,
  cycleDurationMs,
  lastProcessedAt,
  now,
}: {
  buffer: number;
  requiredWork: number;
  cycleDurationMs: number | undefined;
  lastProcessedAt: number;
  now: number;
}): number {
  const elapsedSinceEngineTick = Math.min(
    GAME_CONFIG.gameTickMs,
    Math.max(0, now - lastProcessedAt),
  );
  const projectedWork = cycleDurationMs
    ? elapsedSinceEngineTick / cycleDurationMs
    : 0;
  return Math.min(
    100,
    Math.max(0, ((buffer / requiredWork) + projectedWork) * 100),
  );
}

function getWritingAutomationRate(state: GameState, workShare = 1): number {
  const productivity = state.collaborators.reduce(
    (total, collaborator) => collaborator.assignment === "writing"
      ? total + getCollaboratorProductivity(collaborator, "writing")
      : total,
    0,
  );
  return productivity *
    GAME_CONFIG.collaboratorWritingPerSecond *
    state.player.writingPower *
    (1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier")) *
    workShare;
}

export function getSocialContentAutomationPresentation(
  state: GameState,
  emailWriting: boolean,
): CollaboratorAutomationPresentation {
  const requiredCharacters = getSocialContentCharacters(state.upgrades);
  const progress = Math.min(
    100,
    state.automation.socialContentBuffer / requiredCharacters * 100,
  );
  const writingRate = getWritingAutomationRate(
    state,
    emailWriting ? GAME_CONFIG.socialContentShareWhileWriting : 1,
  );
  return {
    title: "Contenuti Social",
    detail: [
      `+${formatPercent(getSocialEventPromotionBonus(
        state.school.followers,
      ))} Eventi`,
      `${formatCurrency(getMonthlySocialIncome(state))}/mese`,
    ].filter(Boolean).join(" · "),
    progress,
    progressLabel: "Produzione dei prossimi contenuti Social",
    durationMs: writingRate > 0
      ? requiredCharacters / writingRate * 1_000
      : undefined,
  };
}

export function getEmailAutomationPresentation(
  state: GameState,
  activeEmail: ReturnType<typeof selectActiveEmail>,
): CollaboratorAutomationPresentation {
  if (!activeEmail) {
    return {
      title: "Scrittura email",
      detail: "Nessuna email da scrivere",
      inactive: true,
    };
  }
  const activity = getCollaboratorAutomationPresentation({
    state,
    collaboratorId: "",
    assignment: "writing",
    now: state.automation.lastProcessedAt,
    activeEmail,
  });
  return {
    ...activity,
    title: "Scrittura email",
    detail: `${activeEmail.subject} · ${activity.detail ?? "Email in lavorazione"}`,
  };
}

export function getCollaboratorAutomationPresentation({
  state,
  collaboratorId,
  assignment,
  now,
  activeEmail,
}: {
  state: GameState;
  collaboratorId: string;
  assignment: CollaboratorAssignment;
  now: number;
  activeEmail: ReturnType<typeof selectActiveEmail>;
}): CollaboratorAutomationPresentation {
  if (assignment === "writing") {
    if (activeEmail?.status === "readyToSend") {
      return {
        title: activeEmail.subject,
        detail: "Mail completa · in attesa dell'invio del giocatore",
        progress: 100,
        progressLabel: `Scrittura di ${activeEmail.subject} completata`,
      };
    }
    if (!activeEmail || activeEmail.status !== "writing") {
      if (activeEmail) {
        return {
          title: activeEmail.subject,
          detail: state.unlocks.social
            ? "Invio email in corso · contenuti Social attivi"
            : "Invio email in corso",
        };
      }
      if (!state.unlocks.social) {
        return { title: "In attesa", detail: "Nessuna email in scrittura" };
      }
      return getSocialContentAutomationPresentation(state, false);
    }
    const length = getEmailBuildLength(activeEmail);
    const progress = length === 0
      ? 100
      : Math.min(100, Math.round((activeEmail.revealedCharacters / length) * 100));
    return {
      title: activeEmail.subject,
      detail: "Scrittura email in corso...",
      progress,
      progressLabel: `Scrittura di ${activeEmail.subject}`,
      durationMs: length / Math.max(
        Number.EPSILON,
        getWritingAutomationRate(
          state,
          state.unlocks.social ? GAME_CONFIG.socialEmailWritingShare : 1,
        ),
      ) * 1_000,
    };
  }

  if (assignment === "events") {
    const event = state.acquisitionEvents.find((candidate) =>
      candidate.status === "running" && candidate.collaboratorId === collaboratorId
    );
    if (!event) return { title: "In attesa", detail: "Nessun evento assegnato" };
    return {
      title: event.title,
      detail: event.location,
      progress: getTimedProgress(event.startedAt, event.resolvesAt, now),
      progressLabel: event.title,
      durationMs: event.resolvesAt - event.startedAt,
    };
  }

  if (assignment === "equipment") {
    const damagedSwords = getEffectiveDamagedSwords(state.equipment);
    if (state.equipment.wear <= 0 && damagedSwords <= 0) {
      return { title: "In attesa", detail: "Attrezzatura in ordine" };
    }
    const repairTarget = getEquipmentAutomaticRepairTarget(state.equipment);
    if (!repairTarget) {
      return {
        title: "In attesa",
        detail: "Tutte le spade sane sono in uso",
      };
    }
    const isRepairingSword = repairTarget === "sword";
    const requiredWork = isRepairingSword ? GAME_CONFIG.equipmentSwordRepairWork : 1;
    const durationMs = getAutomationCycleDurationMs(state, "equipment", requiredWork);
    const progress = getProjectedEquipmentProgress({
      buffer: state.automation.equipmentBuffer,
      requiredWork,
      cycleDurationMs: durationMs,
      lastProcessedAt: state.automation.lastProcessedAt,
      now,
    });
    return {
      title: isRepairingSword
        ? `Spade danneggiate: ${damagedSwords}`
        : `Usura attrezzatura: ${Math.round(state.equipment.wear)}`,
      detail: isRepairingSword
        ? "Riparazione spade in corso..."
        : "Cura dell'attrezzatura in corso...",
      progress,
      progressLabel: isRepairingSword
        ? "Progresso riparazione spada"
        : "Progresso riduzione carico",
      durationMs,
    };
  }

  if (assignment === "instructor") {
    return { title: "Lezioni automatiche", detail: "Gestione formazione allievi" };
  }

  if (assignment === "gadget") {
    const work = state.gadgets.activeWork;
    if (work) {
      const definition = GADGET_DEFINITIONS[work.productId];
      const progress = getGadgetWorkProgress(state) ?? 0;
      return {
        title: work.kind === "development"
          ? `Progetto ${definition.name}`
          : `Revisione ${definition.name}`,
        detail: progress > 0 ? "Lavorazione in corso..." : "In attesa di avanzamento",
        progress,
        progressLabel: work.kind === "development"
          ? `Sviluppo di ${definition.name}`
          : `Revisione di ${definition.name}`,
        durationMs: getGadgetWorkDurationMs(state, work.productId, work.kind),
      };
    }
    const minigame = state.gadgets.minigame;
    if (minigame) {
      return {
        title: minigame.status === "result" ? "Qualità definita" : "Prototipo pronto",
        detail: `${GADGET_DEFINITIONS[minigame.productId].name} · completa la prova qualità`,
        progress: minigame.status === "result" ? 100 : undefined,
      };
    }
    const acceptedProducts = Object.values(state.gadgets.products).filter(
      (product) => product.accepted,
    );
    const productsInSale = acceptedProducts.filter(
      (product) => product.quality > 0,
    ).length;
    if (productsInSale > 0) {
      return {
        title: "Vendita del catalogo",
        detail: `${productsInSale} ${productsInSale === 1 ? "prodotto attivo" : "prodotti attivi"}`,
      };
    }
    return acceptedProducts.length > 0
      ? {
          title: "In attesa",
          detail: "Nessun prodotto vendibile",
        }
      : { title: "In attesa", detail: "Nessun progetto Gadget attivo" };
  }

  return { title: "Non assegnato", detail: "Scegli un compito" };
}
