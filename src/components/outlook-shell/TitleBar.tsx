import { Icon } from "../common/Icon";
import { getGameMonthName, getSchoolYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

export function TitleBar({
  currentMonth,
  nextMonthAt,
  now,
  contactsAwaitingEmail,
  activeMembers,
  euros,
  isPaused,
  onTogglePause,
}: {
  currentMonth: number;
  nextMonthAt: number;
  now: number;
  contactsAwaitingEmail: number;
  activeMembers: number;
  euros: number;
  isPaused: boolean;
  onTogglePause: () => void;
}) {
  const monthName = getGameMonthName(currentMonth);
  const currentSchoolYear = getSchoolYear(currentMonth);
  const monthProgress = Math.min(
    100,
    Math.max(0, Math.round((1 - (nextMonthAt - now) / GAME_CONFIG.gameMonthMs) * 100)),
  );

  return (
    <header className="title-bar">
      <button className="title-menu" type="button" aria-label="Apri menu">
        <Icon name="menu" />
      </button>
      <div className="title-resources" aria-label="Situazione del gioco">
        <span className="title-resource" aria-label={`Contatti da contattare: ${formatExactNumber(contactsAwaitingEmail)}`}>
          <Icon name="contact" />
          <small>Contatti</small>
          <strong title={formatExactNumber(contactsAwaitingEmail)}>{formatCompactNumber(contactsAwaitingEmail)}</strong>
        </span>
        <span className="title-resource" aria-label={`Iscritti attivi: ${formatExactNumber(activeMembers)}`}>
          <Icon name="people" />
          <small>Iscritti attivi</small>
          <strong title={formatExactNumber(activeMembers)}>{formatCompactNumber(activeMembers)}</strong>
        </span>
        <span className="title-resource" aria-label={`Disponibilità economica: ${formatExactCurrency(euros)}`}>
          <Icon name="coin" />
          <small>Disponibilità</small>
          <strong title={formatExactCurrency(euros)}>{formatCompactCurrency(euros)}</strong>
        </span>
      </div>
      <button
        className={isPaused ? "title-pause active" : "title-pause"}
        type="button"
        aria-label={isPaused ? "Riprendi" : "Pausa"}
        aria-pressed={isPaused}
        title={isPaused ? "Riprendi il gioco" : "Metti in pausa il gioco"}
        onClick={onTogglePause}
      >
        <Icon name={isPaused ? "play" : "pause"} />
      </button>
      <span
        className="title-month"
        aria-label={`Mese corrente: ${monthName}, anno scolastico ${currentSchoolYear}`}
      >
        <span className="title-month-copy">
          <strong>{monthName}</strong>
          <small>Anno scolastico {currentSchoolYear}</small>
        </span>
        <span
          className="month-progress"
          role="progressbar"
          aria-label={`Avanzamento di ${monthName}, anno scolastico ${currentSchoolYear}`}
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
