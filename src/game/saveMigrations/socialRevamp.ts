import { GAME_CONFIG } from "../config";
import type { Collaborator, CollaboratorMastery, GameState } from "../types";
import type { MigratableState } from "./types";

const LEGACY_SOCIAL_UPGRADE_IDS = [
  "updated-page",
  "editorial-calendar",
  "lesson-photos",
  "demo-video",
  "weekly-column",
  "viral-post",
  "professional-management",
] as const;

const NEW_SOCIAL_UPGRADE_IDS = [
  "social-content-synthesis",
  "social-editorial-plan",
  "social-content-distribution",
  "social-sponsorships",
] as const;

type LegacyMastery = Partial<CollaboratorMastery> & {
  social?: number;
  lessons?: number;
};
type LegacyCollaborator = Omit<Collaborator, "assignment" | "mastery"> & {
  assignment: Collaborator["assignment"] | "social";
  mastery?: LegacyMastery;
};

function withoutLegacySocialMastery(mastery: LegacyMastery | undefined): CollaboratorMastery {
  return {
    writing: Math.max(0, mastery?.writing ?? 0),
    events: Math.max(0, mastery?.events ?? 0),
    equipment: Math.max(0, mastery?.equipment ?? 0),
    instructor: Math.max(0, mastery?.instructor ?? 0, mastery?.lessons ?? 0),
  };
}

export function migrateSocialRevampState(state: MigratableState): MigratableState {
  if (state.version !== 50) return state;

  const upgrades: Record<string, number> = { ...(state.upgrades ?? {}) };
  for (const id of LEGACY_SOCIAL_UPGRADE_IDS) delete upgrades[id];
  for (const id of NEW_SOCIAL_UPGRADE_IDS) upgrades[id] = 0;

  const activeMembers = Math.max(0, state.school?.activeMembers ?? 0);
  const fame = Math.max(0, state.school?.historicMembers ?? 0);
  const socialUnlocked = activeMembers >= GAME_CONFIG.socialUnlockMembers;
  const legacyStatistics = (state.statistics ?? {}) as Partial<GameState["statistics"]> & {
    socialTrials?: number;
    socialCampaigns?: number;
  };
  const statistics = { ...legacyStatistics };
  delete statistics.socialTrials;
  delete statistics.socialCampaigns;
  const legacyAutomation = (state.automation ?? {}) as Partial<GameState["automation"]> & {
    socialBuffer?: number;
  };
  const automation = { ...legacyAutomation };
  delete automation.socialBuffer;

  return {
    ...state,
    version: 51,
    school: state.school
      ? {
          ...state.school,
          followers: socialUnlocked ? fame : 0,
        }
      : state.school,
    unlocks: state.unlocks
      ? { ...state.unlocks, social: socialUnlocked }
      : state.unlocks,
    collaborators: ((state.collaborators ?? []) as LegacyCollaborator[]).map(
      (collaborator) => ({
        ...collaborator,
        assignment: null,
        mastery: withoutLegacySocialMastery(collaborator.mastery),
      }),
    ) as GameState["collaborators"],
    legendaryCollaborators: state.legendaryCollaborators
      ? {
          ...state.legendaryCollaborators,
          retainedProgress: Object.fromEntries(
            Object.entries(state.legendaryCollaborators.retainedProgress ?? {}).map(
              ([profileId, progress]) => [
                profileId,
                progress
                  ? {
                      ...progress,
                      mastery: withoutLegacySocialMastery(
                        progress.mastery as LegacyMastery | undefined,
                      ),
                    }
                  : progress,
              ],
            ),
          ),
        }
      : state.legendaryCollaborators,
    upgrades: upgrades as GameState["upgrades"],
    automation: {
      ...automation,
      socialContentBuffer: 0,
    } as GameState["automation"],
    statistics: {
      ...statistics,
      socialContacts: 0,
      socialContentCycles: 0,
      socialFollowersGained: 0,
    } as GameState["statistics"],
  };
}
