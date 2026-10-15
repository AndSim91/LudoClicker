import { useEffect, useRef, useState, type ReactNode } from "react";

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
  formatCompactBalance,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

/**
 * Own component: while the figure rolls it re-renders every frame, and only this
 * <strong> should, not the whole title bar with its month bar and equipment.
 */
function RollingBalance({ euros }: { euros: number }) {
  const balance = useRollingNumber(euros);
  return (
    // Keyed on the rises so «Scatto» replays; the exact figure stays in title and aria-label.
    <strong key={balance.pops} className={balance.pops ? "is-rising" : undefined} title={formatExactCurrency(euros)}>
      {formatCompactBalance(Math.round(balance.shown))}
    </strong>
  );
}

const SPEED_NAMES = ["", "Normale", "Doppia", "Tripla", "Quadrupla", "Quintupla"];

/**
 * «Il tempo è denaro» (concept S2 «Tendina», 15/10): with only 2× unlocked the
 * button toggles 1×/2×; from 3× on it opens a menu of the unlocked speeds.
 */
function TitleSpeed({
  gameSpeed,
  maxGameSpeed,
  onChangeGameSpeed,
}: {
  gameSpeed: number;
  maxGameSpeed: number;
  onChangeGameSpeed: (speed: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const hasMenu = maxGameSpeed > 2;

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const className = gameSpeed > 1 ? "title-speed fast" : "title-speed";
  if (!hasMenu) {
    const next = gameSpeed >= maxGameSpeed ? 1 : gameSpeed + 1;
    return (
      <button
        className={className}
        type="button"
        aria-label={`Velocità del gioco ${gameSpeed}×: passa a ${next}×`}
        title={`Il tempo è denaro: passa a ${next}×`}
        onClick={() => onChangeGameSpeed(next)}
      >
        <Icon name="fast-forward" />
        <span>{gameSpeed}×</span>
      </button>
    );
  }
  return (
    <span className="title-speed-wrap" ref={rootRef}>
      <button
        className={isOpen ? `${className} open` : className}
        type="button"
        aria-label={`Velocità del gioco ${gameSpeed}×: scegli la velocità`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Il tempo è denaro: scegli la velocità"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name="fast-forward" />
        <span>{gameSpeed}×</span>
        <Icon name="chevron" />
      </button>
      {isOpen ? (
        <span className="title-speed-menu" role="menu" aria-label="Velocità del gioco">
          <small>Velocità del gioco</small>
          {Array.from({ length: maxGameSpeed }, (_, index) => index + 1).map((speed) => (
            <button
              key={speed}
              type="button"
              role="menuitemradio"
              aria-checked={speed === gameSpeed}
              className={speed === gameSpeed ? "selected" : undefined}
              onClick={() => {
                onChangeGameSpeed(speed);
                setIsOpen(false);
              }}
            >
              <span className="title-speed-check" aria-hidden="true">{speed === gameSpeed ? "✓" : ""}</span>
              <b>{speed}×</b>
              <span>{SPEED_NAMES[speed]}</span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

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
  gameSpeed = 1,
  maxGameSpeed = 1,
  onChangeGameSpeed = () => undefined,
  onMaintainEquipment = () => undefined,
  onBuyOfficialSwords = () => undefined,
  dayPanelToggle,
  equipmentOpen,
  onEquipmentOpenChange,
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
  /** «Il tempo è denaro»: chosen speed and the fastest one its level allows. */
  gameSpeed?: number;
  maxGameSpeed?: number;
  onChangeGameSpeed?: (speed: number) => void;
  onMaintainEquipment?: () => void;
  onBuyOfficialSwords?: (amount: 1 | 10 | 100) => void;
  /** «La mia giornata» drawer button: below 1441px it takes the place of the window controls. */
  dayPanelToggle?: ReactNode;
  /** Swords menu, controlled by the app so the tutorial can read it; local otherwise. */
  equipmentOpen?: boolean;
  onEquipmentOpenChange?: (open: boolean) => void;
}) {
  const [localEquipmentOpen, setLocalEquipmentOpen] = useState(false);
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
          <RollingBalance euros={euros} />
        </span>
        <MonthlyIncomeSummary state={monthlyIncomeState} />
      </div>
      <TitleEquipment
        equipment={equipment}
        euros={euros}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={onBuyOfficialSwords}
        isOpen={equipmentOpen ?? localEquipmentOpen}
        onOpenChange={onEquipmentOpenChange ?? setLocalEquipmentOpen}
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
      <span className="title-time">
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
        {maxGameSpeed > 1 ? (
          <TitleSpeed
            gameSpeed={gameSpeed}
            maxGameSpeed={maxGameSpeed}
            onChangeGameSpeed={onChangeGameSpeed}
          />
        ) : null}
      </span>
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
      <div className="title-end">
        <span className="window-controls" aria-hidden="true">
          <span>—</span>
          <span>□</span>
          <span>×</span>
        </span>
        {dayPanelToggle}
      </div>
    </header>
  );
}
