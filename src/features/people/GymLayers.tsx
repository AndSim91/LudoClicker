import type { CSSProperties, ReactNode } from "react";
import type { GymBox } from "./gymBox";

/**
 * The gym is drawn in the SVG units of GymScene's viewBox (-180 0 1000 180), but
 * every moving piece sits in its own small HTML layer. Breathing, footwork and
 * the hum of the blades are then transforms and opacities of whole layers, which
 * the compositor animates without repainting the scene on the main thread.
 *
 * A layer is placed with the scene's scale --s (CSS px per unit, set on
 * .gym-stage): left = 50% + (x - 320)·s, top = 85px + (y - 90)·s, the same
 * mapping as the backdrop's preserveAspectRatio="xMidYMid meet".
 */
export function GymLayer({
  box,
  className,
  style,
  children,
}: {
  box: GymBox;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={className ? `gym-layer ${className}` : "gym-layer"}
      style={{ "--x": box.x, "--y": box.y, "--w": box.w, "--h": box.h, ...style } as CSSProperties}
    >
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

/**
 * A blade in three stacked layers: the soft glow at rest, the strong glow at the
 * peak of the hum, and the line itself. The old hum animated a drop-shadow from
 * 3 px to 7 px; cross-fading the two glows draws the same pulse with opacity only.
 */
export function SaberLayers({
  box,
  lines,
  delay,
}: {
  box: GymBox;
  /** x1, y1, x2, y2 and the blade's colour. */
  lines: Array<[number, number, number, number, string]>;
  delay?: string;
}) {
  const style = { animationDelay: delay } as CSSProperties;
  const draw = (className: string) =>
    lines.map(([x1, y1, x2, y2, color], index) => (
      <line key={index} className={className} x1={x1} y1={y1} x2={x2} y2={y2} style={{ color }} />
    ));
  return (
    <>
      <GymLayer box={box} className="gym-saber-glow-soft" style={style}>{draw("gym-saber-glow")}</GymLayer>
      {/* The white halo first: the old filter chain put it under the coloured glow. */}
      <GymLayer box={box} className="gym-saber-glow-strong" style={style}>
        {draw("gym-saber-glow-core")}
        {draw("gym-saber-glow")}
      </GymLayer>
      <GymLayer box={box} className="gym-saber-core" style={style}>{draw("gym-saber-line")}</GymLayer>
    </>
  );
}
