import { Icon } from "../common/Icon";
import { getGameMonthName, getGameYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";

export function TitleBar({
  currentMonth,
  nextMonthAt,
  now,
}: {
  currentMonth: number;
  nextMonthAt: number;
  now: number;
}) {
  const monthName = getGameMonthName(currentMonth);
  const currentYear = getGameYear(currentMonth);
  const monthProgress = Math.min(
    100,
    Math.max(0, Math.round((1 - (nextMonthAt - now) / GAME_CONFIG.gameMonthMs) * 100)),
  );

  return (
    <header className="title-bar">
      <button className="title-menu" type="button" aria-label="Apri menu">
        <Icon name="menu" />
      </button>
      <span>Oggetto: Nuovi Iscritti</span>
      <span className="title-month" aria-label={`Mese corrente: ${monthName}, anno ${currentYear}`}>
        <span>{monthName}</span>
        <span
          className="month-progress"
          role="progressbar"
          aria-label={`Avanzamento di ${monthName}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={monthProgress}
        >
          <i style={{ width: `${monthProgress}%` }} />
        </span>
      </span>
      <div className="window-controls" aria-hidden="true">
        <span>—</span><span>□</span><span>×</span>
      </div>
    </header>
  );
}
