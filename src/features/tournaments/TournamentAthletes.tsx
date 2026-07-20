import { useDeferredValue, useMemo, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import {
  getContactPreparation,
  getContactTournamentExperience,
  getNumericFormCount,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { getEligibleSchoolContactsFromRoster } from "../../game/tournamentSimulation";
import { useGameTime } from "../../game/GameTimeContext";
import type { Contact, GameState } from "../../game/types";
import { useVirtualRows } from "../../shared/useVirtualRows";
import {
  findUpcomingTournamentFromSchedule,
  formatTournamentCountdown,
  getUpcomingDelegationContactIdsFromRoster,
} from "./tournamentPresentation";

type QualificationFilter = "all" | "qualified" | "available";
type DisciplineFilter = "all" | "arena" | "style";
type AthleteSort = "preparation" | "name" | "experience" | "form";

const ATHLETE_ROW_HEIGHT = 48;

interface AthleteRow {
  contact: Contact;
  arena: number;
  style: number;
  experience: number;
  formCount: number;
  statsVisible: boolean;
  qualified: boolean;
  qualificationSource?: "Arena" | "Stile";
  podiums: number;
}

interface TournamentAthletesProps {
  state: GameState;
  initialQualificationFilter?: QualificationFilter;
}

function OfficialStat({ value, visible }: { value: number; visible: boolean }) {
  if (!visible) return <span>???</span>;
  return <OfficialStatValue value={value} />;
}

function athleteName(row: AthleteRow): string {
  return `${row.contact.firstName} ${row.contact.lastName}`;
}

export function TournamentAthletes({
  state,
  initialQualificationFilter = "all",
}: TournamentAthletesProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [qualificationFilter, setQualificationFilter] = useState<QualificationFilter>(initialQualificationFilter);
  const [disciplineFilter, setDisciplineFilter] = useState<DisciplineFilter>("all");
  const [formFilter, setFormFilter] = useState("all");
  const [sortBy, setSortBy] = useState<AthleteSort>("preparation");
  const eligible = useMemo(
    () => getEligibleSchoolContactsFromRoster(state.contacts, state.collaborators),
    [state.contacts, state.collaborators],
  );
  const upcoming = useMemo(
    () => findUpcomingTournamentFromSchedule(state.school, state.tournaments),
    [state.school, state.tournaments],
  );
  const now = useGameTime(Boolean(upcoming), 1_000);
  const delegationContactIds = useMemo(
    () => getUpcomingDelegationContactIdsFromRoster(
      state.contacts,
      state.collaborators,
      state.tournaments.qualification,
      upcoming,
    ),
    [state.contacts, state.collaborators, state.tournaments.qualification, upcoming],
  );
  const qualifiedIds = useMemo(
    () => new Set(delegationContactIds),
    [delegationContactIds],
  );
  const collaboratorsByContactId = useMemo(
    () => new Map(state.collaborators.map((entry) => [entry.contactId, entry])),
    [state.collaborators],
  );
  const qualificationSourceByContactId = useMemo(() => {
    const sources = new Map<string, "Arena" | "Stile">();
    for (const result of state.tournaments.results) {
      for (const qualifier of result.qualifiers) {
        if (qualifier.ownedContactId) {
          sources.set(qualifier.ownedContactId, qualifier.source === "arena" ? "Arena" : "Stile");
        }
      }
    }
    return sources;
  }, [state.tournaments.results]);
  const podiumCountByContactId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const result of state.tournaments.results) {
      const participantById = new Map(result.participants.map((participant) => [participant.id, participant]));
      for (const entry of [...result.arenaPodium, ...result.stylePodium]) {
        const contactId = participantById.get(entry.participantId)?.ownedContactId;
        if (contactId) counts.set(contactId, (counts.get(contactId) ?? 0) + 1);
      }
    }
    return counts;
  }, [state.tournaments.results]);
  const rows = useMemo<AthleteRow[]>(() => eligible.map((contact) => {
    const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
    const preparation = getContactPreparation(contact, forms);
    return {
      contact,
      arena: preparation.arena,
      style: preparation.style,
      experience: getContactTournamentExperience(contact),
      formCount: getNumericFormCount(forms),
      statsVisible: hasCompletedCourseX(forms),
      qualified: qualifiedIds.has(contact.id),
      qualificationSource: qualificationSourceByContactId.get(contact.id),
      podiums: podiumCountByContactId.get(contact.id) ?? 0,
    };
  }), [
    collaboratorsByContactId,
    eligible,
    podiumCountByContactId,
    qualificationSourceByContactId,
    qualifiedIds,
  ]);
  const formOptions = useMemo(
    () => [...new Set(rows.map((row) => row.formCount))].sort((a, b) => a - b),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase("it-IT");
    return rows.filter((row) => {
      if (normalizedSearch && !athleteName(row).toLocaleLowerCase("it-IT").includes(normalizedSearch)) return false;
      if (qualificationFilter === "qualified" && !row.qualified) return false;
      if (qualificationFilter === "available" && row.qualified) return false;
      if (disciplineFilter === "arena" && row.arena < row.style) return false;
      if (disciplineFilter === "style" && row.style <= row.arena) return false;
      if (formFilter !== "all" && row.formCount !== Number(formFilter)) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === "name") return athleteName(a).localeCompare(athleteName(b), "it-IT");
      if (sortBy === "experience") return b.experience - a.experience;
      if (sortBy === "form") return b.formCount - a.formCount;
      return (b.arena + b.style) - (a.arena + a.style);
    });
  }, [deferredSearch, disciplineFilter, formFilter, qualificationFilter, rows, sortBy]);
  const qualifiedRows = useMemo(
    () => rows.filter((row) => row.qualified),
    [rows],
  );
  const virtualRows = useVirtualRows({
    count: filteredRows.length,
    rowHeight: ATHLETE_ROW_HEIGHT,
  });
  const renderedRows = filteredRows.slice(virtualRows.startIndex, virtualRows.endIndex);
  const resetFilters = () => {
    setSearch("");
    setQualificationFilter("all");
    setDisciplineFilter("all");
    setFormFilter("all");
    setSortBy("preparation");
  };

  return (
    <div className="tournament-athletes-view">
      <section className="tournament-context-strip" aria-label="Prossimo torneo">
        <strong>{upcoming ? TOURNAMENT_DEFINITIONS[upcoming.level].label : "Stagione completata"}</strong>
        <span><b>{qualifiedIds.size}/6</b> qualificati</span>
        <span>Inizia tra <b>{upcoming ? formatTournamentCountdown(upcoming.occursAt - now) : "—"}</b></span>
        <i aria-hidden="true"><b style={{ width: `${Math.min(100, (qualifiedIds.size / 6) * 100)}%` }} /></i>
      </section>

      <section className="athlete-roster" aria-labelledby="athlete-roster-title">
        <header><h2 id="athlete-roster-title">Atleti della scuola</h2><span>{filteredRows.length} atleti</span></header>
        <div className="athlete-filters">
          <label className="athlete-search"><Icon name="search" /><span className="sr-only">Cerca atleta</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca atleta" /></label>
          <label><span className="sr-only">Qualificazione</span><select aria-label="Qualificazione" value={qualificationFilter} onChange={(event) => setQualificationFilter(event.target.value as QualificationFilter)}><option value="all">Qualificazione: Tutti</option><option value="qualified">Qualificazione: Qualificati</option><option value="available">Qualificazione: Disponibili</option></select></label>
          <label><span className="sr-only">Disciplina</span><select aria-label="Disciplina" value={disciplineFilter} onChange={(event) => setDisciplineFilter(event.target.value as DisciplineFilter)}><option value="all">Disciplina: Tutte</option><option value="arena">Disciplina: Arena</option><option value="style">Disciplina: Stile</option></select></label>
          <label><span className="sr-only">Forma</span><select aria-label="Forma" value={formFilter} onChange={(event) => setFormFilter(event.target.value)}><option value="all">Forma: Tutte</option>{formOptions.map((form) => <option key={form} value={form}>Forma: {form}</option>)}</select></label>
          <label><span className="sr-only">Ordinamento</span><select aria-label="Ordinamento" value={sortBy} onChange={(event) => setSortBy(event.target.value as AthleteSort)}><option value="preparation">Ordina: Preparazione</option><option value="name">Ordina: Nome</option><option value="experience">Ordina: Esperienza</option><option value="form">Ordina: Forma</option></select></label>
          <button type="button" onClick={resetFilters}>Azzera filtri</button>
        </div>

        <div
          className="athlete-table-wrap virtualized-athlete-table"
          onScroll={virtualRows.onScroll}
        >
          <table className="athlete-table">
            <thead><tr><th>#</th><th>Atleta</th><th>Stato</th><th>Forma</th><th>Arena</th><th>Stile</th><th>Esperienza</th><th>Qualificazione</th><th>Podi</th></tr></thead>
            <tbody>
              {virtualRows.paddingTop > 0 ? (
                <tr className="virtual-table-spacer" aria-hidden="true">
                  <td colSpan={9} style={{ height: virtualRows.paddingTop }} />
                </tr>
              ) : null}
              {renderedRows.map((row, index) => (
                <tr key={row.contact.id} className={row.qualified ? "is-qualified" : ""}>
                  <td>{virtualRows.startIndex + index + 1}</td>
                  <th scope="row" className={row.contact.secretLegendaryId ? "secret-legendary" : ""}>{athleteName(row)}</th>
                  <td><span className={row.qualified ? "athlete-status qualified" : "athlete-status"}><i aria-hidden="true">{row.qualified ? "✓" : "–"}</i>{row.qualified ? "Qualificato" : "Disponibile"}</span></td>
                  <td>Forma {row.formCount}</td>
                  <td><OfficialStat value={row.arena} visible={row.statsVisible} /></td>
                  <td><OfficialStat value={row.style} visible={row.statsVisible} /></td>
                  <td>{row.experience}</td>
                  <td>{row.qualified ? row.qualificationSource ?? "Delegazione" : "—"}</td>
                  <td>{row.podiums}</td>
                </tr>
              ))}
              {virtualRows.paddingBottom > 0 ? (
                <tr className="virtual-table-spacer" aria-hidden="true">
                  <td colSpan={9} style={{ height: virtualRows.paddingBottom }} />
                </tr>
              ) : null}
            </tbody>
          </table>
          {filteredRows.length === 0 ? <p className="empty-tournaments">Nessun atleta corrisponde ai filtri selezionati.</p> : null}
        </div>
      </section>

      <section className="athlete-summary" aria-label="Riepilogo delegazione">
        <strong>{qualifiedRows.length} atleti qualificati · {qualifiedRows.length >= 6 ? "delegazione completa" : "delegazione in preparazione"}</strong>
        <span>Arena <b>{qualifiedRows.length > 0 && qualifiedRows.every((row) => row.statsVisible) ? (qualifiedRows.reduce((sum, row) => sum + row.arena, 0) / qualifiedRows.length).toFixed(3) : "???"}</b></span>
        <span>Stile <b>{qualifiedRows.length > 0 && qualifiedRows.every((row) => row.statsVisible) ? (qualifiedRows.reduce((sum, row) => sum + row.style, 0) / qualifiedRows.length).toFixed(3) : "???"}</b></span>
      </section>
    </div>
  );
}
