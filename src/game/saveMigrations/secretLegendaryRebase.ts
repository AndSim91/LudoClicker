import {
  getSecretLegendaryBase,
  SECRET_LEGENDARIES,
  type SecretLegendaryId,
} from "../../content/secretLegendaries";
import type { MigratableState } from "./types";

/*
 * v105 (07/10): a Secret Legendary has a tournament value and its own base
 * values to enter the school. Until v104 the base was the tournament one
 * (up to 1.500 for the Chronicles). An enrolled or remembered Secret
 * Legendary moves to the new base and keeps what it trained on top: the
 * part above the lowest catalogue value it could have had (before or after
 * the 07/10 rescale of Accademico and Nazionale).
 */
const OLD_LOWEST_BASE: Partial<Record<SecretLegendaryId, readonly [number, number]>> = {
  "marco-palena": [140 / (1.4 * 1.15), 155 / (1.4 * 1.15)],
  "lorenzo-todaro": [151 / (1.5 * 1.15), 151 / (1.5 * 1.15)],
  "daniele-panizza": [155 / (1.4 * 1.15), 140 / (1.4 * 1.15)],
  "sara-magnifico": [130 / (1.5 * 1.15), 165 / (1.5 * 1.15)],
  "pietro-scarica": [220 / (1.5 * 1.3), 230 / (1.5 * 1.3)],
  "piero-dipalo": [200, 210],
  "simone-pedrazzi": [200, 225],
  "francesco-d-addosio": [1_200, 1_200],
  "paolo-scalzulli": [1_200, 1_200],
  "lorenzo-ferrario": [1_500, 1_500],
  "antonio-rocchitelli": [1_080, 1_080],
  "ugo-cesare-tonelli": [1_199, 1_199],
  "enrico-giovanetti": [1_020, 1_020],
  "carlos-jimenez-moyano": [1_201, 1_199],
};

function rebase(
  id: string | undefined,
  arena: number | undefined,
  style: number | undefined,
): { arenaBase: number; styleBase: number } | undefined {
  if (!id || !(id in SECRET_LEGENDARIES)) return undefined;
  const secretId = id as SecretLegendaryId;
  const [arenaBase, styleBase] = getSecretLegendaryBase(secretId);
  const [oldArena, oldStyle] = OLD_LOWEST_BASE[secretId] ?? [arenaBase, styleBase];
  const trained = (value: number | undefined, old: number) =>
    Math.max(0, (Number.isFinite(value) ? value! : old) - old);
  return {
    arenaBase: arenaBase + trained(arena, oldArena),
    styleBase: styleBase + trained(style, oldStyle),
  };
}

export function migrateSecretLegendaryRebaseState(state: MigratableState): MigratableState {
  if (state.version !== 104) return state;
  const contacts = state.contacts?.map((contact) => {
    const next = rebase(contact.secretLegendaryId, contact.arenaBase, contact.styleBase);
    return next ? { ...contact, ...next } : contact;
  });
  const legendaryCollaborators = state.legendaryCollaborators;
  const retainedProgress = legendaryCollaborators?.retainedProgress
    ? Object.fromEntries(Object.entries(legendaryCollaborators.retainedProgress).map(([id, progress]) => {
        const next = progress ? rebase(id, progress.arenaBase, progress.styleBase) : undefined;
        return [id, next ? { ...progress, ...next } : progress];
      }))
    : undefined;
  return {
    ...state,
    version: 105,
    ...(contacts ? { contacts } : {}),
    ...(legendaryCollaborators && retainedProgress
      ? { legendaryCollaborators: { ...legendaryCollaborators, retainedProgress } }
      : {}),
  };
}
