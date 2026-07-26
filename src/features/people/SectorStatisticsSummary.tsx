import { FORM_DEFINITIONS } from "../../content/forms";
import { isCourseXUnlocked } from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { getAvailableSwords } from "../../game/equipment";
import {
  getMonthlySocialIncome,
  getSocialDoubleFollowerChance,
  getSocialEventPromotionBonus,
  getSocialEventPromotionCap,
  getSocialFollowerChance,
} from "../../game/social";
import type { Collaborator, CollaboratorMasteryRole, GameState } from "../../game/types";
import { formatCurrency, formatPercent } from "../../shared/formatters";
import { getInstructorCoverageForms } from "./instructorGroupPresentation";

export interface SectorStatistic {
  label: string;
  value: string;
  detail?: string;
}

function ratio(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function formatCount(value: number): string {
  return value.toLocaleString("it-IT");
}

function getSectorStatistics(
  state: GameState,
  role: CollaboratorMasteryRole,
  collaborators: readonly Collaborator[],
): SectorStatistic[] {
  if (role === "writing") {
    if (state.unlocks.social) {
      return [
        { label: "Follower", value: formatCount(state.school.followers) },
        {
          label: "Nuovo follower",
          value: formatPercent(getSocialFollowerChance(state.upgrades)),
          detail: getSocialDoubleFollowerChance(state.upgrades) > 0
            ? `${formatPercent(getSocialDoubleFollowerChance(state.upgrades))} doppio`
            : undefined,
        },
        {
          label: "Promozione eventi",
          value: `+${formatPercent(getSocialEventPromotionBonus(
            state.school.followers,
            state.upgrades,
          ))}`,
          detail: `cap ${formatPercent(getSocialEventPromotionCap(state.upgrades))}`,
        },
        {
          label: "Sponsorizzazioni",
          value: formatCurrency(getMonthlySocialIncome(state)),
          detail: "al mese",
        },
      ];
    }

    return [
      { label: "Email inviate", value: formatCount(state.statistics.emailsSent) },
      { label: "Prove prenotate", value: formatCount(state.statistics.trialsBooked) },
      {
        label: "Conversione",
        value: formatPercent(ratio(state.statistics.trialsBooked, state.statistics.emailsSent)),
      },
      {
        label: "Caratteri automatici",
        value: formatCount(state.statistics.automatedCharacters),
      },
    ];
  }

  if (role === "events") {
    return [
      { label: "Eventi completati", value: formatCount(state.statistics.eventsCompleted) },
      { label: "Persone incontrate", value: formatCount(state.statistics.peopleMet) },
      { label: "Contatti ottenuti", value: formatCount(state.statistics.contactsAcquired) },
      {
        label: "Conversione",
        value: formatPercent(ratio(
          state.statistics.contactsAcquired,
          state.statistics.demonstrationsGiven,
        )),
      },
    ];
  }

  if (role === "equipment") {
    const availableSwords = getAvailableSwords(state.equipment);
    return [
      {
        label: "Spade libere",
        value: `${formatCount(availableSwords)}/${formatCount(state.equipment.totalSwords)}`,
      },
      {
        label: "Disponibilità",
        value: formatPercent(ratio(availableSwords, state.equipment.totalSwords)),
      },
      {
        label: "Usura",
        value: formatPercent(Math.min(1, ratio(
          state.equipment.wear,
          GAME_CONFIG.equipmentBreakLoad,
        ))),
      },
      {
        label: "Manutenzioni",
        value: formatCount(state.statistics.maintenanceCompleted),
      },
    ];
  }

  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const coveredForms = getInstructorCoverageForms(collaborators, courseXUnlocked).length;
  const availableForms = FORM_DEFINITIONS.filter(
    (definition) => courseXUnlocked || definition.id !== "course-x",
  ).length;
  return [
    { label: "Forme coperte", value: formatCount(coveredForms) },
    {
      label: "Copertura",
      value: formatPercent(ratio(coveredForms, availableForms)),
    },
    { label: "Prove completate", value: formatCount(state.statistics.trialsCompleted) },
    {
      label: "Conversione",
      value: formatPercent(ratio(
        state.statistics.membersEnrolled,
        state.statistics.trialsCompleted,
      )),
    },
  ];
}

export function SectorStatisticsSummary({
  state,
  role,
  collaborators,
}: {
  state: GameState;
  role: CollaboratorMasteryRole;
  collaborators: readonly Collaborator[];
}) {
  return getSectorStatistics(state, role, collaborators).map((statistic) => (
    <span
      className="sector-panel-stat"
      key={statistic.label}
      title={`${statistic.label}: ${statistic.value}${statistic.detail ? ` · ${statistic.detail}` : ""}`}
    >
      <strong>{statistic.value}</strong>
      <small>{statistic.label}</small>
      {statistic.detail ? <em>{statistic.detail}</em> : null}
    </span>
  ));
}
