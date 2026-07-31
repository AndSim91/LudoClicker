import { useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ACQUISITION_EVENTS } from "../../content/events";
import { GAME_CONFIG } from "../../game/config";
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

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

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
      <header>
        <Icon name="flag" />
        <div>
          <h1>Eventi</h1>
          <p>Attività esterne per incontrare persone e raccogliere nuovi contatti</p>
        </div>
      </header>
      <div className="event-notice">
        <Icon name="contact" />
        <div>
          <strong>{selectContactsAwaitingEmail(state)} contatti da contattare</strong>
          <span>Ogni nuovo indirizzo può ricevere una sola campagna email.</span>
        </div>
      </div>
      <section className="event-capacity-note" aria-label="Risorse disponibili per gli eventi">
        <div>
          <Icon name="people" />
          <span>
            <strong>
              {availableMembers}/{state.school.activeMembers} iscritti disponibili
            </strong>
            <small>Gli iscritti impegnati tornano disponibili a fine evento.</small>
          </span>
        </div>
        <div>
          <Icon name="settings" />
          <span>
            <strong>
              {availableSwords}/{state.equipment.totalSwords} spade disponibili
            </strong>
            <small>
              {damagedSwords > 0
                ? `${quantityLabel(damagedSwords, "spada danneggiata", "spade danneggiate")}. Riparale da La mia giornata.`
                : "Le spade impegnate tornano disponibili a fine attivita."}
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
          let action =
            definition.cost === 0
              ? "Partecipa gratis"
              : `Partecipa · ${formatCurrency(definition.cost)}`;
          if (matching) action = "Annulla evento";
          else if (onCooldown) action = `Disponibile tra ${cooldownRemaining}`;
          else if (lacksMembers)
            action = `Richiede ${memberRequirement(definition.requiredMembers)}`;
          else if (lacksAvailableMembers)
            action = `Servono ${memberRequirement(definition.requiredMembers)} liberi`;
          else if (needsRepairForEvent)
            action = `Ripara ${quantityLabel(damagedSwords, "spada", "spade")}`;
          else if (lacksEquipment) action = `Richiede ${definition.requiredSwords} spade`;
          else if (lacksFunds) action = `Servono ${formatCurrency(definition.cost)}`;

          return (
            <article
              className="event-row"
              key={definition.id}
              data-tutorial-region={
                definition.id === "park-sparring" ? "park-sparring-event" : undefined
              }
              data-tutorial-target={definition.id === "park-sparring" ? "true" : undefined}
            >
              <div className="event-copy">
                <div className="event-meta">
                  <span>{Math.round(displayedDurationMs / 1_000)} secondi</span>
                  <span>Rischio {definition.risk.toLocaleLowerCase("it-IT")}</span>
                  <span>{memberRequirement(definition.requiredMembers)}</span>
                  <span>{definition.requiredSwords} spade</span>
                </div>
                <h2>{definition.title}</h2>
                <strong>{definition.location}</strong>
                <p>{definition.description}</p>
                <small className="event-potential">Potenzialità: {definition.potential}</small>
                {matching ? (
                  <div className="event-progress-block">
                    <div className="event-progress-label">
                      <span>Attività in corso</span>
                      <strong>
                        {remainingSeconds} s rimanenti · {Math.round(progress)}%
                      </strong>
                    </div>
                    <ProgressBar
                      className="event-progress"
                      label={`Avanzamento ${definition.title}`}
                      value={progress}
                      durationMs={matching.resolvesAt - matching.startedAt}
                    />
                  </div>
                ) : cooldown && onCooldown ? (
                  <div className="event-progress-block event-cooldown-block">
                    <div className="event-progress-label">
                      <span>In attesa del prossimo evento</span>
                      <strong>{cooldownRemaining}</strong>
                    </div>
                    <ProgressBar
                      className="event-progress event-cooldown-progress"
                      label={`Cooldown ${definition.title}`}
                      value={cooldownProgress}
                      valueText={`Disponibile tra ${cooldownRemaining}`}
                      durationMs={
                        cooldown.kind === "realtime"
                          ? cooldown.availableAt - cooldown.startedAt
                          : GAME_CONFIG.gameMonthMs
                      }
                    />
                  </div>
                ) : null}
              </div>
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
            </article>
          );
        })}
      </section>
    </main>
  );
}
