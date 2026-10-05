import { Icon } from "../common/Icon";
import { ProgressBar } from "../common/ProgressBar";
import { getGameMonthName, getSchoolYear } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import { MonthlyIncomeSummary } from "./MonthlyIncomeSummary";
import { TitleEquipment } from "./TitleEquipment";
import { useRollingNumber } from "../../shared/useRollingNumber";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

export function TitleBar({
  currentMonth,
  nextMonthAt,
  now: providedNow,
  contactsAwaitingEmail,
  activeMembers,
  fame,
  followers,
  euros,
  monthlyIncomeState,
  equipment,
  isPaused,
  onTogglePause,
  onMaintainEquipment = () => undefined,
  onBuyOfficialSwords = () => undefined,
}: {
  currentMonth: number;
  nextMonthAt: number;
  now?: number;
  contactsAwaitingEmail: number;
  activeMembers: number;
  fame: number;
  followers?: number;
  euros: number;
  monthlyIncomeState?: GameState;
  equipment: GameState["equipment"];
  isPaused: boolean;
  onTogglePause: () => void;
  onMaintainEquipment?: () => void;
  onBuyOfficialSwords?: (amount: 1 | 10 | 100) => void;
}) {
  const balance = useRollingNumber(euros);
  const liveNow = useGameTime(providedNow === undefined, GAME_CONFIG.progressUpdateIntervalMs);
  const now = providedNow ?? liveNow;
  const monthName = getGameMonthName(currentMonth);
  const currentSchoolYear = getSchoolYear(currentMonth);
  const monthProgress = Math.min(
    100,
    Math.max(0, (1 - (nextMonthAt - now) / GAME_CONFIG.gameMonthMs) * 100),
  );

  return (
    <header className="title-bar">
      <button className="title-menu" type="button" aria-label="Apri menu">
        <Icon name="menu" />
      </button>
      <div className="title-resources" aria-label="Situazione del gioco">
        <span
          className="title-resource"
          data-tutorial-region="contacts-counter"
          aria-label={`Contatti da contattare: ${formatExactNumber(contactsAwaitingEmail)}`}
        >
          <small>Contatti</small>
          <strong title={formatExactNumber(contactsAwaitingEmail)}>
            {formatCompactNumber(contactsAwaitingEmail)}
          </strong>
        </span>
        <span
          className="title-resource"
          aria-label={`Iscritti attivi: ${formatExactNumber(activeMembers)}`}
        >
          <small>Iscritti</small>
          <strong title={formatExactNumber(activeMembers)}>
            {formatCompactNumber(activeMembers)}
          </strong>
        </span>
        {followers === undefined ? null : (
          <span
            className="title-resource"
            aria-label={`Follower Social: ${formatExactNumber(followers)}`}
          >
              <small>Follower</small>
            <strong title={formatExactNumber(followers)}>{formatCompactNumber(followers)}</strong>
          </span>
        )}
        <span
          className="title-resource title-balance"
          aria-label={`Fondi: ${formatExactCurrency(euros)}`}
        >
          <small>Fondi</small>
          {/* Keyed on the rises so «Scatto» replays; the exact figure stays in title and aria-label. */}
          <strong key={balance.pops} className={balance.pops ? "is-rising" : undefined} title={formatExactCurrency(euros)}>
            {formatCompactCurrency(Math.round(balance.shown))}
          </strong>
        </span>
        <MonthlyIncomeSummary state={monthlyIncomeState} />
      </div>
      <TitleEquipment
        equipment={equipment}
        euros={euros}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />
      <span
        className="title-resource title-fame"
        aria-label={`Fama della scuola: ${formatExactNumber(fame)}`}
      >
        <small>Fama</small>
        <strong title={formatExactNumber(fame)}>
          {formatCompactNumber(fame)}
        </strong>
      </span>
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
        <ProgressBar
          className="month-progress"
          label={`Avanzamento di ${monthName}, anno scolastico ${currentSchoolYear}`}
          value={monthProgress}
          durationMs={GAME_CONFIG.gameMonthMs}
        />
      </span>
      <div className="window-controls" aria-hidden="true">
        <span>—</span>
        <span>□</span>
        <span>×</span>
      </div>
    </header>
  );
}
