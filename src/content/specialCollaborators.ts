import type { SpecialCollaboratorId } from "../game/types";

export interface SpecialCollaboratorProfile {
  id: SpecialCollaboratorId;
  firstName: string;
  lastName: string;
  initialSchool: string;
}

const GENOVA_SCHOOL = "LudoSport Genova - Ordine delle Onde";

export const SPECIAL_COLLABORATORS: readonly SpecialCollaboratorProfile[] = [
  { id: "andrea-simonazzi", firstName: "Andrea", lastName: "Simonazzi", initialSchool: GENOVA_SCHOOL },
  { id: "eva-parodi", firstName: "Eva", lastName: "Parodi", initialSchool: GENOVA_SCHOOL },
  { id: "andrea-ferrari", firstName: "Andrea", lastName: "Ferrari", initialSchool: GENOVA_SCHOOL },
  { id: "marco-gabriele-fedozzi", firstName: "Marco Gabriele", lastName: "Fedozzi", initialSchool: GENOVA_SCHOOL },
  { id: "matteo-scarzello", firstName: "Matteo", lastName: "Scarzello", initialSchool: GENOVA_SCHOOL },
  { id: "chris-usai", firstName: "Chris", lastName: "Usai", initialSchool: GENOVA_SCHOOL },
  { id: "guglielmo-oliveri", firstName: "Guglielmo", lastName: "Oliveri", initialSchool: GENOVA_SCHOOL },
  { id: "niccolo-efrati", firstName: "Niccolò", lastName: "Efrati", initialSchool: GENOVA_SCHOOL },
] as const;
