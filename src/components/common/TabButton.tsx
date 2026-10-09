import type { ReactNode } from "react";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Lets a tutorial point at this tab. */
  tutorialRegion?: string;
}

export function TabButton({ active, onClick, children, tutorialRegion }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? "active" : ""}
      onClick={onClick}
      data-tutorial-region={tutorialRegion}
    >
      {children}
    </button>
  );
}
