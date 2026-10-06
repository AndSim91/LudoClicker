import type { CSSProperties, ReactNode } from "react";

/** A rectangle in the scene's SVG units (viewBox 0 0 520 106). */
export interface SceneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * One moving piece of a sector scene, in its own small HTML layer: the
 * compositor moves it with transform and opacity, without repainting the
 * scene (same idea as GymLayer in the gym).
 */
export function SceneLayer({
  box,
  viewBox,
  className,
  style,
  children,
}: {
  box: SceneBox;
  /** What the layer shows, when it is drawn at another scale than the scene. */
  viewBox?: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`sector-scene-layer ${className}`}
      style={{ "--x": box.x, "--y": box.y, "--w": box.w, "--h": box.h, ...style } as CSSProperties}
    >
      <svg viewBox={viewBox ?? `${box.x} ${box.y} ${box.w} ${box.h}`}>{children}</svg>
    </div>
  );
}
