export const INITIAL_SAVE_COMPATIBILITY_VERSION = 1;

export const GAME_CONFIG = {
  version: 100,
  // Increment this only when a change cannot preserve the meaning of an old save.
  // A different value forces a fresh game instead of weakening the game design
  // to keep an incompatible save alive.
  saveCompatibilityVersion: INITIAL_SAVE_COMPATIBILITY_VERSION,
  initialContacts: 5,
  initialSwords: 6,
  profileNameMaxLength: 80,
  rarityOverviewEmailsSent: 10,
  socialUnlockMembers: 35,
  tournamentUnlockMembers: 6,
  tournamentMinimumMembers: 6,
  guaranteedAndreaContactPosition: 10,
  collaboratorAggregateUnlockCount: 8,
  conversionGuaranteeFailures: 4,
  emailOutcomeMinMs: 10_000,
  emailOutcomeMaxMs: 10_000,
  trialWaitMinMs: 30_000,
  trialWaitMaxMs: 30_000,
  trialDurationMs: 15_000,
  dayNotificationVisibilityMs: 10_000,
  progressUpdateIntervalMs: 250,
  gameTickMs: 1_000,
  // ponytail: scadenze vicine si risolvono nello stesso passo (al più 250 ms dopo); passi più fitti costavano CPU senza cambiare il gioco.
  minTickStepMs: 250,
  minimumTrainingDurationMs: 1_000,
  instructorTrainingWhileTeachingDurationMultiplier: 3,
  sendDelayMs: 350,
  maxAutomatedEmailsPerStep: 50,
  // Flusso (manual writing rhythm): see writingRhythm.ts.
  flowMeterMax: 100,
  flowGainPerInput: 2,
  flowDrainPerSecond: 5,
  flowGraceMs: 1_500,
  flowPauseDrainPerSecond: 40,
  flowMaxMultiplier: 5,
  // Frase perfetta: chance per manual input, raised by Scrittura upgrades.
  perfectPhraseMaxChance: 0.05,
  perfectPhraseMaxCharacters: 60,
  monthlyMemberFee: 40,
  // The base fee grows with the record of active members of the current school
  // and never goes back down: 40 € up to ×4 at 500 members.
  membershipFeeTiers: [
    { members: 25, fee: 50 },
    { members: 50, fee: 60 },
    { members: 100, fee: 80 },
    { members: 250, fee: 120 },
    { members: 500, fee: 160 },
  ],
  monthlyMemberFormBonus: 5,
  monthlyMemberInstructorBonus: 10,
  monthlyMemberTechnicianBonus: 20,
  enrollmentBonus: 20,
  shortGoalActivationBalance: 10_000,
  shortGoalReactivationDelayMs: 60_000,
  gameMonthMs: 60_000,
  secretLegendaryTrialDurationMs: 30_000,
  tutorialSparringDurationMs: 5_000,
  tutorialSparringMinimumContacts: 1,
  equipmentMaintenanceCostPerLoad: 2,
  equipmentDamagedSwordRepairCost: 250,
  equipmentAutomaticCostFactor: 0.75,
  equipmentLoadPerTrial: 2,
  equipmentLoadPerSecretLegendaryTrial: 40,
  equipmentLoadPerAgonistCourse: 20,
  equipmentBreakLoad: 100,
  eventWearMultiplier: 1,
  eventZeroContactProtectionCollaboratorThreshold: 4,
  eventContactProtectedActiveMembers: 10,
  eventContactEasyMarketMembers: 1_000,
  equipmentMaximumUpgradeWearReduction: 0.5,
  equipmentMaximumEventMasteryWearReduction: 0.25,
  officialSwordCost: 330,
  legendaryEnrollmentChancePerFailure: 0.03,
  formSevenDepartureChance: {
    common: 0.025,
    rare: 0.005,
    "ultra-rare": 0.0025,
    legendary: 0,
  },
  departureChancePerFoundedSchool: 0.005,
  collaboratorWritingPerSecond: 5,
  socialEmailWritingShare: 0.95,
  socialContentShareWhileWriting: 0.05,
  technicalArenaBaseCost: 500,
  technicalArenaDurationsMs: [120_000, 100_000, 80_000, 60_000, 40_000],
  agonistCourseBaseCost: 1_000,
  agonistCourseDurationMs: 60_000,
  lessonImprovementIntervalMs: 60_000,
  athleticPreparationFavoriteChance: 0.05,
  socialBaseContentCharacters: 100_000,
  socialBaseFollowerChance: 0.5,
  socialDoubleFollowerChance: 0.05,
  socialEventPromotionPerFollower: 0.00005,
  socialBaseFollowerValue: 0.1,
  equipmentRepairIntervalMs: 1_500,
  equipmentSwordRepairWork: 150,
  narrativeEventMinMs: 120_000,
  narrativeEventMaxMs: 300_000,
  narrativeHistoryLimit: 30,
  narrativeNegativeStreakLimit: 2,
  // Prestige: one national title (Arena or Style) opens the foundation of a new school.
  prestigeNationalTitles: 1,
  // Reputazione di rete (src/game/reputation.ts): +20% of the base value per point.
  reputationStep: 0.2,
  // The national title that unlocks the prestige is worth one point by itself.
  reputationNationalTitlePoints: 2,
  // Champion's Arena, Reptile/Superba and Chronicles won by the school left behind.
  reputationTournamentPoints: 2,
  // Fama points = ⌊√(Fama / divisor)⌋: 128 = 200 / 1,25², so 1,25 × √(Fama / 200) with exact thresholds.
  reputationFameDivisor: 128,
  reputationUpgradeMaxLevel: 50,
  // Rent value of a school left behind: members × base fee × this share.
  networkRentValueShare: 0.1,
  // Each Reputation point spent on the rent locks this share of that value.
  networkRentPointShare: 0.1,
  // Schools left behind kept on the map of the network: the Sede madre and the latest ones.
  networkMapSchoolsLimit: 50,
  saveIntervalMs: 60_000,
  recentEmailsLimit: 500,
  /** Available contacts kept as objects; the ordinary ones beyond it become counters. */
  materialAvailableContactsLimit: 100,
  /** Enrolled members kept as objects; the ordinary ones beyond it are grouped. */
  materialEnrolledMembersLimit: 2_000,
  recentCompletedTrialsLimit: 500,
  recentMissedTournamentsLimit: 48,
  chroniclesTeamSize: 6,
  chroniclesLegendaryFameReward: 500,
  reptileVenueCost: 10_000,
  // Cancelling gives back this share of the venue.
  reptileCancelRefundShare: 0.5,
  // Share of their power the sectors give to the bars; idle people give everything.
  reptilePreparationShare: 0.5,
  // Collaborators without a sector help the bar furthest behind at half value.
  reptileUnassignedShare: 0.5,
  // A bar filled in this many game months scores 100; slower bars score less.
  reptileExcellentMonths: 3,
  // «La giornata degli imprevisti»: maximum bonus on the resa, reached at this
  // share of the perfect day's points (every trouble solved, one long series).
  reptileMinigameMaxBonusPercent: 25,
  reptileMinigameFullScoreShare: 0.9,
  // With no free sword at all the resa loses this share; linear per missing sword.
  reptileMaxSwordMalus: 0.5,
  reptileSwordWear: 20,
  reptileMaximumGadgetGrossPerTeam: 1_000,
  // Reptile fame level at which the Open becomes, for good, the Torneo della Superba.
  superbaReptileFameLevel: 1,
  superbaDifficultyMultiplier: 1.25,
} as const;

export function getTechnicalArenaDurationMs(level: number): number {
  const durations = GAME_CONFIG.technicalArenaDurationsMs;
  const index = Math.max(0, Math.min(durations.length - 1, Math.floor(level) - 1));
  return durations[index] ?? durations[0];
}
