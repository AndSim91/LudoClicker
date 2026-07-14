import type { SpecialCollaboratorId } from "../game/types";

export interface SpecialCollaboratorProfile {
  id: SpecialCollaboratorId;
  firstName: string;
  lastName: string;
}

export const SPECIAL_COLLABORATORS: readonly SpecialCollaboratorProfile[] = [
  { id: "andrea-simonazzi", firstName: "Andrea", lastName: "Simonazzi" },
  { id: "eva-parodi", firstName: "Eva", lastName: "Parodi" },
  { id: "andrea-ferrari", firstName: "Andrea", lastName: "Ferrari" },
  { id: "marco-gabriele-fedozzi", firstName: "Marco Gabriele", lastName: "Fedozzi" },
  { id: "matteo-scarzello", firstName: "Matteo", lastName: "Scarzello" },
  { id: "chris-usai", firstName: "Chris", lastName: "Usai" },
  { id: "guglielmo-oliveri", firstName: "Guglielmo", lastName: "Oliveri" },
  { id: "niccolo-effrati", firstName: "Niccolò", lastName: "Effrati" },
] as const;

