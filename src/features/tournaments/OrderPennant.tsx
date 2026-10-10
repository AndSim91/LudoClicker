import { getTournamentSchool, type TournamentSchoolId } from "../../content/tournamentSchools";
import { ArenaFlag } from "./ArenaFlag";

/** Orders with a logo in public/assets/orders (Shardana, Loggia and Ronin: none yet). */
const ORDER_LOGOS = ["cripta", "elementi", "spirale", "minerva", "equilibrio", "vento", "mura", "prometeo"] as const;

interface PennantOwner {
  ownedContactId?: string;
  schoolId?: TournamentSchoolId;
  home?: boolean;
}

function logoOf(owner: PennantOwner): string | undefined {
  if (owner.ownedContactId || owner.home) return "onde";
  const id = owner.schoolId ?? "";
  return ORDER_LOGOS.find((logo) => id.includes(logo));
}

/**
 * The Order banner of the Arena scenes in small (black field, white logo); at the
 * Champion's Arena the nation's flag. Nothing for schools without a logo.
 */
export function OrderPennant({ owner, large = false }: { owner: PennantOwner; large?: boolean }) {
  const logo = logoOf(owner);
  if (logo) {
    return (
      <span className={`order-pennant${large ? " is-large" : ""}`} aria-hidden="true">
        <img src={`/assets/orders/${logo}.webp`} alt="" />
      </span>
    );
  }
  const school = owner.schoolId ? getTournamentSchool(owner.schoolId) : undefined;
  if (school?.kind === "nation") {
    return (
      <svg className={`order-flag${large ? " is-large" : ""}`} viewBox="0 0 24 16" aria-hidden="true">
        <ArenaFlag nation={school.nation} x={0} y={0} w={24} h={16} />
      </svg>
    );
  }
  return null;
}
