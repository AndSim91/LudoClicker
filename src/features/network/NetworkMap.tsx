import { useLayoutEffect, useRef, useState } from "react";
import type { FoundedSchool } from "../../game/types";
import { formatStat } from "../../shared/formatters";

/** Up to this many nodes (schools left + the current one + the next) the map fits its band. */
const FIT_NODES = 8;
const STEP = 150;
const MARGIN = 90;
const HEIGHT = 190;

type MapNode =
  | { kind: "school"; number: number; name: string; city: string; fame?: number; current?: boolean }
  | { kind: "older"; count: number }
  | { kind: "next" };

function buildNodes(
  schools: readonly FoundedSchool[],
  schoolCount: number,
  current: { name: string; city: string; fame: number },
): MapNode[] {
  const dropped = Math.max(0, schoolCount - schools.length);
  const nodes: MapNode[] = schools.map((school, index) => ({
    kind: "school",
    number: index === 0 ? 1 : index + 1 + dropped,
    ...school,
  }));
  if (dropped > 0) nodes.splice(1, 0, { kind: "older", count: dropped });
  nodes.push({ kind: "school", number: schoolCount + 1, ...current, current: true });
  nodes.push({ kind: "next" });
  return nodes;
}

function describe(node: MapNode): string {
  if (node.kind === "older") {
    return `${formatStat(node.count)} scuole tra la Sede madre e quelle sulla mappa: contate, ma non più disegnate.`;
  }
  if (node.kind === "next") return "";
  const fame = node.fame === undefined
    ? "Fama non registrata"
    : `${node.current ? "Fama attuale" : "Fama alla partenza"} ${formatStat(node.fame)}`;
  return `N° ${node.number} · ${node.name} · ${node.city} · ${fame}${node.number === 1 ? " · Sede madre" : ""}`;
}

export function NetworkMap({
  schools,
  schoolCount,
  current,
}: {
  schools: readonly FoundedSchool[];
  schoolCount: number;
  current: { name: string; city: string; fame: number };
}) {
  const nodes = buildNodes(schools, schoolCount, current);
  const currentIndex = nodes.length - 2;
  const [selected, setSelected] = useState(currentIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fits = nodes.length <= FIT_NODES;
  // Fitting maps are drawn on 1000 units stretched to the band; scrolling ones in pixels.
  const total = fits ? 1000 : MARGIN * 2 + STEP * (nodes.length - 1);
  const margin = fits ? 80 : MARGIN;
  const step = (total - margin * 2) / Math.max(1, nodes.length - 1);
  const points = nodes.map((_, index) => [margin + index * step, 82 + 26 * Math.sin(index * 0.9)] as const);
  const maxFame = Math.max(1, ...nodes.map((node) => node.kind === "school" ? node.fame ?? 0 : 0));

  const curve = (upTo: number) => points.slice(1, upTo + 1).reduce((path, [x, y], index) => {
    const [px, py] = points[index];
    const mx = (px + x) / 2;
    return `${path} C${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }, `M${points[0][0]} ${points[0][1]}`);

  // Opens on the school in progress; the parent remounts the map when a school is founded.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);

  const goTo = (index: number, edge: "start" | "end") => {
    const element = scrollRef.current;
    element?.scrollTo?.({ left: edge === "start" ? 0 : element.scrollWidth, behavior: "smooth" });
    setSelected(index);
  };

  return (
    <section className="network-map" aria-label="Mappa della Rete" data-tutorial-region="network-map">
      <div className="network-map-scroll" ref={scrollRef}>
        <div className="network-map-track" style={{ width: fits ? "100%" : `${total}px` }}>
          <svg viewBox={`0 0 ${total} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <path className="network-map-sea" d={`M0 168 C${total * 0.25} 152 ${total * 0.5} 186 ${total} 164`} />
            <path className="network-map-wire is-next" d={curve(points.length - 1)} />
            <path className="network-map-wire" d={curve(currentIndex)} />
          </svg>
          {nodes.map((node, index) => {
            const [x, y] = points[index];
            const style = { left: `${(x / total) * 100}%`, "--node-y": `${y}px` } as React.CSSProperties;
            if (node.kind === "next") {
              return (
                <div key="next" className="network-node is-next" style={style}>
                  <span className="network-node-orb" />
                  <small>la prossima?</small>
                </div>
              );
            }
            if (node.kind === "older") {
              return (
                <button key="older" type="button" className={`network-node is-older${selected === index ? " is-selected" : ""}`} style={style} onClick={() => setSelected(index)}>
                  <span className="network-node-orb">…</span>
                  <strong>altre {formatStat(node.count)}</strong>
                  <small>scuole più vecchie</small>
                </button>
              );
            }
            const glow = node.fame === undefined ? 0 : Math.sqrt(node.fame / maxFame);
            return (
              <button
                key={`${node.number}`}
                type="button"
                className={`network-node${node.current ? " is-current" : ""}${node.number === 1 ? " is-mother" : ""}${selected === index ? " is-selected" : ""}`}
                style={{ ...style, "--glow": glow.toFixed(2), "--size": `${Math.round(22 + 22 * glow)}px` } as React.CSSProperties}
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
              >
                <span className="network-node-orb">
                  <b>{node.number}</b>
                  <span className="network-node-card">
                    <b>{node.number}. {node.name}</b>
                    <small>{node.city} · {node.current ? "attiva" : node.fame === undefined ? "Fama non registrata" : `Fama ${formatStat(node.fame)}`}</small>
                  </span>
                </span>
                <strong>{node.name}</strong>
                <small>{node.city} · {node.current ? "in corso" : node.fame === undefined ? "Fama n.d." : `Fama ${formatStat(node.fame)}`}</small>
              </button>
            );
          })}
        </div>
      </div>
      <footer className="network-map-bar">
        <button type="button" onClick={() => goTo(0, "start")}>« Sede madre</button>
        <span aria-live="polite">{describe(nodes[selected] ?? nodes[currentIndex])}</span>
        <button type="button" onClick={() => goTo(currentIndex, "end")}>Oggi »</button>
      </footer>
    </section>
  );
}
