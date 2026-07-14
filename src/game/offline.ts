import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import type { GameState, InboxMessage } from "./types";

export interface OfflineSummary {
  elapsedMs: number;
  capped: boolean;
  emailsCompleted: number;
  trialsBooked: number;
  trialsCompleted: number;
  membersEnrolled: number;
  collaboratorsRecruited: number;
  eurosEarned: number;
  contactsAcquired: number;
}

export function getOfflineLimitMs(state: GameState): number {
  const coordinationLevel = state.upgrades["multi-site-coordination"];
  const progress = Math.min(1, coordinationLevel / 5);
  return Math.round(
    GAME_CONFIG.offlineLimitMs +
      (GAME_CONFIG.offlineMaxLimitMs - GAME_CONFIG.offlineLimitMs) * progress,
  );
}

export function simulateOfflineProgress(
  state: GameState,
  now: number,
): { state: GameState; summary: OfflineSummary | null } {
  const rawElapsed = Math.max(0, now - state.lastSavedAt);
  if (rawElapsed === 0) return { state, summary: null };
  const offlineLimitMs = getOfflineLimitMs(state);
  const elapsedMs = Math.min(rawElapsed, offlineLimitMs);
  const endAt = state.lastSavedAt + elapsedMs;
  const before = state.statistics;
  let processed = state;

  for (let stepAt = state.lastSavedAt + 1_000; stepAt < endAt; stepAt += 1_000) {
    processed = gameReducer(processed, { type: "TICK", now: stepAt });
  }
  processed = gameReducer(processed, { type: "TICK", now: endAt });

  const summary: OfflineSummary = {
    elapsedMs,
    capped: rawElapsed > offlineLimitMs,
    emailsCompleted: processed.statistics.emailsSent - before.emailsSent,
    trialsBooked: processed.statistics.trialsBooked - before.trialsBooked,
    trialsCompleted: processed.statistics.trialsCompleted - before.trialsCompleted,
    membersEnrolled: processed.statistics.membersEnrolled - before.membersEnrolled,
    collaboratorsRecruited:
      processed.statistics.collaboratorsRecruited - before.collaboratorsRecruited,
    eurosEarned: processed.statistics.eurosEarned - before.eurosEarned,
    contactsAcquired: processed.statistics.contactsAcquired - before.contactsAcquired,
  };

  processed = { ...processed, lastSavedAt: now };
  if (elapsedMs < GAME_CONFIG.offlineSummaryMinMs) return { state: processed, summary: null };

  const hours = Math.floor(elapsedMs / 3_600_000);
  const minutes = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const blocked = processed.contacts.every((contact) => contact.status !== "available")
    ? " Nessuna ulteriore email: non erano disponibili contatti."
    : "";
  const message: InboxMessage = {
    id: `offline-${now.toString(36)}`,
    sender: "Segreteria automatica",
    subject: "Riepilogo attività offline",
    preview: `${hours} h ${minutes} min elaborati${summary.capped ? ` (limite di ${Math.round(offlineLimitMs / 3_600_000)} ore)` : ""}. Email ${summary.emailsCompleted}, prove ${summary.trialsCompleted}, iscritti ${summary.membersEnrolled}, collaboratori ${summary.collaboratorsRecruited}, entrate € ${Math.round(summary.eurosEarned)}, contatti ${summary.contactsAcquired}.${blocked}`,
    receivedAt: now,
    tone: "system",
    unread: true,
  };
  return { state: { ...processed, messages: [message, ...processed.messages] }, summary };
}
