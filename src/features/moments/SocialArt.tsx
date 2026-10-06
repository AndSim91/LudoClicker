import { useEffect, useState } from "react";
import { formatStat } from "../../shared/formatters";
import { motionReduced } from "../../shared/motion";

/*
 * «Il telefono» (concept S1, 06/10/2026): a phone rises from the sea and lights
 * up on the profile of the Ordine, the follower counter runs to the real number,
 * hearts float up and a «+1» pops. Final frame in the base rules (moments.css).
 */
const COUNT_DELAY_MS = 1_500;
const COUNT_MS = 1_500;
const HEART = "c-4 -6 -12 -2 -8 5 l8 7 l8 -7 c4 -7 -4 -11 -8 -5z";
const HEARTS = [[150, 120, 1.8], [255, 112, 2.1], [136, 90, 2.4], [270, 80, 2.6], [160, 70, 2.9]] as const;

function useCountUp(target: number): number {
  const [shown, setShown] = useState(() =>
    motionReduced() || typeof requestAnimationFrame !== "function" ? target : 0);
  useEffect(() => {
    // Reduced motion: the initial state already shows the target.
    if (motionReduced() || typeof requestAnimationFrame !== "function") return;
    const start = performance.now() + COUNT_DELAY_MS;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      setShown(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

export function SocialArt({ followers }: { followers: number }) {
  const shown = formatStat(useCountUp(followers));
  return (
    <svg className="moment-art moment-social" viewBox="0 0 400 200" aria-hidden="true">
      <ellipse className="social-glow" cx="200" cy="96" rx="70" ry="80" />
      <g className="social-phone">
        <rect className="social-phone-body" x="163" y="22" width="74" height="138" rx="13" />
        <rect className="social-screen" x="170" y="34" width="60" height="112" rx="6" />
        <g className="social-profile">
          <circle className="social-avatar" cx="200" cy="62" r="17" />
          <image href="/assets/ordine-emblem.webp" x="190" y="49" width="20" height="26" />
          <text className="social-name" x="200" y="91">Ordine delle Onde</text>
          <text className={`social-count${shown.length > 5 ? " is-long" : ""}`} x="200" y="124">{shown}</text>
          <text className="social-label" x="200" y="136">follower</text>
        </g>
        <g className="social-badge">
          <circle cx="234" cy="26" r="9" />
          <text x="234" y="26">+1</text>
        </g>
      </g>
      {HEARTS.map(([x, y, delay]) => (
        <path key={x} className="social-heart" d={`M${x} ${y} ${HEART}`} style={{ animationDelay: `${delay}s` }} />
      ))}
      <path className="social-sea" d="M0 168 q50 -14 100 0 t100 0 t100 0 t100 0 V200 H0z" />
      <path className="social-sea-front" d="M0 178 q50 -10 100 0 t100 0 t100 0 t100 0 V200 H0z" />
    </svg>
  );
}
