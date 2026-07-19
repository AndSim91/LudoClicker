import { Icon, type IconName } from "../common/Icon";
import { isGameAreaUnlocked, type GameArea } from "../../game/progression";
import type { GameState } from "../../game/types";

export type AppView = GameArea | "admin";

const items: { id: AppView; label: string; icon: IconName; devOnly?: boolean }[] = [
  { id: "mail", label: "Posta", icon: "mail" },
  { id: "events", label: "Eventi", icon: "flag" },
  { id: "contacts", label: "Iscritti", icon: "people" },
  { id: "tournaments", label: "Tornei", icon: "flag" },
  { id: "upgrades", label: "Upgrade", icon: "spark" },
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
