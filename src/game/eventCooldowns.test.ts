import { describe, expect, it } from "vitest";
import { getAcquisitionEventDefinition } from "../content/events";
import { createInitialState } from "./engine";
import {
  createEventCooldown,
  formatEventCooldownRemaining,
  getEventCooldownProgress,
  isEventCooldownActive,
} from "./eventCooldowns";

describe("event cooldowns", () => {
  it("counts realtime cooldowns from event completion", () => {
    const state = createInitialState(1_000);
    const sparring = getAcquisitionEventDefinition("park-sparring")!;
    const cooldown = createEventCooldown(state, sparring, 2_000);

    expect(isEventCooldownActive(cooldown, state, 6_999)).toBe(true);
    expect(formatEventCooldownRemaining(cooldown, state, 4_500)).toBe("3 secondi");
    expect(getEventCooldownProgress(cooldown, state, 4_500)).toBe(50);
    expect(isEventCooldownActive(cooldown, state, 7_000)).toBe(false);
  });

  it("expires calendar cooldowns when the target game month begins", () => {
    const initial = createInitialState(1_000);
    const mele = getAcquisitionEventDefinition("local-event")!;
    const cooldown = createEventCooldown(initial, mele, 31_000);
    const nextMonth = {
      ...initial,
      school: {
        ...initial.school,
        currentMonth: initial.school.currentMonth + 1,
        nextFeeAt: 91_000,
      },
    };

    expect(formatEventCooldownRemaining(cooldown, initial, 31_000)).toBe("1 mese");
    expect(isEventCooldownActive(cooldown, initial, 61_000)).toBe(true);
    expect(isEventCooldownActive(cooldown, nextMonth, 61_000)).toBe(false);
  });

  it("formats annual cooldowns in game years", () => {
    const state = createInitialState(1_000);
    const megacon = getAcquisitionEventDefinition("megacon-genova")!;
    const cooldown = createEventCooldown(state, megacon, 2_000);

    expect(formatEventCooldownRemaining(cooldown, state, 2_000)).toBe("1 anno");
  });
});
