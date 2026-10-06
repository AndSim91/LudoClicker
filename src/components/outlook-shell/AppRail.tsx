import { Icon } from "../common/Icon";
import { APP_RAIL_ITEMS, type AppView } from "./appRailItems";
import { isGameAreaUnlocked, type GameArea } from "../../game/progression";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { isAdminMode } from "../../app/adminMode";

export type { AppView } from "./appRailItems";

export function AppRail({
  view,
  state: stateOverride,
  onChange,
}: {
  view: AppView;
  state?: GameState;
  onChange: (view: AppView) => void;
}) {
  const state = useGameStateSlices(
    ["network", "school", "shortGoal", "statistics", "unlocks", "achievements", "tournaments"],
    stateOverride,
  );
  const visibleItems = APP_RAIL_ITEMS.filter((item) => {
    // The LudoWiki opens to everyone with the first achievement (4.4).
    if (item.id === "ludowiki") return isAdminMode || state.achievements.length > 0;
    if (item.devOnly) return isAdminMode;
    return isGameAreaUnlocked(item.id as GameArea, state);
  });
  return (
    <nav className="app-rail" aria-label="Applicazioni">
      {visibleItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={view === item.id ? "rail-item active" : "rail-item"}
          data-view={item.id}
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
