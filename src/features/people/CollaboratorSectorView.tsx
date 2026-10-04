import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { EquipmentConditionBar } from "../../components/equipment/EquipmentConditionBar";
import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import {
  isAgonistCourseUnlocked,
  isAthleticPreparationUnlocked,
  isCourseXUnlocked,
} from "../../content/upgrades";
import { GAME_CONFIG } from "../../game/config";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime, useGameTimeSource } from "../../game/GameTimeContext";
import { getCollaboratorAssignmentCounts } from "../../game/collaboratorManagement";
import { getEquipmentAutomaticRepairTarget } from "../../game/equipment";
import { hasGadgetRuntimeWork } from "../../game/gadgetEconomy";
import { isSummerBreak } from "../../game/calendar";
import {
  selectActiveEmail,
  selectAthleticPreparationInstructorIds,
} from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  FormId,
  GameState,
} from "../../game/types";
import { AggregatedTeachingBar } from "./AggregatedTeachingBar";
import { groupInstructorTeachingEntries } from "./aggregatedTeachingPresentation";
import { CollaboratorSectorPanel } from "./CollaboratorSectorPanel";
import {
  getCollaboratorAutomationPresentation,
  getEmailAutomationPresentation,
  getSocialContentAutomationPresentation,
} from "./collaboratorAutomationPresentation";
import {
  getAvailableInstructorCourses,
  getInternalInstructorCourseEntries,
  getInstructorCoverageForms,
  getInstructorTeachingEntries,
  getTechnicianCourseEntries,
  getTechnicianCoverageForms,
} from "./instructorGroupPresentation";
import { InstructorActivityLane } from "./InstructorActivityLane";
import { InternalInstructorCourseList } from "./InternalInstructorCourseList";
import { FormLogoStrip } from "./PersonPresentation";
import { SectorMasteryIndicator } from "./SectorMasteryIndicator";
import { GadgetRevenueRanking } from "./GadgetRevenueRanking";

const STANDARD_ROLES: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
];
const ignoreAutomaticTeachingToggle = () => undefined;

const ROLE_PRESENTATION: Record<
  CollaboratorMasteryRole,
  { icon: IconName; description: string }
> = {
  writing: {
    icon: "megaphone",
    description: "Post, video e follower. Qualcuno deve pur rispondere ai commenti.",
  },
  events: {
    icon: "calendar",
    description: "Portano la scuola fuori dalla palestra e tornano con i contatti.",
  },
  equipment: {
    icon: "wrench",
    description: "Riparano le spade. Ce n'è sempre almeno una rotta.",
  },
  instructor: {
    icon: "people",
    description: "Insegnano le Forme e preparano gli agonisti. Con pazienza infinita.",
  },
  gadget: {
    icon: "gift",
    description: "Inventano, collaudano e vendono i Gadget della scuola.",
  },
};

