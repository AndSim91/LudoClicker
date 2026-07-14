import { Icon } from "../common/Icon";
import { getGameMonthName } from "../../game/calendar";

export function TitleBar({ currentMonth }: { currentMonth: number }) {
  const monthName = getGameMonthName(currentMonth);

  return (
    <header className="title-bar">
      <button className="title-menu" type="button" aria-label="Apri menu">
        <Icon name="menu" />
      </button>
      <span>Oggetto: Nuovi Iscritti</span>
      <span className="title-month" aria-label={`Mese corrente: ${monthName}`}>
        {monthName}
      </span>
      <div className="window-controls" aria-hidden="true">
        <span>—</span><span>□</span><span>×</span>
      </div>
    </header>
  );
}
