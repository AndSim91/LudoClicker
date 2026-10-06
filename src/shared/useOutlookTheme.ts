import { useSyncExternalStore } from "react";

const subscribeTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

/** True in Modalità Outlook (the light camouflage); F9 can flip it at any moment. */
export const useOutlookTheme = () =>
  useSyncExternalStore(subscribeTheme, () => document.documentElement.dataset.theme === "light");
