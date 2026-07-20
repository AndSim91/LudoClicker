import { useMemo, useState } from "react";
import { SECRET_LEGENDARIES } from "../../content/secretLegendaries";
import {
  getContactPreparation,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { GAME_CONFIG } from "../../game/config";
import { getEligibleSchoolContactsFromRoster } from "../../game/tournamentSimulation";
import type {
  GameState,
  RockPaperScissorsChoice,
} from "../../game/types";
import { ChroniclesChoiceIcon, ChroniclesKeyIcon } from "./ChroniclesIcons";

interface ChroniclesViewProps {
  state: GameState;
  onStartTournament: (contactIds: string[]) => void;
  onPlayHand: (choice: RockPaperScissorsChoice) => void;
}

const CHOICE_LABELS: Record<RockPaperScissorsChoice, string> = {
  rock: "Sasso",
  paper: "Carta",
  scissors: "Forbice",
};

function ChroniclesDuel({ state, onPlayHand }: Pick<ChroniclesViewProps, "state" | "onPlayHand">) {
  const challenge = state.tournaments.chronicles.activeChallenge!;
  const profile = SECRET_LEGENDARIES[challenge.legendaryId];
  const displayName = `${profile.firstName} ${profile.lastName}`;
  const legendaryLabel = profile.firstName.toLocaleUpperCase("it-IT");
  const initial = profile.firstName.charAt(0).toLocaleUpperCase("it-IT");
  return (
    <section className="chronicles-duel" aria-labelledby="chronicles-duel-title">
      <div className="chronicles-duel-heading">
        <div className="chronicles-monogram" aria-hidden="true"><span>{initial}</span></div>
        <div>
          <h2 id="chronicles-duel-title">Sfida leggendaria</h2>
          <strong>{displayName}</strong>
          <p>Vinci 2 mani su 3 per farlo entrare nella tua scuola.</p>
          <small>Vittoria {challenge.discipline === "arena" ? "Arena" : "Stile"}</small>
        </div>
      </div>
      <div className="chronicles-score" aria-label={`Punteggio: tu ${challenge.playerWins}, ${profile.firstName} ${challenge.legendaryWins}`}>
        <span><small>TU</small><strong>{challenge.playerWins}</strong></span>
        <i aria-hidden="true" />
        <span><small>{legendaryLabel}</small><strong>{challenge.legendaryWins}</strong></span>
        <em>{challenge.playerWins === 1 && challenge.legendaryWins === 1 ? "Mano decisiva" : "Primo a 2"}</em>
      </div>
      <div className="chronicles-choice-area">
        <div className="chronicles-choice-controls">
          <h3>Scegli la tua mossa</h3>
          <div>
            {(["paper", "scissors", "rock"] as const).map((choice) => (
              <button key={choice} type="button" onClick={() => onPlayHand(choice)} aria-label={`Gioca ${CHOICE_LABELS[choice]}`}>
                <ChroniclesChoiceIcon choice={choice} />
                <strong>{CHOICE_LABELS[choice]}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="chronicles-hand-history">
          <h3>Mani giocate</h3>
          {challenge.hands.length > 0 ? (
            <ol>
              {challenge.hands.slice(-5).map((hand, index) => (
                <li key={`${hand.playerChoice}-${hand.legendaryChoice}-${index}`}>
                  <span>{CHOICE_LABELS[hand.playerChoice]}</span>
                  <b>vs</b>
                  <span>{CHOICE_LABELS[hand.legendaryChoice]}</span>
                  <em>{hand.outcome === "draw"
                    ? "Pareggio · si rigioca"
                    : hand.outcome === "player" ? "Mano vinta" : "Mano persa"}</em>
                </li>
              ))}
            </ol>
          ) : <p>La prima mano deve ancora essere giocata.</p>}
        </div>
      </div>
      <footer>Completa questa sfida per poter usare un’altra chiave Chronicles.</footer>
    </section>
  );
}

export function ChroniclesView({ state, onStartTournament, onPlayHand }: ChroniclesViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const eligible = useMemo(
    () => getEligibleSchoolContactsFromRoster(state.contacts, state.collaborators),
    [state.collaborators, state.contacts],
  );
  const collaboratorsByContactId = useMemo(
    () => new Map(state.collaborators.map((collaborator) => [collaborator.contactId, collaborator])),
    [state.collaborators],
  );
  const eligibleIds = useMemo(() => new Set(eligible.map((contact) => contact.id)), [eligible]);
  const activeSelectedIds = selectedIds
    .filter((id) => eligibleIds.has(id))
    .slice(0, GAME_CONFIG.chroniclesTeamSize);

  const chronicles = state.tournaments.chronicles;
  if (chronicles.activeChallenge) {
    return <ChroniclesDuel state={state} onPlayHand={onPlayHand} />;
  }
  if (!chronicles.unlocked) {
    return (
      <section className="chronicles-locked" aria-labelledby="chronicles-locked-title">
        <ChroniclesKeyIcon />
        <h2 id="chronicles-locked-title">Chronicles of Ludosport</h2>
        <p>Vinci Arena e Stile nella stessa edizione della Champion&apos;s Arena per ottenere la prima chiave.</p>
      </section>
    );
  }

  const selected = activeSelectedIds.flatMap((id) => {
    const contact = eligible.find((candidate) => candidate.id === id);
    return contact ? [contact] : [];
  });
  const toggleSelection = (contactId: string) => {
    setSelectedIds((current) => {
      const valid = current.filter((id) => eligibleIds.has(id));
      return valid.includes(contactId)
        ? valid.filter((id) => id !== contactId)
        : valid.length < GAME_CONFIG.chroniclesTeamSize ? [...valid, contactId] : valid;
    });
  };
  const preparationFor = (contact: GameState["contacts"][number]) => {
    const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
    return {
      values: getContactPreparation(contact, forms),
      visible: hasCompletedCourseX(forms),
    };
  };
  const canStart = chronicles.keys > 0 &&
    activeSelectedIds.length === GAME_CONFIG.chroniclesTeamSize;

  return (
    <div className="chronicles-lobby">
      <header className="chronicles-banner">
        <span className="chronicles-key-emblem"><ChroniclesKeyIcon /></span>
        <div>
          <h2>Chronicles of Ludosport</h2>
          <strong>{chronicles.keys} {chronicles.keys === 1 ? "chiave disponibile" : "chiavi disponibili"}</strong>
          <p>Seleziona 6 atleti. La chiave verrà consumata all’avvio del torneo.</p>
        </div>
      </header>
      <div className="chronicles-selection">
        <section className="chronicles-available" aria-labelledby="chronicles-available-title">
          <header><h3 id="chronicles-available-title">Atleti disponibili</h3></header>
          <div className="chronicles-roster-head"><span>Atleta</span><span>Arena</span><span>Stile</span></div>
          <div className="chronicles-roster-list">
            {eligible.map((contact) => {
              const preparation = preparationFor(contact);
              const checked = activeSelectedIds.includes(contact.id);
              const full = activeSelectedIds.length >= GAME_CONFIG.chroniclesTeamSize && !checked;
              return (
                <label key={contact.id} className={checked ? "is-selected" : full ? "is-disabled" : ""}>
                  <input type="checkbox" checked={checked} disabled={full} onChange={() => toggleSelection(contact.id)} />
                  <strong>{contact.firstName} {contact.lastName}</strong>
                  <span>{preparation.visible ? preparation.values.arena.toFixed(3) : "???"}</span>
                  <span>{preparation.visible ? preparation.values.style.toFixed(3) : "???"}</span>
                </label>
              );
            })}
            {eligible.length === 0 ? <p>Nessun atleta con Forma 1 è disponibile.</p> : null}
          </div>
        </section>
        <section className="chronicles-selected" aria-labelledby="chronicles-selected-title">
          <header>
            <h3 id="chronicles-selected-title">Squadra selezionata</h3>
            <span>{selected.length} / {GAME_CONFIG.chroniclesTeamSize}</span>
          </header>
          <div className="chronicles-selected-head"><span>#</span><span>Atleta</span><span>Arena</span><span>Stile</span><span /></div>
          <ol>
            {selected.map((contact, index) => {
              const preparation = preparationFor(contact);
              return (
                <li key={contact.id}>
                  <b>{index + 1}</b>
                  <strong>{contact.firstName} {contact.lastName}</strong>
                  <span>{preparation.visible ? preparation.values.arena.toFixed(3) : "???"}</span>
                  <span>{preparation.visible ? preparation.values.style.toFixed(3) : "???"}</span>
                  <button type="button" onClick={() => toggleSelection(contact.id)} aria-label={`Rimuovi ${contact.firstName} ${contact.lastName}`}>×</button>
                </li>
              );
            })}
          </ol>
          <footer>
            <button type="button" className="secondary" disabled={selected.length === 0} onClick={() => setSelectedIds([])}>Svuota squadra</button>
            <button type="button" className="primary" disabled={!canStart} onClick={() => onStartTournament(activeSelectedIds)}>
              <ChroniclesKeyIcon /> Avvia le Chronicles
            </button>
          </footer>
          {chronicles.keys === 0 ? <p className="chronicles-no-key">Conquista un’altra chiave alla Champion&apos;s Arena.</p> : null}
        </section>
      </div>
    </div>
  );
}
