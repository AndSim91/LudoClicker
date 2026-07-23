import { Icon, type IconName } from "../common/Icon";
import { isGameAreaUnlocked, type GameArea } from "../../game/progression";
import type { GameState } from "../../game/types";

export type AppView = GameArea | "admin";

interface AppRailItem {
  id: AppView;
  label: string;
  icon: IconName;
  devOnly?: boolean;
  tutorialRegion?: "events-navigation" | "contacts-navigation" | "upgrades-navigation";
}

const items: AppRailItem[] = [
  { id: "mail", label: "Posta", icon: "mail" },
  { id: "events", label: "Eventi", icon: "flag", tutorialRegion: "events-navigation" },
  { id: "contacts", label: "Iscritti", icon: "people", tutorialRegion: "contacts-navigation" },
  { id: "tournaments", label: "Tornei", icon: "trophy" },
  { id: "upgrades", label: "Upgrade", icon: "spark", tutorialRegion: "upgrades-navigation" },
  { id: "statistics", label: "Attività", icon: "tasks" },
  { id: "settings", label: "Impostazioni", icon: "settings" },
  { id: "admin", label: "Admin", icon: "admin", devOnly: true },
];

export function AppRail({
  view,
  state,
  onChange,
}: {
  view: AppView;
  state: GameState;
  onChange: (view: AppView) => void;
}) {
  const visibleItems = items.filter((item) => {
    if (item.devOnly) return import.meta.env.DEV;
    return isGameAreaUnlocked(item.id as GameArea, state);
  });
  return (
    <nav className="app-rail" aria-label="Applicazioni">
      {visibleItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={view === item.id ? "rail-item active" : "rail-item"}
          data-tutorial-region={item.tutorialRegion}
          data-tutorial-target={item.tutorialRegion ? "true" : undefined}
          onClick={() => onChange(item.id)}
          aria-current={view === item.id ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
