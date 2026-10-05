import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ACQUISITION_EVENTS, type AcquisitionEventDefinition } from "../../content/events";
import { getEventCopyContactMultiplier, getEventExtraCopies } from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { getEventCopyCost } from "../../game/eventFlow";
import { getRunningEventCounts } from "../../game/runtimeIndexes";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  formatEventCooldownRemaining,
  getEventCooldownProgress,
  isEventCooldownActive,
} from "../../game/eventCooldowns";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import { getAvailableSwords, getEffectiveDamagedSwords } from "../../game/equipment";
import { selectAvailableEventMembers, selectContactsAwaitingEmail } from "../../game/selectors";
import { FIRST_EVENT_TUTORIAL_SCENE_ID, isTutorialScenePending } from "../../game/tutorialProgress";
import type { AcquisitionEvent, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

const POTENTIAL_LEVELS = ["Molto bassa", "Bassa", "Media", "Alta", "Altissima"] as const;

// Fase 8: the «risk» is how much the number of contacts varies, not a danger.
const OUTCOME_LABELS: Record<AcquisitionEventDefinition["risk"], string> = {
  Basso: "sicuro",
  Medio: "variabile",
  Alto: "imprevedibile",
};

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("it-IT")} ${count === 1 ? singular : plural}`;
}

function memberRequirement(count: number) {
  return quantityLabel(count, "iscritto", "iscritti");
}

// Fase 8: the seconds ring at the left of the event button (concept A+B).
function EventRing({ value, label }: { value: number; label: string }) {
  return (
    <span className="event-action-ring" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <circle className="event-action-ring-track" cx="18" cy="18" r="15.9155" />
        <circle
          className="event-action-ring-arc"
          cx="18"
          cy="18"
          r="15.9155"
          strokeDasharray={`${Math.min(100, Math.max(0, value))} 100`}
        />
      </svg>
      {label ? <span>{label}</span> : <i className="event-action-play" />}
    </span>
  );
}

function getEventProgress(event: AcquisitionEvent, now: number) {
  const duration = event.resolvesAt - event.startedAt;
  if (duration <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - event.startedAt) / duration) * 100));
}

export function EventsView({
  state: stateOverride,
  onStart,
  onCancel = () => undefined,
}: {
  state?: GameState;
  onStart: (definitionId: AcquisitionEvent["definitionId"]) => void;
  onCancel?: (eventId: string) => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "activities",
      "collaborators",
      "contacts",
      "equipment",
      "network",
      "school",
      "tutorial",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const [fallbackNow] = useState(Date.now);
  const runningEvents = useMemo(
    () => state.acquisitionEvents.filter((event) => event.status === "running"),
    [state.acquisitionEvents],
  );
  const timeSource = useGameTimeSource();
  const referenceNow = timeSource?.getNow() ?? fallbackNow;
  const hasTimedWork = runningEvents.length > 0 ||
    Object.values(state.activities.eventCooldowns).some((cooldown) =>
      isEventCooldownActive(cooldown, state, referenceNow)
    );
  const clockNow = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const now = timeSource ? clockNow : clockNow || referenceNow;
  const runningByDefinition = useMemo(() => {
    const first = new Map<AcquisitionEvent["definitionId"], AcquisitionEvent>();
    for (const event of runningEvents) {
      if (!first.has(event.definitionId)) first.set(event.definitionId, event);
    }
    return first;
  }, [runningEvents]);
  const runningCounts = getRunningEventCounts(state.acquisitionEvents);
  const extraCopies = getEventExtraCopies(state.upgrades);
  const availableMembers = selectAvailableEventMembers(state);
  const availableSwords = getAvailableSwords(state.equipment);
  const damagedSwords = getEffectiveDamagedSwords(state.equipment);
  const usesTutorialSparringDuration = isTutorialScenePending(state, FIRST_EVENT_TUTORIAL_SCENE_ID);
  const visibleEvents = ACQUISITION_EVENTS.filter(
    (definition) =>
      definition.unlockMembers <= state.school.fame ||
      runningEvents.some((event) => event.definitionId === definition.id),
  );
  return (
    <main className="overview-view events-view">
      <header>
        <Icon name="flag" />
        <div>
          <h1>Eventi</h1>
          <p>Farsi vedere fuori dalla palestra.</p>
        </div>
      </header>
      <div className="event-notice">
        <Icon name="contact" />
        <div>
          <strong>{selectContactsAwaitingEmail(state).toLocaleString("it-IT")} contatti da invitare</strong>
          <span>Ogni nuovo indirizzo riceve una sola campagna email.</span>
        </div>
      </div>
      <section className="event-capacity-note" aria-label="Risorse disponibili per gli eventi">
        <div>
          <Icon name="people" />
          <span>
            <strong>
              {availableMembers.toLocaleString("it-IT")} iscritti liberi su {state.school.activeMembers.toLocaleString("it-IT")}
            </strong>
            <small>Gli iscritti impegnati tornano liberi a fine evento.</small>
          </span>
        </div>
        <div>
          <Icon name="settings" />
          <span>
            <strong>
              {availableSwords.toLocaleString("it-IT")} spade pronte su {state.equipment.totalSwords.toLocaleString("it-IT")}
            </strong>
            <small>
              {damagedSwords > 0
                ? `${quantityLabel(damagedSwords, "spada rotta", "spade rotte")}. ${damagedSwords === 1 ? "Riparala" : "Riparale"} dall'elsa in alto.`
                : "Le spade impegnate tornano in rastrelliera a fine evento."}
            </small>
          </span>
        </div>
      </section>
      <section className="event-list">
        {visibleEvents.map((definition) => {
          const matching = runningByDefinition.get(definition.id);
          const cooldown = state.activities.eventCooldowns[definition.id];
          const onCooldown = isEventCooldownActive(cooldown, state, now);
          const cooldownRemaining =
            cooldown && onCooldown ? formatEventCooldownRemaining(cooldown, state, now) : "";
          const cooldownProgress =
            // The wait drains from full to empty (bar and ring alike).
            cooldown && onCooldown ? 100 - getEventCooldownProgress(cooldown, state, now) : 0;
          const lacksFunds = state.school.euros < definition.cost;
          const lacksMembers = state.school.activeMembers < definition.requiredMembers;
          const lacksAvailableMembers = availableMembers < definition.requiredMembers;
          const lacksEquipment = availableSwords < definition.requiredSwords;
          const needsRepairForEvent =
            lacksEquipment &&
            damagedSwords > 0 &&
            availableSwords + damagedSwords >= definition.requiredSwords;
          const progress = matching ? getEventProgress(matching, now) : 0;
          const displayedDurationMs = matching
            ? matching.resolvesAt - matching.startedAt
            : definition.id === "park-sparring" && usesTutorialSparringDuration
              ? GAME_CONFIG.tutorialSparringDurationMs
              : definition.durationMs;
          const remainingSeconds = matching
            ? Math.max(0, Math.ceil((matching.resolvesAt - now) / 1_000))
            : 0;
          const disabled =
            !matching &&
            Boolean(onCooldown || lacksFunds || lacksAvailableMembers || lacksEquipment);
          const clockLeft = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;
          const durationLabel = quantityLabel(Math.round(displayedDurationMs / 1_000), "secondo", "secondi");
          let action =
            definition.cost === 0
              ? "Partecipa gratis"
              : `Partecipa · ${formatCurrency(definition.cost)}`;
          let main = "Partecipa";
          let detail = `${definition.cost === 0 ? "Gratis" : formatCurrency(definition.cost)} · ${durationLabel}`;
          let ring = { value: 100, label: "" };
          const copiesRunning = runningCounts.get(definition.id) ?? 0;
          if (matching) {
            action = `Annulla · ${clockLeft}`;
            main = copiesRunning > 1 ? `In corso ×${copiesRunning}` : "In corso";
            detail = `finisce tra ${clockLeft}`;
            ring = { value: progress, label: String(remainingSeconds) };
          } else if (onCooldown) {
            action = `Di nuovo tra ${cooldownRemaining}`;
            main = action;
            detail = "si sta ricaricando";
            ring = { value: cooldownProgress, label: cooldownRemaining.split(" ")[0] ?? "" };
          } else if (lacksMembers) {
            action = `Servono ${memberRequirement(definition.requiredMembers)}`;
            detail = `ne hai ${state.school.activeMembers.toLocaleString("it-IT")}`;
          } else if (lacksAvailableMembers) {
            action = `Servono ${memberRequirement(definition.requiredMembers)} liberi`;
            detail = `liberi ora: ${availableMembers.toLocaleString("it-IT")}`;
          } else if (needsRepairForEvent) {
            action = `Ripara ${quantityLabel(damagedSwords, "spada", "spade")}`;
            detail = "dall'elsa in alto";
          } else if (lacksEquipment) {
            action = `Servono ${quantityLabel(definition.requiredSwords, "spada", "spade")}`;
            detail = `pronte: ${availableSwords.toLocaleString("it-IT")}`;
          } else if (lacksFunds) {
            action = `Servono ${formatCurrency(definition.cost)}`;
            detail = `hai ${formatCurrency(state.school.euros)}`;
          }
          // Eventi nel Multiverso: one more copy while it runs, each at double the previous cost.
          const copyCost = getEventCopyCost(definition.cost, copiesRunning);
          const canOfferCopy = Boolean(matching) && copiesRunning <= extraCopies;
          const copyBlocker = state.school.euros < copyCost
            ? `Servono ${formatCurrency(copyCost)}`
            : availableMembers < definition.requiredMembers
              ? `Servono ${memberRequirement(definition.requiredMembers)} liberi`
              : availableSwords < definition.requiredSwords
                ? `Servono ${quantityLabel(definition.requiredSwords, "spada", "spade")}`
                : "";
          const copyContactCut = Math.round((1 - getEventCopyContactMultiplier(copiesRunning)) * 100);
          const copyLabel = `Altra copia · ${copyCost === 0 ? "gratis" : formatCurrency(copyCost)} · −${copyContactCut}% contatti`;
          if (disabled && !onCooldown) {
            main = action;
            ring = { value: 0, label: "!" };
          }

          return (
            <article
              className="event-row"
              key={definition.id}
              data-risk={definition.risk.toLocaleLowerCase("it-IT")}
              data-state={matching ? "running" : onCooldown ? "cooldown" : disabled ? "blocked" : "ready"}
              data-tutorial-region={
                definition.id === "park-sparring" ? "park-sparring-event" : undefined
              }
              data-tutorial-target={definition.id === "park-sparring" ? "true" : undefined}
            >
              <div className="event-copy">
                <div className="event-meta">
                  <span><Icon name="clock" />{Math.round(displayedDurationMs / 1_000)} secondi</span>
                  <span className="event-risk"><Icon name="warning" />Esito {OUTCOME_LABELS[definition.risk]}</span>
                  <span><Icon name="people" />{memberRequirement(definition.requiredMembers)}</span>
                  <span><Icon name="wrench" />{definition.requiredSwords} spade</span>
                </div>
                <h2>{definition.title}</h2>
                <strong>{definition.location}</strong>
                <p>{definition.description}</p>
                <small className="event-potential">
                  <span className="event-potential-meter" aria-hidden="true">
                    {POTENTIAL_LEVELS.map((level, index) => (
                      <i
                        key={level}
                        className={index <= POTENTIAL_LEVELS.indexOf(definition.potential) ? "is-on" : undefined}
                      />
                    ))}
                  </span>
                  Resa: {definition.potential.toLocaleLowerCase("it-IT")}
                </small>
              </div>
              <button
                className={matching ? "event-action event-cancel-button" : "event-action"}
                type="button"
                aria-label={action}
                disabled={disabled}
                data-tutorial-region={
                  definition.id === "park-sparring" ? "park-sparring-action" : undefined
                }
                data-tutorial-target={definition.id === "park-sparring" ? "true" : undefined}
                onClick={() => (matching ? onCancel(matching.id) : onStart(definition.id))}
              >
                {/* Fase 8: avanzamento e attesa riempiono il pulsante, la scheda non cambia altezza. */}
                {matching || onCooldown ? (
                  <ProgressBar
                    className={matching ? "event-action-fill" : "event-action-fill is-cooldown"}
                    ariaHidden
                    value={matching ? progress : cooldownProgress}
                    durationMs={
                      matching
                        ? matching.resolvesAt - matching.startedAt
                        : cooldown?.kind === "realtime"
                          ? cooldown.availableAt - cooldown.startedAt
                          : GAME_CONFIG.gameMonthMs
                    }
                  />
                ) : null}
                <EventRing value={ring.value} label={ring.label} />
                <span className="event-action-text">
                  <span className="event-action-main">{main}</span>
                  <span className="event-action-detail">{detail}</span>
                </span>
                {/* Fase 8: «Annulla» si vede solo sotto il puntatore o con il focus. */}
                {matching ? (
                  <span className="event-action-text event-action-cancel" aria-hidden="true">
                    <span className="event-action-main">Annulla</span>
                    <span className="event-action-detail">l'evento si ferma qui</span>
                  </span>
                ) : null}
              </button>
              {canOfferCopy ? (
                <button
                  className="event-copy-action"
                  type="button"
                  disabled={Boolean(copyBlocker)}
                  title={copyBlocker || "Lo stesso evento, in un universo parallelo"}
                  aria-label={`${copyLabel}: ${definition.title}`}
                  onClick={() => onStart(definition.id)}
                >
                  {copyBlocker || copyLabel}
                </button>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
