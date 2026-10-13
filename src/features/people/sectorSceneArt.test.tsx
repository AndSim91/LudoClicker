import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectorSceneArt } from "./sectorSceneArt";

describe("Eventi scene", () => {
  it("shows the black roll-up from level 1 and the poster from level 3 of «Roll-up delle Onde»", () => {
    const scene = (level: number) => {
      const { container, unmount } = render(<SectorSceneArt role="events" rollupLevel={level} />);
      const result = [!!container.querySelector('rect[fill="#0b0d10"]'), !!container.querySelector("#events-rollup-clip")];
      unmount();
      return result;
    };
    expect(scene(0)).toEqual([false, false]);
    expect(scene(2)).toEqual([true, false]);
    expect(scene(3)).toEqual([true, true]);
  });
});
