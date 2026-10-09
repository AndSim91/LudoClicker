import { describe, expect, it } from "vitest";
import { computeSignalRoute, pickSignalRegion, pointAlong } from "./signalRoute";

const viewport = { width: 1280, height: 800 };
const card = { left: 380, top: 190, right: 900, bottom: 530 };

describe("signal route", () => {
  it("points at the most specific region", () => {
    expect(pickSignalRegion(["title", "contacts-counter"])).toBe("contacts-counter");
    expect(pickSignalRegion(["navigation", "events-navigation"])).toBe("events-navigation");
    expect(pickSignalRegion(["main"])).toBeUndefined();
  });

  it("leaves from the top edge for an element above the card and ends under it", () => {
    const route = computeSignalRoute(card, { left: 58, top: 15, right: 140, bottom: 30 }, 222, viewport)!;
    expect(route.points[0]).toEqual([414, 190]);
    expect(route.points.at(-1)).toEqual([99, 37]);
    // Straight runs and 45° corners only, never inside the card.
    for (const [index, [x, y]] of route.points.entries()) {
      if (index > 0) {
        const [px, py] = route.points[index - 1];
        expect(px === x || py === y || Math.abs(px - x) === Math.abs(py - y)).toBe(true);
      }
      expect(x > card.left && x < card.right && y > card.top && y < card.bottom).toBe(false);
    }
  });

  it("leaves from the side at the speaker's badge for an element beside the card", () => {
    const route = computeSignalRoute(card, { left: 4, top: 300, right: 54, bottom: 360 }, 222, viewport)!;
    expect(route.points[0]).toEqual([380, 222]);
    expect(route.points.at(-1)).toEqual([61, 330]);
  });

  it("draws nothing for huge, hidden or covered elements", () => {
    expect(computeSignalRoute(card, { left: 0, top: 0, right: 1280, bottom: 800 }, 222, viewport)).toBeNull();
    expect(computeSignalRoute(card, { left: 0, top: 0, right: 0, bottom: 0 }, 222, viewport)).toBeNull();
    expect(computeSignalRoute(card, { left: 500, top: 300, right: 560, bottom: 330 }, 222, viewport)).toBeNull();
  });

  it("walks the trace for the data packets", () => {
    expect(pointAlong([[0, 0], [10, 0], [10, 10]], 0.75)).toEqual([10, 5]);
  });
});
