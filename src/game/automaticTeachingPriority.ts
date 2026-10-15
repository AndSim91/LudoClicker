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
  /**
   * 0 iscritto, 1 collaboratore, 2 Istruttore assegnato, 3 Istruttore assegnato
   * whose next Form has a Tecnico in the school (15/10/2026: after the Form he can
   * get the instructor title from him).
   */
  collaboratorPriority: number;
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
  // 13/10/2026: collaborators before departure risk; 15/10/2026: Istruttori first among them.
  return Number(right.isFavorite) - Number(left.isFavorite) ||
    right.collaboratorPriority - left.collaboratorPriority ||
    right.departureRisk - left.departureRisk ||
    right.rarityPriority - left.rarityPriority ||
    left.formPriority - right.formPriority ||
    left.acquiredAt - right.acquiredAt ||
    left.originalOrder - right.originalOrder;
}
