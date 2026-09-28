import { expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import { diffFeedback, takeFeedbackSnapshot } from "./feedbackEvents";

it("celebrates new members, monthly fees, flow steps and perfect phrases", () => {
  const before = createInitialState(0, "Test");
  const contact = { ...before.contacts[0], status: "enrolled" as const, rarity: "legendary" as const };
  const after = {
    ...before,
    contacts: [contact, ...before.contacts.slice(1)],
    school: { ...before.school, currentMonth: before.school.currentMonth + 1 },
    statistics: { ...before.statistics, eurosEarned: before.statistics.eurosEarned + 480 },
    player: { ...before.player, flow: { meter: 55, updatedAt: 0 }, perfectPhrases: 1 },
  };
  const events = diffFeedback(takeFeedbackSnapshot(before), takeFeedbackSnapshot(after), after.contacts);
  expect(events.map((event) => [event.kind, event.text])).toEqual([
    ["member", "+1 iscritto · +20 €"],
    ["fees", "+480 €"],
    ["flow", "Flusso ×3"],
    ["perfect", "Frase perfetta!"],
  ]);
  expect(events[0].rarity).toBe("legendary");
  expect(diffFeedback(takeFeedbackSnapshot(after), takeFeedbackSnapshot(after), after.contacts)).toEqual([]);
});
