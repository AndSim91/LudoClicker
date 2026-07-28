import { isSecretLegendaryId } from "./legendaryAvailability";
import type {
  PersonRarity,
  SecretLegendaryId,
  SpecialCollaboratorId,
} from "./types";

const RARITY_PRIORITY: Record<PersonRarity, number> = {
  common: 0,
  rare: 1,
  "ultra-rare": 2,
  legendary: 3,
};

interface AutomaticTeachingRaritySource {
  rarity: PersonRarity;
  specialProfileId?: SpecialCollaboratorId;
  secretLegendaryId?: SecretLegendaryId;
}

export interface AutomaticTeachingStudentPriority {
  isFavorite: boolean;
  departureRisk: number;
  rarityPriority: number;
  formPriority: number;
  isCollaborator: boolean;
  acquiredAt: number;
  originalOrder: number;
}

export function getAutomaticTeachingRarityPriority(
  student: AutomaticTeachingRaritySource,
): number {
  if (
    isSecretLegendaryId(student.secretLegendaryId) ||
    isSecretLegendaryId(student.specialProfileId)
  ) return 4;
  return RARITY_PRIORITY[student.rarity];
}

export function compareAutomaticTeachingStudentPriority(
  left: AutomaticTeachingStudentPriority,
  right: AutomaticTeachingStudentPriority,
): number {
  return Number(right.isFavorite) - Number(left.isFavorite) ||
    right.departureRisk - left.departureRisk ||
    right.rarityPriority - left.rarityPriority ||
    left.formPriority - right.formPriority ||
    Number(right.isCollaborator) - Number(left.isCollaborator) ||
    left.acquiredAt - right.acquiredAt ||
    left.originalOrder - right.originalOrder;
}
