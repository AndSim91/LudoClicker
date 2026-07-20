import { getEmailBuildLength } from "../../content/emailBuild";
import { GAME_CONFIG } from "../../game/config";
import { getEffectiveDamagedSwords } from "../../game/equipment";
import { selectActiveEmail } from "../../game/selectors";
import {
  getSocialContactChance,
  getSocialIncomePerMember,
  getSocialTrialChance,
} from "../../game/social";
import type { CollaboratorAssignment, GameState } from "../../game/types";
import { formatCurrency, formatPercent } from "../../shared/formatters";

export interface CollaboratorAutomationPresentation {
  title: string;
  detail?: string;
  progress?: number;
  progressLabel?: string;
}

function getTimedProgress(startedAt: number, completesAt: number, now: number): number {
  const duration = completesAt - startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, Math.round(((now - startedAt) / duration) * 100)));
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
    };
  }

  if (assignment === "social") {
    const incomePerMember = getSocialIncomePerMember(state.school.followers);
    return {
      title: `Prossimo rendimento · ${formatCurrency(
        state.school.activeMembers * incomePerMember,
      )}`,
      detail: `Ciclo base ${GAME_CONFIG.socialAutomationIntervalMs / 1_000} s · ${formatPercent(getSocialTrialChance(state.school.followers))} prova · ${formatPercent(getSocialContactChance(state.school.followers))} nuovo contatto`,
      progress: Math.min(100, Math.floor(state.automation.socialBuffer * 100)),
      progressLabel: "Progresso ciclo pubblicitario Social",
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
    };
  }

  if (assignment === "instructor") {
    return { title: "Lezioni automatiche", detail: "Gestione formazione allievi" };
  }

  return { title: "Non assegnato", detail: "Scegli un compito" };
}
