import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime } from "../../game/GameTimeContext";
import { useMediaQuery } from "../../shared/useMediaQuery";
import { DAY_PANEL_MEDIA_QUERY } from "./DayPanel";
import { selectDayNotifications } from "./dayNotifications";
import { StoryGoalCount } from "./StoryGoalPill";

const BADGE_UPDATE_INTERVAL_MS = 1_000;

/**
 * Title-bar switch of «La mia giornata» below 1441px (G2, 07/10). The gold badge
 * counts the notifications that appeared while the panel was closed.
 */
export function DayPanelToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const isColumn = useMediaQuery(DAY_PANEL_MEDIA_QUERY, true);
  if (isColumn) return null;
  return <DayPanelToggleButton open={open} onToggle={onToggle} />;
}

function DayPanelToggleButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const state = useGameStateSlices(["contacts", "narrative", "scheduledTrials", "school", "tournaments"]);
  const now = useGameTime(true, BADGE_UPDATE_INTERVAL_MS);
  const ids = selectDayNotifications(state, now).map((notification) => notification.id);
  const idsKey = ids.join("|");
  const [seenKey, setSeenKey] = useState("");
  // While open everything on screen counts as seen (state adjusted during render, no effect).
  if (open && seenKey !== idsKey) setSeenKey(idsKey);
  const seen = new Set(seenKey.split("|"));
  const unseen = open ? 0 : ids.filter((id) => !seen.has(id)).length;

  return (
    <button
      className={open ? "day-panel-toggle is-open" : "day-panel-toggle"}
      type="button"
      aria-expanded={open}
      aria-label={unseen > 0 ? `La mia giornata: ${unseen} novità` : "La mia giornata"}
      onClick={onToggle}
    >
      <Icon name="calendar" />
      <span>Giornata</span>
      {unseen > 0 ? <b aria-hidden="true">{unseen > 9 ? "9+" : unseen}</b> : null}
      {open ? null : <StoryGoalCount />}
    </button>
  );
}
