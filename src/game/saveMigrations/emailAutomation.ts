import type { MigratableState } from "./types";

export function migrateEmailAutomationState(state: MigratableState): MigratableState {
  if (state.version !== 48) return state;

  return {
    ...state,
    version: 49,
    automation: state.automation
      ? {
          ...state.automation,
          autoSendEmails: state.automation.autoSendEmails ?? true,
        }
      : state.automation,
  };
}
