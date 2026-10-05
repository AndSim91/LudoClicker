import { useEffect, useState, type CSSProperties } from "react";

type Status = "locked" | "available" | "completed";

const SPARK_MS = 1_800;
const STAGGER_MS = 80;
const BURST_WINDOW_MS = 60;
// The comet takes ~760 ms to cross a stretch: a node it opens wakes up on arrival.
const UNLOCK_DELAY_MS = 700;

// «Compra tutto» completes many nodes in the same tick: each one waits its turn
// (80 ms apart), so the tree lights up as a wave instead of all at once.
let burst = { at: 0, count: 0 };
function nextBurstDelay(): number {
  const now = performance.now();
  burst = now - burst.at < BURST_WINDOW_MS ? { at: now, count: burst.count + 1 } : { at: now, count: 0 };
  return burst.count * STAGGER_MS;
}

interface Spark {
  id: number;
  className: string;
  delay: number;
}

/**
 * Purchase animation of one upgrade node: «just-bought» on every new level, plus
 * «just-completed» (the stretch of branch draws itself behind a comet) and
 * «just-unlocked» (a node that has just opened). `id` changes on every spark: key
 * the animated pieces on it so a second quick purchase replays them.
 */
export function useUpgradeSpark(level: number, status: Status): {
  id: number;
  className: string;
  style?: CSSProperties;
} {
  const [previous, setPrevious] = useState({ level, status });
  const [spark, setSpark] = useState<Spark | null>(null);

  // Compared during render (React's «previous props» pattern), so the class is there
  // in the very frame the node turns completed: no flash of the finished branch.
  if (previous.level !== level || previous.status !== status) {
    setPrevious({ level, status });
    let className = "";
    if (level > previous.level) className = status === "completed" ? "just-bought just-completed" : "just-bought";
    else if (previous.status === "locked" && status === "available") className = "just-unlocked";
    if (className) {
      const delay = nextBurstDelay() + (className === "just-unlocked" ? UNLOCK_DELAY_MS : 0);
      setSpark({ id: (spark?.id ?? 0) + 1, className, delay });
    }
  }

  useEffect(() => {
    if (!spark) return;
    const timer = window.setTimeout(() => setSpark(null), spark.delay + SPARK_MS);
    return () => window.clearTimeout(timer);
  }, [spark]);

  return spark
    ? { id: spark.id, className: ` ${spark.className}`, style: { "--spark-delay": `${spark.delay}ms` } as CSSProperties }
    : { id: 0, className: "" };
}
