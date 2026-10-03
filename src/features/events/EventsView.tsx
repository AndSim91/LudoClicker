import { useMemo, useState } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ACQUISITION_EVENTS, type AcquisitionEventDefinition } from "../../content/events";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  formatEventCooldownRemaining,
  getEventCooldownProgress,
  isEventCooldownActive,
} from "../../game/eventCooldowns";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import { getAvailableSwords, getEffectiveDamagedSwords } from "../../game/equipment";
import { canStartAcquisitionEvent } from "../../game/eventFlow";
import { selectAvailableEventMembers, selectContactsAwaitingEmail } from "../../game/selectors";
import { FIRST_EVENT_TUTORIAL_SCENE_ID, isTutorialScenePending } from "../../game/tutorialProgress";
import type { AcquisitionEvent, GameState } from "../../game/types";
import { formatCurrency, formatList } from "../../shared/formatters";

function formatClockSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const POTENTIAL_LEVELS = ["Molto bassa", "Bassa", "Media", "Alta", "Altissima"] as const;

// Fase 8: the «risk» is how much the number of contacts varies, not a danger.
const OUTCOME_LABELS: Record<AcquisitionEventDefinition["risk"], string> = {
  Basso: "Sicuro",
  Medio: "Variabile",
  Alto: "Imprevedibile",
};

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const count = (value: number) => value.toLocaleString("it-IT");

function memberRequirement(count: number) {
  return quantityLabel(count, "iscritto", "iscritti");
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
  const runningByDefinition = useMemo(
    () => new Map(runningEvents.map((event) => [event.definitionId, event])),
    [runningEvents],
  );
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
      {/* Fase 8: one line of numbers; the explanations sit in each number's tooltip. */}
      <header className="events-heading">
        <div>
          <h1>Eventi</h1>
          <p>Farsi vedere fuori dalla palestra.</p>
        </div>
        <section className="event-capacity-note" aria-label="Risorse disponibili per gli eventi">
          <span title="Ogni nuovo indirizzo riceve una sola campagna email.">
            <strong>{count(selectContactsAwaitingEmail(state))}</strong> contatti da invitare
          </span>
          <span title="Gli iscritti impegnati tornano liberi a fine evento.">
            <strong>{count(availableMembers)}</strong> iscritti liberi su {count(state.school.activeMembers)}
          </span>
          <span
            title={damagedSwords > 0
              ? `${quantityLabel(damagedSwords, "spada rotta", "spade rotte")}: ${damagedSwords === 1 ? "riparala" : "riparale"} da La mia giornata.`
              : "Le spade impegnate tornano in rastrelliera a fine evento."}
          >
            <strong>{count(availableSwords)}</strong> spade pronte
            {damagedSwords > 0 ? <em>, {count(damagedSwords)} {damagedSwords === 1 ? "rotta" : "rotte"}</em> : null}
          </span>
        </section>
      </header>
      <section className="event-list">
        {visibleEvents.map((definition) => {
          const matching = runningByDefinition.get(definition.id);
          const cooldown = state.activities.eventCooldowns[definition.id];
          const onCooldown = isEventCooldownActive(cooldown, state, now);
          const cooldownRemaining =
            cooldown && onCooldown ? formatEventCooldownRemaining(cooldown, state, now) : "";
          const cooldownProgress =
            cooldown && onCooldown ? 100 - getEventCooldownProgress(cooldown, state, now) : 0;
          const lacksFunds = state.school.euros < definition.cost;
          const lacksMembers = state.school.activeMembers < definition.requiredMembers;
          const lacksAvailableMembers = availableMembers < definition.requiredMembers;
          const lacksEquipment = availableSwords < definition.requiredSwords;
          const needsRepairForEvent =
            lacksEquipment &&
            damagedSwords > 0 &&
            availableSwords + damagedSwords >= definition.requiredSwords;
          // Eventi schools can start the same event a second time while it runs.
          const canRunAgain = Boolean(matching) && state.school.specialization === "eventi" &&
            canStartAcquisitionEvent(state, definition.id, now);
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
          let action =
            definition.cost === 0
              ? "Partecipa gratis"
              : `Partecipa · ${formatCurrency(definition.cost)}`;
          if (matching) action = "Annulla";
          else if (onCooldown) action = `Di nuovo tra ${cooldownRemaining}`;
          else if (lacksMembers)
            action = `Servono ${memberRequirement(definition.requiredMembers)}`;
          else if (lacksAvailableMembers)
            action = `Servono ${memberRequirement(definition.requiredMembers)} liberi`;
          else if (needsRepairForEvent)
            action = `Ripara ${quantityLabel(damagedSwords, "spada", "spade")}`;
          else if (lacksEquipment) action = `Servono ${quantityLabel(definition.requiredSwords, "spada", "spade")}`;
          else if (lacksFunds) action = `Servono ${formatCurrency(definition.cost)}`;
          const needs = formatList([
            definition.requiredMembers > 0 ? memberRequirement(definition.requiredMembers) : "",
            definition.requiredSwords > 0 ? quantityLabel(definition.requiredSwords, "spada", "spade") : "",
          ].filter(Boolean)) || "Niente";
          const potentialStep = POTENTIAL_LEVELS.indexOf(definition.potential);

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
                <div className="event-title">
                  <h2>{definition.title}</h2>
                  <span>{definition.location}</span>
                </div>
                <p>{definition.description}</p>
                {matching ? (
                  <div className="event-progress-block">
                    <ProgressBar
                      className="event-progress"
                      label={`Avanzamento ${definition.title}`}
                      value={progress}
                      durationMs={matching.resolvesAt - matching.startedAt}
                    />
                    <span>finisce tra {formatClockSeconds(remainingSeconds)}</span>
                  </div>
                ) : cooldown && onCooldown ? (
                  <div className="event-progress-block event-cooldown-block">
                    <ProgressBar
                      className="event-progress event-cooldown-progress"
                      label={`Cooldown ${definition.title}`}
                      value={cooldownProgress}
                      valueText={`Di nuovo tra ${cooldownRemaining}`}
                      durationMs={
                        cooldown.kind === "realtime"
                          ? cooldown.availableAt - cooldown.startedAt
                          : GAME_CONFIG.gameMonthMs
                      }
                    />
                  </div>
                ) : null}
              </div>
              <dl className="event-facts">
                <dt>Esito</dt>
                <dd>{OUTCOME_LABELS[definition.risk]}</dd>
                <dt>Serve</dt>
                <dd>{needs}</dd>
                <dt>Dura</dt>
                <dd>{Math.round(displayedDurationMs / 1_000)} secondi</dd>
                <dt>Resa</dt>
                <dd className="event-potential" aria-label={`Resa: ${definition.potential}`} title={definition.potential}>
                  {POTENTIAL_LEVELS.map((level, index) => (
                    <i key={level} className={index <= potentialStep ? "is-on" : undefined} />
                  ))}
                </dd>
              </dl>
              <button
                className={matching ? "event-cancel-button" : undefined}
                type="button"
                disabled={disabled}
                data-tutorial-region={
                  definition.id === "park-sparring" ? "park-sparring-action" : undefined
                }
                data-tutorial-target={definition.id === "park-sparring" ? "true" : undefined}
                onClick={() => (matching ? onCancel(matching.id) : onStart(definition.id))}
              >
                {action}
              </button>
              {canRunAgain ? (
                <button type="button" onClick={() => onStart(definition.id)}>
                  {definition.cost === 0
                    ? "Secondo turno"
                    : `Secondo turno · ${formatCurrency(definition.cost)}`}
                </button>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
