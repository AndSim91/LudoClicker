import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AGONIST_COURSE_LOGO } from "../../content/formLogos";
import { AggregatedTeachingBar, LAP_BAR_MIN_COURSES } from "./AggregatedTeachingBar";
import { groupInstructorTeachingEntries } from "./aggregatedTeachingPresentation";
import type { InstructorTeachingEntry } from "./instructorGroupPresentation";

function entry(
  id: string,
  formId: InstructorTeachingEntry["training"]["formId"],
): InstructorTeachingEntry {
  return {
    id,
    displayName: id,
    instructorId: "instructor",
    training: {
      formId,
      startedAt: 1_000,
      completesAt: 2_000,
      status: "running",
    },
  };
}

describe("aggregated teaching groups", () => {
  it("keeps one segmented bar for each taught Form", () => {
    const groups = groupInstructorTeachingEntries([
      entry("uno", "form-1"),
      entry("due", "course-x"),
      entry("tre", "form-1"),
    ]);

    expect(groups.map((group) => [group.courseId, group.entries.length])).toEqual([
      ["form-1", 2],
      ["course-x", 1],
    ]);
  });
});

describe("AggregatedTeachingBar", () => {
  it("renders no placeholder when no course is running", () => {
    const view = render(
      <AggregatedTeachingBar
        entries={[]}
        now={1_500}
        agonistCourseUnlocked={false}
        variant="internal-instructor"
      />,
    );

    expect(view.container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the dedicated Corso Agonisti logo instead of the trophy", () => {
    render(
      <AggregatedTeachingBar
        entries={[
          {
            id: "athlete-1",
            displayName: "Atleta Agonista",
            instructorId: "instructor-1",
            training: {
              formId: "agonist-course",
              startedAt: 1_000,
              completesAt: 31_000,
              status: "running",
              instructorId: "instructor-1",
            },
          },
        ]}
        now={16_000}
        agonistCourseUnlocked
      />,
    );

    expect(screen.getByRole("img", {
      name: "Corso Agonisti — emblema generato",
    })).toHaveAttribute("src", AGONIST_COURSE_LOGO.assetPath);
    expect(screen.getByText("Corso Agonisti")).toBeVisible();
    expect(screen.getByRole("progressbar", {
      name: "Corso Agonisti: 1 corso",
    })).toBeVisible();
  });

  it("keeps one segment per course below eight courses of a Forma", () => {
    const entries = Array.from(
      { length: LAP_BAR_MIN_COURSES - 1 },
      (_, index) => entry(`student-${index}`, "form-1"),
    );
    const view = render(
      <AggregatedTeachingBar entries={entries} now={1_500} agonistCourseUnlocked />,
    );

    expect(screen.getByRole("progressbar", { name: "Forma 1: 7 corsi" })).not.toHaveClass("is-lap");
    expect(view.container.querySelectorAll(".aggregated-teaching-segment")).toHaveLength(7);
  });

  it("loops one bar with the course length from eight courses of a Forma", () => {
    const entries = Array.from(
      { length: 25 },
      (_, index) => entry(`student-${index}`, "form-1"),
    );
    const view = render(
      <AggregatedTeachingBar entries={entries} now={1_500} agonistCourseUnlocked />,
    );

    const lap = screen.getByRole("progressbar", { name: "Forma 1: 25 allievi" });
    expect(lap).toHaveClass("is-lap");
    expect(lap.querySelector("span")).toHaveStyle({ "--lap-duration": "4000ms" });
    expect(screen.getByText("25 allievi")).toBeVisible();
    expect(view.container.querySelectorAll(".aggregated-teaching-segment")).toHaveLength(0);
  });

  it("counts the graduates of each lap (Outlook: still bar, a timer closes the lap)", () => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = "light";
    try {
      const entries = Array.from(
        { length: 10 },
        (_, index) => entry(`student-${index}`, "form-1"),
      );
      const view = render(
        <AggregatedTeachingBar entries={entries} now={1_500} agonistCourseUnlocked />,
      );
      // Two courses end on time, then the lap (never under four seconds) closes.
      view.rerender(
        <AggregatedTeachingBar entries={entries.slice(2)} now={2_000} agonistCourseUnlocked />,
      );
      act(() => {
        vi.advanceTimersByTime(4_000);
      });

      expect(screen.getByText("2 diplomati nell'ultimo giro")).toBeInTheDocument();
      expect(screen.getByRole("progressbar", { name: "Forma 1: 8 allievi" }))
        .toHaveAttribute("aria-valuetext", "8 allievi · 2 diplomati nell'ultimo giro");
    } finally {
      delete document.documentElement.dataset.theme;
      vi.useRealTimers();
    }
  });
});

type RuntimeWithProcess = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const runTeachingRenderBenchmark =
  (globalThis as RuntimeWithProcess).process?.env?.RUN_TEACHING_RENDER_BENCHMARK === "1";

describe.runIf(runTeachingRenderBenchmark)("AggregatedTeachingBar scale benchmark", () => {
  it("measures a dashboard update with 378 simultaneous courses", () => {
    const courseCounts = [
      ["agonist-course", 306],
      ["form-2", 21],
      ["form-1", 9],
      ["course-y", 3],
      ["form-7", 39],
    ] as const;
    const entries = courseCounts.flatMap(([formId, count]) =>
      Array.from({ length: count }, (_, index) => {
        const teachingEntry = entry(`${formId}-${index}`, formId);
        return {
          ...teachingEntry,
          training: {
            ...teachingEntry.training,
            startedAt: 1_000 + index,
            completesAt: 101_000 + index,
          },
        };
      }),
    );
    const view = render(
      <AggregatedTeachingBar
        entries={entries}
        now={51_000}
        agonistCourseUnlocked
      />,
    );
    const initialNodeCount = view.container.querySelectorAll("*").length;
    const startedAt = performance.now();

    for (let update = 1; update <= 20; update += 1) {
      view.rerender(
        <AggregatedTeachingBar
          entries={entries}
          now={51_000 + update * 250}
          agonistCourseUnlocked
        />,
      );
    }

    console.info("TEACHING_RENDER_SCALE_REPORT", JSON.stringify({
      courses: entries.length,
      domNodes: initialNodeCount,
      twentyUpdatesMs: Number((performance.now() - startedAt).toFixed(3)),
    }));
    expect(screen.getByText("306 corsi")).toBeVisible();
  });
});
