import type { Contact, MemberGroup, PersonRarity } from "../../game/types";

const ORDER: PersonRarity[] = ["common", "rare", "ultra-rare", "legendary"];
const LABELS: Record<PersonRarity, string> = {
  common: "Comuni",
  rare: "Rari",
  "ultra-rare": "Ultra Rari",
  legendary: "Leggendari",
};

const format = (value: number) => value.toLocaleString("it-IT");

/**
 * A4 (Andrea, 13/10): sotto il titolo degli iscritti una barra per rarità; la parte
 * piena ha la scheda, quella tratteggiata è in archivio (prima i Comuni).
 */
export function MemberCompositionBar({
  members,
  groups,
}: {
  members: readonly Pick<Contact, "rarity">[];
  groups: readonly MemberGroup[];
}) {
  const people = Object.fromEntries(ORDER.map((rarity) => [rarity, 0])) as Record<PersonRarity, number>;
  const archived = { ...people };
  for (const member of members) people[member.rarity] += 1;
  for (const group of groups) archived[group.rarity] += group.count;
  const total = ORDER.reduce((sum, rarity) => sum + people[rarity] + archived[rarity], 0);
  if (total === 0) return null;
  const share = (value: number) => `${(value / total) * 100}%`;
  const shown = ORDER.filter((rarity) => people[rarity] + archived[rarity] > 0);

  return (
    <div className="member-composition">
      <div className="member-composition-bar" aria-hidden="true">
        {shown.flatMap((rarity) => [
          people[rarity] > 0
            ? <i key={rarity} className={`is-${rarity}`} style={{ width: share(people[rarity]) }} />
            : null,
          archived[rarity] > 0
            ? <i key={`${rarity}-archive`} className={`is-${rarity} is-archived`} style={{ width: share(archived[rarity]) }} />
            : null,
        ])}
      </div>
      <p className="member-composition-legend">
        {shown.map((rarity) => (
          <span key={rarity} className={`is-${rarity}`}>
            {LABELS[rarity]} <b>{format(people[rarity])}</b>
            {archived[rarity] > 0 ? <> + <b>{format(archived[rarity])}</b> in archivio</> : null}
          </span>
        ))}
      </p>
    </div>
  );
}
