import { useId, useMemo } from "react";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getNpcSchoolPool } from "../../content/tournamentSchools";
import type { TournamentLevel } from "../../game/types";
import { ArenaFlag } from "./ArenaFlag";
import { seededRoll } from "./finalDuel";

/** Orders with a logo in public/assets/orders (Shardana, Loggia and Ronin: none yet). Onde in the middle. */
const ORDER_BANNERS = [
  ["cripta", "Cripta"], ["elementi", "Elementi"], ["spirale", "Spirale"], ["minerva", "Minerva"], ["onde", "Onde"],
  ["equilibrio", "Equilibrio"], ["vento", "Vento"], ["mura", "Mura"], ["prometeo", "Prometeo"],
] as const;

const CHAMPIONS_NATIONS = (() => {
  const nations = getNpcSchoolPool("champions").map((school) => school.nation);
  nations.splice(Math.floor(nations.length / 2), 0, "Italia");
  return nations;
})();

const WALLS: Record<TournamentLevel, [string, string]> = {
  school: ["#034965", "#0a3a57"],
  academy: ["#043a58", "#0a3a57"],
  national: ["#02233a", "#0a3a57"],
  champions: ["#010f1c", "#062a42"],
  chronicles: ["#03081a", "#071a35"],
};

/** Order banner like the Onde one: black field, white logo, thin white edge. */
function Banner({ x, y, scale, logo, name }: { x: number; y: number; scale: number; logo: string; name?: string }) {
  return (
    <g className="fd-banner" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-30 0 H30 V70 L0 86 L-30 70 Z" fill="#111417" stroke="#fbf1dc" strokeWidth={1.5} strokeLinejoin="round" />
      <image href={`/assets/orders/${logo}.webp`} x={-24} y={6} width={48} height={62} preserveAspectRatio="xMidYMid meet" />
      {name ? <text x={0} y={100} textAnchor="middle" className="fd-banner-name">{name}</text> : null}
    </g>
  );
}

