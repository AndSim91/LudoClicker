import type { GameState } from "./types";

export function markMessageRead(state: GameState, messageId: string): GameState {
  if (!state.messages.some((message) => message.id === messageId && message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId ? { ...message, unread: false } : message,
    ),
  };
}

export function markAllMessagesRead(state: GameState): GameState {
  if (!state.messages.some((message) => message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) => ({ ...message, unread: false })),
  };
}
