import { useLayoutEffect, useState, type RefObject } from "react";
import type { TutorialRegionId } from "../../content/tutorialScenes";
import { motionReduced } from "../../shared/motion";
import { REGION_SELECTORS } from "./tutorialRegions";
import { computeSignalRoute, pickSignalRegion, pointAlong, type Box, type SignalRoute } from "./signalRoute";
import type { TutorialVoiceId } from "./tutorialVoices";

const PACKETS = [0.22, 0.5, 0.78];

const toBox = (rect: DOMRect): Box => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });

/**
 * «Segnale» (09/10/2026): the trace from the card to the element the step
 * talks about. Measured only when the step changes, the window resizes, the
 * page scrolls or nodes come and go; one SVG, no per-frame work. In Onde three
 * data packets travel along it (still with reduced motion); in Outlook it is a
 * thin grey line with no packets.
 */
export function TutorialSignal({
  regionIds,
  cardRef,
  voice,
}: {
  regionIds: readonly TutorialRegionId[];
  cardRef: RefObject<HTMLElement | null>;
  voice: TutorialVoiceId;
}) {
  const regionId = pickSignalRegion(regionIds);
  const [route, setRoute] = useState<SignalRoute | null>(null);

  useLayoutEffect(() => {
    if (!regionId) return undefined;
    let frame = 0;
    let lastKey = "";
    let pointed: HTMLElement | null = null;
    const point = (element: HTMLElement | null) => {
      if (pointed === element) return;
      pointed?.removeAttribute("data-tutorial-pointer");
      element?.setAttribute("data-tutorial-pointer", "true");
      pointed = element;
    };
    const measure = () => {
      frame = 0;
      if (typeof window === "undefined") return;
      const card = cardRef.current;
      const target = document.querySelector<HTMLElement>(REGION_SELECTORS[regionId]);
      const anchor = card?.querySelector(".tutorial-monogram")?.getBoundingClientRect();
      const next = card && target
        ? computeSignalRoute(
          toBox(card.getBoundingClientRect()),
          toBox(target.getBoundingClientRect()),
          anchor ? anchor.top + anchor.height / 2 : card.getBoundingClientRect().top + 32,
          { width: window.innerWidth, height: window.innerHeight },
        )
        : null;
      point(next ? target : null);
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setRoute(next);
      }
    };
    const schedule = () => {
      // A timer rather than requestAnimationFrame: it batches bursts of changes the same way and exists everywhere.
      if (!frame) frame = setTimeout(measure, 16) as unknown as number;
    };
    schedule();
    // The card slides in for 160 ms: measure again once it has landed.
    const settle = window.setTimeout(schedule, 220);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer.disconnect();
      point(null);
    };
  }, [regionId, cardRef]);

  if (!regionId || !route) return null;
  const { points, frame } = route;
  const d = points.length > 1 ? `M${points.map((p) => p.join(" ")).join(" L")}` : "";
  const corner = Math.min(12, (frame.right - frame.left) / 3, (frame.bottom - frame.top) / 2);
  const brackets = [
    `M${frame.left} ${frame.top + corner} V${frame.top} H${frame.left + corner}`,
    `M${frame.right - corner} ${frame.top} H${frame.right} V${frame.top + corner}`,
    `M${frame.right} ${frame.bottom - corner} V${frame.bottom} H${frame.right - corner}`,
    `M${frame.left + corner} ${frame.bottom} H${frame.left} V${frame.bottom - corner}`,
  ].join(" ");
  const moving = d !== "" && !motionReduced();

  return (
    <svg className="tutorial-signal" data-voice={voice} aria-hidden="true">
      {d ? <path className="tutorial-signal-trace" d={d} /> : null}
      {d ? <circle className="tutorial-signal-node" cx={points[0][0]} cy={points[0][1]} r={3.5} /> : null}
      <path className="tutorial-signal-frame" d={brackets} />
      {d ? PACKETS.map((f, index) => {
        const [x, y] = pointAlong(points, f);
        return moving ? (
          <rect key={f} className="tutorial-signal-packet" x={-3} y={-3} width={6} height={6} transform="rotate(45)">
            <animateMotion dur="2.4s" repeatCount="indefinite" path={d} begin={`${-index * 0.8}s`} />
          </rect>
        ) : (
          <rect key={f} className="tutorial-signal-packet" x={x - 3} y={y - 3} width={6} height={6} transform={`rotate(45 ${x} ${y})`} />
        );
      }) : null}
    </svg>
  );
}
