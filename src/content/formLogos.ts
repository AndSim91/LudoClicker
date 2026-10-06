import type { FormId } from "../game/types";

export type FormLogoSource = "official" | "generated";

export interface FormLogoDefinition {
  assetPath: string;
  source: FormLogoSource;
  sourceUrl?: string;
}

export const AGONIST_COURSE_LOGO: FormLogoDefinition = {
  assetPath: "/form-assets/logos/agonist-course.png",
  source: "generated",
};

/** Arena Tecnica, prima di «Nessun Rancore»: lo stesso emblema su fondo rosso. */
export const ARENA_TECNICA_LOGO: FormLogoDefinition = {
  assetPath: "/form-assets/logos/arena-tecnica.png",
  source: "generated",
};

export const getAgonistCourseLogo = (agonistCourseUnlocked: boolean) =>
  agonistCourseUnlocked ? AGONIST_COURSE_LOGO : ARENA_TECNICA_LOGO;

const OFFICIAL_FORMS_OVERVIEW_URL =
  "https://www.ludosport.net/images/bg/7forme2.jpg";
const OFFICIAL_LEARNING_PATH_URL =
  "https://www.ludosport.net/images/bg/long/infografica-ludosport2mod.jpg";

export const FORM_LOGOS: Record<FormId, FormLogoDefinition> = {
  "form-1": {
    assetPath: "/form-assets/logos/form-1.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "course-x": {
    assetPath: "/form-assets/logos/course-x.png",
    source: "generated",
    sourceUrl: OFFICIAL_LEARNING_PATH_URL,
  },
  "form-2": {
    assetPath: "/form-assets/logos/form-2.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "course-y": {
    assetPath: "/form-assets/logos/course-y.png",
    source: "official",
    sourceUrl: OFFICIAL_LEARNING_PATH_URL,
  },
  "form-3-long": {
    assetPath: "/form-assets/logos/form-3.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-4-long": {
    assetPath: "/form-assets/logos/form-4.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-5-long": {
    assetPath: "/form-assets/logos/form-5.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-3-staff": {
    assetPath: "/form-assets/logos/form-3.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-4-staff": {
    assetPath: "/form-assets/logos/form-4.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-5-staff": {
    assetPath: "/form-assets/logos/form-5.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-3-double": {
    assetPath: "/form-assets/logos/form-3.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-4-double": {
    assetPath: "/form-assets/logos/form-4.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-5-double": {
    assetPath: "/form-assets/logos/form-5.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-6": {
    assetPath: "/form-assets/logos/form-6.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
  "form-7": {
    assetPath: "/form-assets/logos/form-7.png",
    source: "official",
    sourceUrl: OFFICIAL_FORMS_OVERVIEW_URL,
  },
};

export function getFormLogo(formId: FormId): FormLogoDefinition {
  return FORM_LOGOS[formId];
}