function Crowd({ rows, count, top, roll }: { rows: number; count: number; top: number; roll: () => number }) {
  return (
    <g className="fd-crowd">
      {Array.from({ length: rows }, (_, row) => {
        const y = top + row * 13;
        return (
          <g key={row} className={row ? "is-back" : undefined}>
            <rect y={y + 6} width={640} height={9} />
            {Array.from({ length: count }, (_, index) => (
              <circle
                key={index}
                cx={12 + (index + (row % 2) * 0.5) * (616 / count) + (roll() * 6 - 3)}
                cy={y + roll() * 3 - 1.5}
                r={5.5}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function Beams({ xs, spread, sway, gradient }: { xs: number[]; spread: number; sway?: boolean; gradient: string }) {
  return xs.map((x, index) => (
    <polygon
      key={x}
      className={sway ? "fd-beam is-sway" : "fd-beam"}
      points={`${x - 6},0 ${x + 6},0 ${x + spread},250 ${x - spread},250`}
      fill={`url(#${gradient})`}
      style={{ animationDelay: `${-index * 1.3}s` }}
    />
  ));
}

/** The hall of the Legendaries: stars, a turning ring of runes, columns, statues, braziers. */
function ChroniclesHall({ title, roll, glow }: { title: string; roll: () => number; glow: string }) {
  return (
    <>
      <text className="fd-title is-chronicles" x={320} y={24} textAnchor="middle">{title}</text>
      <g className="fd-stars">
        {Array.from({ length: 46 }, (_, index) => (
          <circle key={index} cx={roll() * 640} cy={roll() * 130} r={0.5 + roll()} style={{ animationDelay: `${-roll() * 4}s` }} />
        ))}
      </g>
      <circle cx={320} cy={120} r={150} fill={`url(#${glow})`} />
      <g className="fd-rune-ring">
        <circle cx={320} cy={120} r={86} strokeWidth={2} />
        <circle cx={320} cy={120} r={75} strokeWidth={6} strokeDasharray="2 9" opacity={0.8} />
        <circle cx={320} cy={120} r={64} strokeWidth={1} opacity={0.6} />
        {Array.from({ length: 12 }, (_, k) => {
          const angle = (k / 12) * Math.PI * 2;
          return <path key={k} className="is-rune" d={`M${320 + Math.cos(angle) * 80} ${120 + Math.sin(angle) * 80} l3 -5 l3 5 z`} />;
        })}
      </g>
      {[-60, -25, 25, 60].map((dx) => (
        <polygon key={dx} points={`320,120 ${320 + dx * 1.6 - 8},300 ${320 + dx * 1.6 + 8},300`} fill="#d5a84b" opacity={0.08} />
      ))}
      {[22, 588].map((x) => (
        <g key={x} className="fd-column">
          <rect x={x} y={18} width={30} height={152} />
          <rect className="is-capital" x={x - 6} y={10} width={42} height={10} />
          {[8, 15, 22].map((d) => <line key={d} x1={x + d} y1={24} x2={x + d} y2={166} />)}
        </g>
      ))}
      {([[120, 1, "#ff6b6b"], [520, -1, "#ffd166"]] as const).map(([x, facing, saber]) => (
        <g key={x} className="fd-statue">
          <rect x={x - 22} y={132} width={44} height={22} />
          <g transform={`translate(${x} 4) scale(.9)`}>
            <circle cx={0} cy={70} r={8} />
            <path d={`M0 78 L0 108 M0 108 L-10 136 M0 108 L11 136 M0 86 L${12 * facing} 72 M0 88 L${-10 * facing} 98`} />
            <line className="gym-saber" x1={12 * facing} y1={72} x2={20 * facing} y2={30} style={{ color: saber }} />
          </g>
        </g>
      ))}
      {[86, 554].map((x, index) => (
        <g key={x}>
          <path d={`M${x - 12} 150 L${x + 12} 150 L${x + 7} 162 L${x - 7} 162 Z`} fill="#d5a84b" />
          <path
            className="fd-brazier"
            d={`M${x} 122 C${x + 10} 134 ${x + 10} 146 ${x} 150 C${x - 10} 146 ${x - 10} 134 ${x} 122 Z`}
            style={{ animationDelay: `${-index * 0.4}s` }}
          />
        </g>
      ))}
      <g className="fd-crowd is-hooded">
        {Array.from({ length: 26 }, (_, index) => {
          const x = 70 + index * 19.5;
          return <path key={index} d={`M${x - 7} 168 Q${x - 7} 152 ${x} 150 Q${x + 7} 152 ${x + 7} 168 Z`} />;
        })}
      </g>
    </>
  );
}

/** Wall, public and floor of the Arena: a different hall for every tournament level. */
export function FinalArenaBackdrop({ level }: { level: TournamentLevel }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { wall: `fd-wall-${uid}`, beam: `fd-beam-${uid}`, glow: `fd-glow-${uid}` };
  const title = TOURNAMENT_DEFINITIONS[level].label.toUpperCase();
  // Crowd jitter and stars: the same hall every time.
  const hall = useMemo(() => {
    const roll = seededRoll(`hall-${level}`);
    switch (level) {
      case "school":
        return (
          <>
            <rect x={490} y={34} width={96} height={50} rx={3} fill="rgb(108 211 214 / 18%)" />
            <path d="M538 34 V84 M490 59 H586" fill="none" stroke="#0a3a57" strokeWidth={3} />
            <rect x={40} y={70} width={40} height={84} rx={2} fill="#04263f" />
            <Banner x={320} y={0} scale={1.15} logo="onde" />
            <g className="fd-crowd">
              {[110, 128, 146, 494, 512, 530, 548].map((x, index) => (
                <g key={x}>
                  <circle cx={x} cy={150 + (index % 2) * 2} r={6} />
                  <rect x={x - 7} y={156} width={14} height={14} rx={4} />
                </g>
              ))}
            </g>
          </>
        );
      case "academy":
        return (
          <>
            <text className="fd-title" x={320} y={24} textAnchor="middle">{title}</text>
            {ORDER_BANNERS.map(([logo, name], index) => (
              <Banner key={logo} x={56 + index * 66} y={34} scale={logo === "onde" ? 0.72 : 0.62} logo={logo} name={name} />
            ))}
            <Crowd rows={1} count={26} top={140} roll={roll} />
            <Beams xs={[200, 440]} spread={80} gradient={ids.beam} />
          </>
        );
      case "national":
        return (
          <>
            <text className="fd-title" x={320} y={26} textAnchor="middle">{title}</text>
            <line x1={266} y1={38} x2={374} y2={38} stroke="#9fb4c0" strokeWidth={2} />
            <ArenaFlag nation="Italia" x={278} y={40} w={84} h={50} />
            <Crowd rows={2} count={34} top={128} roll={roll} />
            <Beams xs={[150, 490]} spread={100} gradient={ids.beam} />
          </>
        );
      case "champions":
        return (
          <>
            <text className="fd-title" x={320} y={26} textAnchor="middle">{title}</text>
            <path d="M10 40 Q320 70 630 40" fill="none" stroke="#9fb4c0" strokeWidth={1.5} />
            {CHAMPIONS_NATIONS.map((nation, index) => {
              const x = 22 + index * 50;
              const y = 40 + 30 * (1 - ((x + 18 - 320) / 310) ** 2) * 0.9 - 2;
              return <ArenaFlag key={nation} nation={nation} x={x} y={y} w={36} h={24} />;
            })}
            <Crowd rows={3} count={40} top={114} roll={roll} />
            <g>
              {Array.from({ length: 14 }, (_, index) => (
                <circle
                  key={index}
                  className="fd-flash"
                  cx={20 + roll() * 600}
                  cy={112 + roll() * 34}
                  r={2.2}
                  style={{ animationDelay: `${-roll() * 2.8}s`, animationDuration: `${2.2 + roll() * 1.8}s` }}
                />
              ))}
            </g>
            <Beams xs={[110, 250, 390, 530]} spread={70} sway gradient={ids.beam} />
          </>
        );
      case "chronicles":
        return <ChroniclesHall title={title} roll={roll} glow={ids.glow} />;
    }
  }, [level, title, ids.beam, ids.glow]);

  const epic = level === "chronicles";
  return (
    <g className={`fd-hall is-${level}`}>
      <defs>
        <linearGradient id={ids.wall} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={WALLS[level][0]} />
          <stop offset={1} stopColor={WALLS[level][1]} />
        </linearGradient>
        <linearGradient id={ids.beam} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#fbf1dc" stopOpacity={0.32} />
          <stop offset={1} stopColor="#fbf1dc" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset={0} stopColor="#d5a84b" stopOpacity={0.35} />
          <stop offset={1} stopColor="#d5a84b" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={640} height={300} fill={`url(#${ids.wall})`} />
      {hall}
      <rect y={168} width={640} height={132} fill={epic ? "#060f22" : "#06283f"} />
      <ellipse
        className={epic ? "fd-ring is-epic" : "fd-ring"}
        cx={320}
        cy={236}
        rx={250}
        ry={52}
        fill={epic ? "#10305a" : "#177c89"}
        stroke={level === "school" ? "#6cd3d6" : epic ? "#d5a84b" : "#f0b85a"}
        strokeWidth={level === "champions" || epic ? 3 : 2}
        opacity={0.92}
      />
      <ellipse cx={320} cy={236} rx={70} ry={15} fill="none" stroke="#fbf1dc" strokeWidth={1} opacity={0.25} />
    </g>
  );
}
