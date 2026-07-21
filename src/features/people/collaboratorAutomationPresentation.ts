import { getEmailBuildLength } from "../../content/emailBuild";
import { getCollaboratorProductivity } from "../../content/forms";
import { getUpgradeEffectTotal } from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { getEffectiveDamagedSwords } from "../../game/equipment";
import { selectActiveEmail } from "../../game/selectors";
import {
  getSocialContactChance,
  getSocialIncomePerMember,
  getSocialTrialChance,
} from "../../game/social";
import type { CollaboratorAssignment, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

const perSecondRateFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

function formatPerSecondRate(value: number): string {
  return value > 0 && value < 0.01
    ? "<0,01"
    : perSecondRateFormatter.format(value);
}

export interface CollaboratorAutomationPresentation {
  title: string;
  detail?: string;
  progress?: number;
  progressLabel?: string;
  durationMs?: number;
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
  if (assignment === "lessons") {
    return GAME_CONFIG.lessonImprovementIntervalMs / effectiveProductivity;
  }
  if (assignment === "social") {
    const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");
    return GAME_CONFIG.socialAutomationIntervalMs /
      (effectiveProductivity * socialMultiplier);
  }
  if (assignment === "equipment") {
    return GAME_CONFIG.equipmentRepairIntervalMs * work / effectiveProductivity;
  }
  return undefined;
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
    if (!activeEmail || activeEmail.status !== "writing") {
      return { title: "In attesa", detail: "Nessuna email in scrittura" };
    }
    const length = getEmailBuildLength(activeEmail);
    const progress = length === 0
      ? 100
      : Math.min(100, Math.round((activeEmail.revealedCharacters / length) * 100));
    return {
      title: activeEmail.subject,
      detail: "Scrittura email in corso",
      progress,
      progressLabel: `Scrittura di ${activeEmail.subject}`,
      durationMs: length / Math.max(
        Number.EPSILON,
        state.collaborators.reduce(
          (total, collaborator) => collaborator.assignment === "writing"
            ? total + getCollaboratorProductivity(collaborator, "writing")
            : total,
          0,
        ) * GAME_CONFIG.collaboratorWritingPerSecond * state.player.writingPower *
          (1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier")),
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

  if (assignment === "lessons") {
    const progress = Math.min(100, Math.floor(state.automation.lessonBuffer * 100));
    return {
      title: "Prossimo punto Arena o Stile",
      detail: state.automation.lastImprovedAthlete
        ? `Ultimo atleta migliorato: ${state.automation.lastImprovedAthlete}`
        : "Nessun atleta migliorato finora",
      progress,
      progressLabel: "Progresso miglioramento atleta",
      durationMs: getAutomationCycleDurationMs(state, "lessons"),
    };
  }

  if (assignment === "social") {
    const incomePerMember = getSocialIncomePerMember(state.school.followers);
    const cycleIncome = state.school.activeMembers * incomePerMember;
    const durationMs = getAutomationCycleDurationMs(state, "social");
    const durationSeconds = durationMs ? durationMs / 1_000 : 0;
    const incomePerSecond = durationSeconds > 0 ? cycleIncome / durationSeconds : 0;
    const trialsPerSecond = durationSeconds > 0
      ? getSocialTrialChance(state.school.followers) / durationSeconds
      : 0;
    const contactsPerSecond = durationSeconds > 0
      ? getSocialContactChance(state.school.followers) / durationSeconds
      : 0;
    return {
      title: `Rendimento: ${formatCurrency(incomePerSecond)}/s | ${formatPerSecondRate(trialsPerSecond)}/s Lezioni di prova | ${formatPerSecondRate(contactsPerSecond)}/s Nuovi contatti`,
      progress: Math.min(100, Math.floor(state.automation.socialBuffer * 100)),
      progressLabel: "Progresso ciclo pubblicitario Social",
      durationMs,
    };
  }

  if (assignment === "equipment") {
    const damagedSwords = getEffectiveDamagedSwords(state.equipment);
    if (state.equipment.wear <= 0 && damagedSwords <= 0) {
      return { title: "Usura attrezzatura: 0%", detail: "In attesa" };
    }
    const isRepairingSword = state.equipment.wear <= 0 && damagedSwords > 0;
    const progress = Math.min(
      100,
      Math.floor(
        (state.automation.equipmentBuffer /
          (isRepairingSword ? GAME_CONFIG.equipmentSwordRepairWork : 1)) *
          100,
      ),
    );
    return {
      title: isRepairingSword
        ? `Spade danneggiate: ${damagedSwords}`
        : `Usura attrezzatura: ${state.equipment.wear}%`,
      detail: isRepairingSword ? "Una spada richiede 3 cicli base" : "Riduzione usura in corso",
      progress,
      progressLabel: isRepairingSword
        ? "Progresso riparazione spada"
        : "Progresso riduzione usura",
      durationMs: getAutomationCycleDurationMs(
        state,
        "equipment",
        isRepairingSword ? GAME_CONFIG.equipmentSwordRepairWork : 1,
      ),
    };
  }

  if (assignment === "instructor") {
    return { title: "Lezioni automatiche", detail: "Gestione formazione allievi" };
  }

  return { title: "Non assegnato", detail: "Scegli un compito" };
}
