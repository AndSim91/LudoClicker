import {
  TUTORIAL_REGION_IDS,
  type TutorialRegionId,
} from "../../content/tutorialScenes";

const REGION_SELECTORS: Record<TutorialRegionId, string> = {
  title: ".title-bar",
  "contacts-counter": '[data-tutorial-region="contacts-counter"]',
  commands: ".command-bar",
  navigation: ".app-rail",
  "events-navigation": '[data-tutorial-region="events-navigation"]',
  "contacts-navigation": '[data-tutorial-region="contacts-navigation"]',
  "upgrades-navigation": '[data-tutorial-region="upgrades-navigation"]',
  folders: ".folder-pane",
  messages: ".message-list",
  main: ".workspace > main",
  "composer-header": '[data-tutorial-region="composer-header"]',
  "composer-recipient": '[data-tutorial-region="composer-recipient"]',
  "composer-body": '[data-tutorial-region="composer-body"]',
  "park-sparring-event": '[data-tutorial-region="park-sparring-event"]',
  "park-sparring-action": '[data-tutorial-region="park-sparring-action"]',
  "day-panel": ".day-panel",
  "first-trial-row": '[data-tutorial-region="first-trial-row"]',
  "collaborator-social-assignment": '[data-tutorial-region="collaborator-social-assignment"]',
  status: ".status-bar",
};

export type TutorialTreatment = "focus" | "muted" | "hidden";

export function applyTutorialTreatments(
  focusRegionIds: readonly TutorialRegionId[],
  hiddenRegionIds: readonly TutorialRegionId[],
): () => void {
  const focused = new Set(focusRegionIds);
  const hidden = new Set(hiddenRegionIds);
  const previousState = new Map<HTMLElement, { treatment?: string; inert: boolean }>();
  const focusedElements = focusRegionIds.flatMap((regionId) =>
    [...document.querySelectorAll<HTMLElement>(REGION_SELECTORS[regionId])]
  );

  for (const regionId of TUTORIAL_REGION_IDS) {
    const treatment: TutorialTreatment = hidden.has(regionId)
      ? "hidden"
      : focused.has(regionId) ? "focus" : "muted";
    for (const element of document.querySelectorAll<HTMLElement>(REGION_SELECTORS[regionId])) {
      const inheritsFocusFromParent = treatment === "muted" && focusedElements.some(
        (focusedElement) => focusedElement !== element && focusedElement.contains(element),
      );
      if (inheritsFocusFromParent) continue;

      if (!previousState.has(element)) {
        previousState.set(element, {
          treatment: element.dataset.tutorialTreatment,
          inert: element.inert,
        });
      }
      element.dataset.tutorialTreatment = treatment;
      element.inert = treatment !== "focus";
    }
  }

  return () => {
    for (const [element, previous] of previousState) {
      if (previous.treatment === undefined) {
        delete element.dataset.tutorialTreatment;
      } else {
        element.dataset.tutorialTreatment = previous.treatment;
      }
      element.inert = previous.inert;
    }
  };
}
