import { useMemo } from "react";
import { BoutPair } from "../arena/BoutPair";
import { Fighter } from "../people/GymPair";
import type { TournamentLevel, TournamentResult } from "../../game/types";
import { FinalArena } from "./FinalArena";
import { FinalArenaBackdrop } from "./FinalArenaBackdrop";
import { getDuelScript } from "./finalDuel";
import { DUEL_LEFT, DUEL_RIGHT, endView, startView } from "./finalDuelTimeline";
import { ReptileHarborBackdrop } from "./ReptileHarborBackdrop";

export type SceneLevel = TournamentLevel | "reptile";

const STAGE = { left: DUEL_LEFT, right: DUEL_RIGHT };
const bladeOf = (rarity: string) => `var(--blade-${rarity})`;

/** The two finalists as the final ended (winner celebrating), on the hall of their tournament. */
function FinalScene({ result }: { result: TournamentResult }) {
  const final = useMemo(() => {
    const match = result.matches.find((candidate) => candidate.stage === "final");
    const a = match && result.participants.find((participant) => participant.id === match.participantAId);
    const b = match && result.participants.find((participant) => participant.id === match.participantBId);
    if (!match || !a || !b) return undefined;
    const sheets = { a: match.styleDetailA?.sheets, b: match.styleDetailB?.sheets };
    return { view: endView(getDuelScript({ match, a, b }), sheets), sabers: { a: bladeOf(a.rarity), b: bladeOf(b.rarity) } };
  }, [result]);
  if (!final) return <HallScene level={result.level} />;
  return <FinalArena level={result.level} view={final.view} judges={2} sabers={final.sabers} />;
}

/** The empty hall: next tournament, waiting or played without us. */
function HallScene({ level }: { level: TournamentLevel }) {
  return (
    <svg className="fd-arena" viewBox="0 0 640 300" aria-hidden="true">
      <FinalArenaBackdrop level={level} />
    </svg>
  );
}

/** The Reptile on the port: the two pairs, one athlete of each in the Arena and the partner waiting at the edge. */
function ReptileScene({ title, fighters }: { title: string; fighters: boolean }) {
  const view = useMemo(() => startView({}), []);
  return (
    <svg className="fd-arena is-reptile" viewBox="0 0 640 300" aria-hidden="true">
      <ReptileHarborBackdrop title={title} />
      {fighters ? (
        <>
          <g transform="translate(-30 26) scale(1.1)">
            <Fighter x={110} facing={1} saber="var(--blade-rare)" pose="guard" delay={0.6} />
            <Fighter x={522} facing={-1} saber="var(--blade-common)" pose="guard" delay={1.2} />
          </g>
          <g className="gym-pair" transform="translate(-112 33) scale(1.35)">
            <BoutPair view={view} stage={STAGE} sabers={{ a: "var(--blade-rare)", b: "var(--blade-common)" }} />
          </g>
        </>
      ) : null}
    </svg>
  );
}

export function TournamentScene({
  level,
  result,
  title,
  fighters = true,
}: {
  level: SceneLevel;
  result?: TournamentResult;
  /** Reptile title on the wall (Torneo Reptile or della Superba). */
  title?: string;
  fighters?: boolean;
}) {
  if (level === "reptile") return <ReptileScene title={(title ?? "Torneo Reptile").toUpperCase()} fighters={fighters} />;
  if (result && fighters) return <FinalScene result={result} />;
  return <HallScene level={level} />;
}
