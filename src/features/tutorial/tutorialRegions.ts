import {
  TUTORIAL_REGION_IDS,
  type TutorialRegionId,
} from "../../content/tutorialScenes";

const REGION_SELECTORS: Record<TutorialRegionId, string> = {
  title: ".title-bar",
  "contacts-counter": '[data-tutorial-region="contacts-counter"]',
  "title-equipment": '[data-tutorial-region="title-equipment"]',
  commands: ".command-bar",
  navigation: ".app-rail",
  "events-navigation": '[data-tutorial-region="events-navigation"]',
  "contacts-navigation": '[data-tutorial-region="contacts-navigation"]',
  "upgrades-navigation": '[data-tutorial-region="upgrades-navigation"]',
  "gadget-navigation": '[data-tutorial-region="gadget-navigation"]',
  folders: ".folder-pane",
  messages: ".message-list",
  main: ".workspace > main",
  "gadget-overview": '[data-tutorial-region="gadget-overview"]',
  "gadget-catalog": '[data-tutorial-region="gadget-catalog"]',
  "composer-header": '[data-tutorial-region="composer-header"]',
  "composer-recipient": '[data-tutorial-region="composer-recipient"]',
  "composer-body": '[data-tutorial-region="composer-body"]',
  "park-sparring-event": '[data-tutorial-region="park-sparring-event"]',
  "park-sparring-action": '[data-tutorial-region="park-sparring-action"]',
  "day-panel": ".day-panel",
  "first-trial-row": '[data-tutorial-region="first-trial-row"]',
  "collaborator-section": '[data-tutorial-region="collaborator-section"]',
  "collaborator-social-assignment": '[data-tutorial-region="collaborator-social-assignment"]',
  "collaborator-sectors": '[data-tutorial-region="collaborator-sectors"]',
  "tournaments-navigation": '[data-tutorial-region="tournaments-navigation"]',
  "network-navigation": '[data-tutorial-region="network-navigation"]',
  "tournament-final": '[data-tutorial-region="tournament-final"]',
  "tournament-groups": '[data-tutorial-region="tournament-groups"]',
  "tournament-podium": '[data-tutorial-region="tournament-podium"]',
  "reptile-hero": '[data-tutorial-region="reptile-hero"]',
  "reptile-month": '[data-tutorial-region="reptile-month"]',
  "reptile-preparation": '[data-tutorial-region="reptile-preparation"]',
  "reptile-minigame": '[data-tutorial-region="reptile-minigame"]',
  "network-map": '[data-tutorial-region="network-map"]',
  "network-ready": '[data-tutorial-region="network-ready"]',
  "network-upgrades": '[data-tutorial-region="network-upgrades"]',
  "network-keeps": '[data-tutorial-region="network-keeps"]',
  "network-found": '[data-tutorial-region="network-found"]',
  status: ".status-bar",
  "planning-grades": '[data-tutorial-region="planning-grades"]',
  "planning-highlight": '[data-tutorial-region="planning-highlight"]',
  "planning-sis": '[data-tutorial-region="planning-sis"]',
  "planning-swords": '[data-tutorial-region="planning-swords"]',
  "planning-funds": '[data-tutorial-region="planning-funds"]',
  "planning-forecast": '[data-tutorial-region="planning-forecast"]',
  "planning-toggle": '[data-tutorial-region="planning-toggle"]',
  "planning-confirm": '[data-tutorial-region="planning-confirm"]',
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
