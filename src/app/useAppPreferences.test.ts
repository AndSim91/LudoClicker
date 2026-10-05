import { describe, expect, it } from "vitest";
import { getTickStepMs } from "./useAppPreferences";

describe("display mode weight", () => {
  it("follows Onde > Outlook > Onde senza animazioni > Outlook senza animazioni", () => {
    const onde = getTickStepMs(true, false);
    const outlook = getTickStepMs(false, false);
    const ondeStill = getTickStepMs(true, true);
    const outlookStill = getTickStepMs(false, true);

    expect(onde).toBeLessThanOrEqual(outlook);
    expect(outlook).toBeLessThan(ondeStill);
    expect(ondeStill).toBeLessThan(outlookStill);
  });
});
