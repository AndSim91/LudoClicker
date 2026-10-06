import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CollaboratorMasteryRole } from "../../game/types";
import { SectorSceneArt } from "./sectorSceneArt";

/** Pauses the scene while it is off screen: nothing to animate nobody sees. */
function useOnScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, onScreen] as const;
}

/**
 * The animated band of a sector card in Modalità Onde (Tavola 4, 06/10): a
 * small scene that tells the sector's work. Still when nobody works there,
 * with «Riduci animazioni» and off screen. `children` are the data chips.
 */
export function SectorScene({
  role,
  idle,
  children,
}: {
  role: CollaboratorMasteryRole;
  idle: boolean;
  children?: ReactNode;
}) {
  const [ref, onScreen] = useOnScreen();
  return (
    <div
      ref={ref}
      className={`sector-scene is-${role}${idle ? " is-idle" : ""}${onScreen ? "" : " is-offscreen"}`}
    >
      <div className="sector-scene-art" aria-hidden="true"><SectorSceneArt role={role} /></div>
      {children}
    </div>
  );
}