function StaffingStepper({
  label,
  actual,
  target,
  available,
  locked,
  onIncrement,
  onDecrement,
}: {
  label: string;
  actual: number;
  target: number;
  available: number;
  locked: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const transitioning = !locked && actual !== target;
  return (
    <div className="sector-staffing-stepper" aria-label={`Collaboratori in ${label}`}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={locked || target <= 0}
        aria-label={`Riduci collaboratori in ${label}`}
      >
        <Icon name="minus" />
      </button>
      <span>
        <strong>{actual}</strong>
        {transitioning ? <small>→ {target}</small> : null}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={locked || available <= 0}
        aria-label={`Aumenta collaboratori in ${label}`}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}

function StandardSectorCard({
  state: stateOverride,
  role,
  actual,
  target,
  available,
  locked,
  now,
  onIncrement,
  onDecrement,
  onOpen,
}: {
  state?: GameState;
  role: CollaboratorMasteryRole;
  actual: number;
  target: number;
  available: number;
  locked: boolean;
  now: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpen: () => void;
}) {
  const state = useGameStateSlices(
    [
      "acquisitionEvents",
      "automation",
      "collaboratorManagement",
      "collaborators",
      "contacts",
      "emails",
      "equipment",
      "gadgets",
      "network",
      "player",
      "school",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const label = getCollaboratorAssignmentLabel(role, state.unlocks.social);
  const assigned = state.collaborators.filter((collaborator) => collaborator.assignment === role);
  const activeEmail = selectActiveEmail(state);
  let representative = assigned[0];
  if (role === "events") {
    const nextEvent = [...state.acquisitionEvents]
      .filter((event) => event.status === "running" && event.collaboratorId)
      .sort((a, b) => a.resolvesAt - b.resolvesAt)[0];
    representative = nextEvent
      ? state.collaborators.find((collaborator) => collaborator.id === nextEvent.collaboratorId) ?? representative
      : representative;
  }
  const activity = representative
    ? getCollaboratorAutomationPresentation({
        state,
        collaboratorId: representative.id,
        assignment: role,
        now,
        activeEmail,
      })
    : { title: "In attesa", detail: "Nessuno qui, per ora." };
  const socialActivities = role === "writing" && state.unlocks.social
    ? [
        getSocialContentAutomationPresentation(
          state,
          activeEmail?.status === "writing",
        ),
        getEmailAutomationPresentation(state, activeEmail),
      ]
    : undefined;
  return (
    <article className={`collaborator-sector-card${assigned.length === 0 ? " is-empty" : ""}${socialActivities ? " has-workstreams" : ""}${role === "gadget" ? " is-gadget-ranking" : ""}`}>
      <header>
        <span className="sector-card-icon"><Icon name={ROLE_PRESENTATION[role].icon} /></span>
        <span>
          <h3>{label}</h3>
          <small>{ROLE_PRESENTATION[role].description}</small>
        </span>
        <StaffingStepper
          label={label}
          actual={actual}
          target={target}
          available={available}
          locked={locked}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      </header>

      {role === "gadget" ? (
        <GadgetRevenueRanking
          monthlyRevenue={state.gadgets.monthlyRevenue}
          currentMonth={state.school.currentMonth}
          mastery={<SectorMasteryIndicator collaborators={assigned} role={role} />}
        />
      ) : socialActivities ? (
        <div className="sector-card-workstreams">
          {socialActivities.map((workstream, index) => (
            <section
              key={workstream.title}
              className={`sector-card-workstream${workstream.inactive ? " is-inactive" : ""}`}
              aria-label={workstream.inactive
                ? `${workstream.title} inattiva`
                : workstream.title}
            >
              <div className="sector-card-workstream-heading">
                <span>
                  <strong>{workstream.title}</strong>
                  {workstream.detail ? <span>{workstream.detail}</span> : null}
                </span>
                {index === 0
                  ? <SectorMasteryIndicator collaborators={assigned} role={role} />
                  : null}
              </div>
              {workstream.progress === undefined ? (
                <div className="sector-card-waiting"><span /></div>
              ) : (
                <div className="sector-card-progress">
                  <ProgressBar
                    label={workstream.progressLabel ?? workstream.title}
                    value={workstream.progress}
                    durationMs={workstream.durationMs}
                  />
                  <small>{Math.round(workstream.progress)}%</small>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="sector-card-activity">
            <span>
              <strong>{activity.title}</strong>
              {activity.detail ? <span>{activity.detail}</span> : null}
            </span>
            <SectorMasteryIndicator collaborators={assigned} role={role} />
          </div>
          {role === "equipment" ? (
            <div className="sector-card-equipment">
              <span className="sector-card-equipment-summary">
                <small>Usura attrezzatura</small>
                <strong>{Math.round(state.equipment.wear)}/100</strong>
              </span>
              <EquipmentConditionBar
                equipment={state.equipment}
                compact
                ariaLabel="Condizione attrezzatura del settore Attrezzatura"
              />
            </div>
          ) : activity.progress === undefined ? (
            <div className="sector-card-waiting" aria-label="Nessuna attività in corso"><span /></div>
          ) : (
            <div className="sector-card-progress">
              <ProgressBar
                label={activity.progressLabel ?? activity.title}
                value={activity.progress}
                durationMs={activity.durationMs}
              />
              <small>{Math.round(activity.progress)}%</small>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        className="sector-manage-button"
        aria-label={`Gestisci ${label}`}
        disabled={assigned.length === 0}
        onClick={onOpen}
      >
        Gestisci
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

function InstructorSectorCard({
  state: stateOverride,
  actual,
  target,
  available,
  locked,
  now,
  onIncrement,
  onDecrement,
  onOpen,
  onToggleAutomaticTeaching,
}: {
  state?: GameState;
  actual: number;
  target: number;
  available: number;
  locked: boolean;
  now: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpen: () => void;
  onToggleAutomaticTeaching: (enabled: boolean) => void;
}) {
  const state = useGameStateSlices(
    ["acquisitionEvents", "automation", "collaboratorManagement", "collaborators", "contacts", "equipment", "gadgets", "network", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const isPaused = useGameTimeSource()?.isPaused ?? false;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const {
    instructors,
    entries,
    coverage,
    technicianCoverage,
    internalCourses,
    technicianCourses,
    availableInstructorCourses,
  } = useMemo(() => {
    const nextInstructors = state.collaborators.filter(
      (collaborator) => collaborator.assignment === "instructor",
    );
    const instructorIds = new Set(
      nextInstructors.map((instructor) => instructor.id),
    );
    const nextEntries = getInstructorTeachingEntries({
      contacts: state.contacts,
      collaborators: state.collaborators,
    }, courseXUnlocked).filter((entry) => instructorIds.has(entry.instructorId));
    const nextAvailableCourses = getAvailableInstructorCourses(
      nextInstructors,
      courseXUnlocked,
    );
    return {
      instructors: nextInstructors,
      entries: nextEntries,
      coverage: getInstructorCoverageForms(nextInstructors, courseXUnlocked),
      technicianCoverage: getTechnicianCoverageForms(
        nextInstructors,
        courseXUnlocked,
      ),
      internalCourses: getInternalInstructorCourseEntries(
        nextInstructors,
        courseXUnlocked,
      ),
      technicianCourses: getTechnicianCourseEntries(
        nextInstructors,
        courseXUnlocked,
      ),
      availableInstructorCourses: nextAvailableCourses,
    };
  }, [courseXUnlocked, state.collaborators, state.contacts]);
  const prepUnlocked = isAthleticPreparationUnlocked(state.upgrades);
  const summerBreak = isSummerBreak(state.school.currentMonth);
  const showAthleticPreparation = prepUnlocked && instructors.length > 0;
  const activePreparationInstructorCount = selectAthleticPreparationInstructorIds(state).size;
  const preparationIsActive = !summerBreak && activePreparationInstructorCount > 0;
  const teachingGroups = useMemo(
    () => groupInstructorTeachingEntries(entries),
    [entries],
  );
  const internalCourseGroupCount = useMemo(
    () => new Set(internalCourses.map((entry) => entry.formId)).size,
    [internalCourses],
  );
  const technicianCourseGroupCount = useMemo(
    () => groupInstructorTeachingEntries(technicianCourses).length,
    [technicianCourses],
  );

  return (
    <article className="instructor-sector-card">
      <header>
        <span className="sector-card-icon is-primary"><Icon name="people" /></span>
        <span className="instructor-sector-title">
          <span>Centro didattico</span>
          <h3>Istruttori</h3>
          <small>{prepUnlocked
            ? ROLE_PRESENTATION.instructor.description
            : "Forme e Corso Agonisti."}</small>
        </span>
        <label className={`instructor-auto-teaching-toggle${state.automation.autoTeachingEnabled ? "" : " is-disabled"}`}>
          <span>
            <strong>Insegnamento automatico</strong>
            <small>{state.automation.autoTeachingEnabled ? "Istruttori e Tecnici attivi" : "Corsi automatici in pausa"}</small>
          </span>
          <input
            type="checkbox"
            aria-label="Insegnamento automatico"
            checked={state.automation.autoTeachingEnabled}
            onChange={(event) => onToggleAutomaticTeaching(event.target.checked)}
          />
        </label>
        <StaffingStepper
          label="Istruttori"
          actual={actual}
          target={target}
          available={available}
          locked={locked}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      </header>

      <div className="instructor-sector-body">
        <div className="instructor-activity-well">
          <InstructorActivityLane
            title="Corsi Allievi"
            tone="student"
            rowCount={teachingGroups.length + Number(showAthleticPreparation)}
          >
            {entries.length > 0 ? (
              <AggregatedTeachingBar
                entries={entries}
                now={now}
                agonistCourseUnlocked={isAgonistCourseUnlocked(state.upgrades)}
              />
            ) : null}
            {showAthleticPreparation ? (
              <div className={`athletic-preparation-course${preparationIsActive ? "" : " is-inactive"}`}>
                <span className="athletic-preparation-course-logo" aria-hidden="true">
                  <Icon name="trend" />
                </span>
                <strong>Preparazione atletica</strong>
                <ProgressBar
                  className={`instructor-preparation-loop${preparationIsActive ? "" : " is-inactive"}`}
                  label={summerBreak
                    ? "Preparazione atletica in pausa"
                    : preparationIsActive
                      ? "Preparazione atletica continuativa"
                      : "Preparazione atletica in attesa"}
                  value={0}
                  valueText={summerBreak
                    ? "Pausa estiva"
                    : !preparationIsActive
                      ? "In attesa di istruttori disponibili"
                      : isPaused
                        ? "Attività in pausa"
                        : "Attività continuativa"}
                  indeterminate={preparationIsActive}
                  paused={isPaused}
                />
                <small>{summerBreak
                  ? "Pausa estiva"
                  : preparationIsActive
                    ? "∞"
                    : "In attesa"}</small>
              </div>
            ) : null}
          </InstructorActivityLane>

          <InstructorActivityLane
            title="Corsi Istruttori"
            tone="instructor"
            rowCount={internalCourseGroupCount}
          >
            <InternalInstructorCourseList entries={internalCourses} now={now} />
          </InstructorActivityLane>

          <InstructorActivityLane
            title="Corsi Tecnici"
            tone="technician"
            rowCount={technicianCourseGroupCount}
          >
            <AggregatedTeachingBar
              entries={technicianCourses}
              now={now}
              agonistCourseUnlocked={false}
              variant="technician"
            />
          </InstructorActivityLane>
        </div>

        <section className="instructor-coverage">
          <div className="instructor-coverage-forms">
            <span><small>Copertura didattica</small><strong>{coverage.length} Forme insegnabili</strong></span>
            <FormLogoStrip
              className="sector-form-strip"
              forms={coverage}
              instructorForms={coverage}
              technicianForms={technicianCoverage}
              showLabels={false}
            />
          </div>
          <div className="instructor-coverage-actions">
            <SectorMasteryIndicator collaborators={instructors} role="instructor" />
            <button
              type="button"
              className="instructor-courses-link"
              aria-label={availableInstructorCourses.length > 0
                ? `Apri ${availableInstructorCourses.length} Corsi Istruttori disponibili`
                : "Nessun Corso Istruttori disponibile"}
              onClick={onOpen}
              disabled={availableInstructorCourses.length === 0}
            >
              Corsi Istruttori disponibili · {availableInstructorCourses.length}
              <Icon name="arrowRight" />
            </button>
          </div>
        </section>
      </div>

      <button type="button" className="sector-manage-button is-primary" aria-label="Gestisci Istruttori" onClick={onOpen}>
        Gestisci
        <Icon name="arrowRight" />
      </button>
    </article>
  );
}

export function CollaboratorSectorView({
  state: stateOverride,
  collaboratorsById,
  onIncrement,
  onDecrement,
  onStartTraining,
  onBookTechnicianCourse,
  onToggleAutomaticTeaching,
}: {
  state?: GameState;
  collaboratorsById: Map<string, Collaborator>;
  onIncrement: (assignment: CollaboratorMasteryRole) => void;
  onDecrement: (assignment: CollaboratorMasteryRole) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onBookTechnicianCourse?: (collaboratorId: string, formId: FormId) => void;
  onToggleAutomaticTeaching?: (enabled: boolean) => void;
}) {
  const state = useGameStateSlices(
    ["acquisitionEvents", "automation", "collaboratorManagement", "collaborators", "contacts", "equipment", "gadgets", "network", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const [openRole, setOpenRole] = useState<CollaboratorMasteryRole | null>(null);
  const assignmentCounts = useMemo(
    () => getCollaboratorAssignmentCounts(state),
    [state],
  );
  const available = useMemo(
    () => state.collaborators.filter(
      (collaborator) => collaborator.assignment === null,
    ).length,
    [state.collaborators],
  );
  const teachingEntries = useMemo(
    () => getInstructorTeachingEntries({
      contacts: state.contacts,
      collaborators: state.collaborators,
    }, courseXUnlocked),
    [courseXUnlocked, state.collaborators, state.contacts],
  );
  const internalInstructorCourses = useMemo(
    () => getInternalInstructorCourseEntries(
      state.collaborators,
      courseXUnlocked,
    ),
    [courseXUnlocked, state.collaborators],
  );
  const technicianCourses = useMemo(
    () => getTechnicianCourseEntries(
      state.collaborators,
      courseXUnlocked,
    ),
    [courseXUnlocked, state.collaborators],
  );
  const hasTimedWork = state.acquisitionEvents.some((event) => event.status === "running") ||
    teachingEntries.length > 0 ||
    internalInstructorCourses.length > 0 ||
    technicianCourses.length > 0 ||
    (
      state.collaborators.some(
        (collaborator) => collaborator.assignment === "equipment",
      ) && getEquipmentAutomaticRepairTarget(state.equipment) !== undefined
    ) || hasGadgetRuntimeWork(state);
  const now = useGameTime(hasTimedWork, GAME_CONFIG.progressUpdateIntervalMs);
  const targets = state.collaboratorManagement.targets;
  const automaticAssignment = Boolean(state.collaboratorManagement.automaticShares);
  const panelProps = useMemo(() => ({
    collaboratorsById,
    onStartTraining,
    onBookTechnicianCourse,
  }), [collaboratorsById, onBookTechnicianCourse, onStartTraining]);

  return (
    <section
      className="collaborator-sector-view"
      aria-label="Gestione aggregata dei collaboratori"
      data-tutorial-region="collaborator-sectors"
    >
      <InstructorSectorCard
        state={stateOverride}
        actual={assignmentCounts.instructor}
        target={targets.instructor ?? 0}
        available={available}
        locked={automaticAssignment}
        now={now}
        onIncrement={() => onIncrement("instructor")}
        onDecrement={() => onDecrement("instructor")}
        onOpen={() => setOpenRole("instructor")}
        onToggleAutomaticTeaching={onToggleAutomaticTeaching ?? ignoreAutomaticTeachingToggle}
      />

      <div className="collaborator-sector-grid">
        {(state.unlocks.gadget
          ? [...STANDARD_ROLES, "gadget" as const]
          : STANDARD_ROLES
        ).map((role) => (
          <StandardSectorCard
            key={role}
            state={stateOverride}
            role={role}
            actual={assignmentCounts[role]}
            target={targets[role] ?? 0}
            available={available}
            locked={automaticAssignment}
            now={now}
            onIncrement={() => onIncrement(role)}
            onDecrement={() => onDecrement(role)}
            onOpen={() => setOpenRole(role)}
          />
        ))}
        {!state.unlocks.gadget ? (
          <div className="collaborator-sector-placeholder" aria-hidden="true">
            <Icon name="settings" />
            <span>In arrivo</span>
          </div>
        ) : null}
      </div>

      {openRole ? (
        <CollaboratorSectorPanel
          state={stateOverride}
          role={openRole}
          {...panelProps}
          onClose={() => setOpenRole(null)}
        />
      ) : null}
    </section>
  );
}
