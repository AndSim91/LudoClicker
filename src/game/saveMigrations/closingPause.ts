import type { MigratableState } from "./types";

// The names below exist only in saves older than v114: this is the only place that reads them.
const LEGACY_BUFFER_KEY = "offlineContactBuffer";

/*
 * v114 (14/10/2026): no offline progression anywhere (Andrea). The contact buffer
 * keeps its value under its true name, and the old «Riepilogo attività offline»
 * messages, written before the game froze on closing, leave the inbox.
 */
export function migrateClosingPauseState(state: MigratableState): MigratableState {
  if (state.version !== 113) return state;
  const automation = state.automation as Record<string, unknown> | undefined;
  const nextAutomation = automation && LEGACY_BUFFER_KEY in automation
    ? (() => {
        const { [LEGACY_BUFFER_KEY]: legacy, ...rest } = automation;
        return { ...rest, contactGainBuffer: rest.contactGainBuffer ?? legacy ?? 0 };
      })()
    : automation;
  const messages = state.messages as { subject?: string; threadKey?: string }[] | undefined;
  const isLegacySummary = (message: { subject?: string; threadKey?: string }) =>
    message.threadKey === "offline" ||
    Boolean(message.subject?.includes("Riepilogo") && message.subject.includes("offline"));
  return {
    ...state,
    version: 114,
    ...(nextAutomation ? { automation: nextAutomation } : {}),
    ...(messages ? { messages: messages.filter((message) => !isLegacySummary(message)) } : {}),
  } as MigratableState;
}
