import {
  AGONIST_COURSE_ID,
  canTrainForm,
  getAgonistCourseRequiredSwords,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getInstructorQualificationDuration,
  getStudentFormCost,
  isAgonistCourse,
  isInstructorForm,
  needsCourseXRecovery,
} from "../content/forms";
import {
  applyQualifyingCourseDiscount,
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
  isAgonistCourseUnlocked,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import { getInstructorPendingReleaseIds } from "./collaboratorManagement";
import { GAME_CONFIG, getTechnicalArenaDurationMs } from "./config";
import { roundCurrency } from "./economy";
import { getAvailableSwords, reserveSwords } from "./equipment";
import { getPriorityInstructorQualificationTechnicianIds } from "./instructorPriority";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import {
  compareInstructorTeachingPriority,
  selectInstructorCapacity,
} from "./selectors";
import {
  refreshTrainingDurations,
  scheduleTraining,
} from "./teacherTrainingFlow";
import type {
  Collaborator,
  Contact,
  FormId,
  FormTraining,
  FormTrainingStartMode,
  GameState,
} from "./types";

export interface TrainingStartResult {
  training: FormTraining;
}

/**
 * Accumula più avvii didattici senza ricopiare gli elenchi a ogni allievo.
 * Le modifiche diventano un nuovo GameState soltanto con commit().
 */
export interface TrainingStartPlan {
  readonly availableEuros: number;
  startFormTraining(
    personId: string,
    formId: FormId,
    mode?: FormTrainingStartMode,
  ): TrainingStartResult | undefined;
  startAgonistCourse(
    personId: string,
    instructorId: string,
  ): TrainingStartResult | undefined;
  restartWaitingTraining(personId: string): TrainingStartResult | undefined;
  commit(): GameState;
}

export type TrainingStartPlanFactory = (
  state: GameState,
  now: number,
  // Il flusso aggiorna questa stessa mappa dopo ogni assegnazione accettata.
  teachingCounts: Map<string, number>,
) => TrainingStartPlan;

function getAgonistCourseCost(state: GameState): number {
  if (isAgonistCourseUnlocked(state.upgrades)) return GAME_CONFIG.agonistCourseBaseCost;
  return GAME_CONFIG.technicalArenaBaseCost;
}

class BatchedTrainingStartPlan implements TrainingStartPlan {
  private readonly contactsById: Map<string, Contact>;
  private readonly collaboratorsById: Map<string, Collaborator>;
  private readonly collaboratorContactIds: Set<string>;
  private readonly changedContactIds = new Set<string>();
  private readonly changedCollaboratorIds = new Set<string>();
  private readonly pendingReleaseIds: ReadonlySet<string>;
  private readonly priorityQualificationTechnicianIds: Set<string>;
  private readonly capacity: number;
  private readonly courseXUnlocked: boolean;
  private readonly trainingYear: number;
  private readonly annualTrainingLimit: number;
  private equipment: GameState["equipment"];
  private euros: number;
  private changed = false;
  private refreshDurationsOnCommit = false;

  constructor(
    private readonly state: GameState,
    private readonly now: number,
    private readonly teachingCounts: Map<string, number>,
  ) {
    this.contactsById = new Map(state.contacts.map((contact) => [contact.id, contact]));
    this.collaboratorsById = new Map(
      state.collaborators.map((collaborator) => [collaborator.id, collaborator]),
    );
    this.collaboratorContactIds = new Set(
      state.collaborators.map((collaborator) => collaborator.contactId),
    );
    this.pendingReleaseIds = getInstructorPendingReleaseIds(state);
    this.priorityQualificationTechnicianIds =
      getPriorityInstructorQualificationTechnicianIds(state);
    this.capacity = selectInstructorCapacity(state);
    this.courseXUnlocked = isCourseXUnlocked(state.upgrades);
    this.trainingYear = getFormTrainingYear(state.school.currentMonth);
    this.annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
    this.equipment = state.equipment;
    this.euros = state.school.euros;
  }

  get availableEuros(): number {
    return this.euros;
  }

  private updateContact(contact: Contact): void {
    this.contactsById.set(contact.id, contact);
    this.changedContactIds.add(contact.id);
    this.changed = true;
  }

  private updateCollaborator(collaborator: Collaborator): void {
    this.collaboratorsById.set(collaborator.id, collaborator);
    this.changedCollaboratorIds.add(collaborator.id);
    this.changed = true;
  }

  private updateTeachingCount(instructorId: string | undefined, delta: number): void {
    if (!instructorId || delta === 0) return;
    const nextCount = Math.max(0, (this.teachingCounts.get(instructorId) ?? 0) + delta);
    if (nextCount === 0) this.teachingCounts.delete(instructorId);
    else this.teachingCounts.set(instructorId, nextCount);
  }

  restartWaitingTraining(personId: string): TrainingStartResult | undefined {
    const contact = this.contactsById.get(personId);
    const collaborator = this.collaboratorsById.get(personId);
    const person = collaborator ?? contact;
    const waiting = person?.training;
    if (!person || waiting?.status !== "waitingForEquipment") return undefined;

    const previousInstructorId = waiting.instructorId ?? waiting.requestedInstructorId;
    if (isAgonistCourse(waiting.formId) && previousInstructorId === personId) {
      this.updateTeachingCount(previousInstructorId, -1);
      if (collaborator) this.updateCollaborator({ ...collaborator, training: undefined });
      else if (contact) this.updateContact({ ...contact, training: undefined });
      return undefined;
    }

    const requiredSwords = waiting.equipmentUsed ?? 1;
    if (getAvailableSwords(this.equipment) < requiredSwords) return undefined;

    this.updateTeachingCount(previousInstructorId, -1);
    if (collaborator) this.updateCollaborator({ ...collaborator, training: undefined });
    else if (contact) this.updateContact({ ...contact, training: undefined });

    const restarted = isAgonistCourse(waiting.formId)
      ? this.startAgonistCourse(personId, waiting.requestedInstructorId ?? "")
      : this.startFormTraining(
          personId,
          waiting.formId,
          waiting.trainingTrack === "athlete" ? "student-only" : "standard",
        );
    if (restarted) {
      this.updateTeachingCount(
        restarted.training.instructorId ?? restarted.training.requestedInstructorId,
        1,
      );
      return restarted;
    }

    const currentContact = this.contactsById.get(personId);
    const currentCollaborator = this.collaboratorsById.get(personId);
    if (currentCollaborator) {
      this.updateCollaborator({ ...currentCollaborator, training: waiting });
    } else if (currentContact) {
      this.updateContact({ ...currentContact, training: waiting });
    }
    this.updateTeachingCount(previousInstructorId, 1);
    return undefined;
  }

  private selectAvailableInstructor(
    formId: FormId,
    studentId?: string,
  ): Collaborator | undefined {
    return this.state.collaborators
      .map((collaborator) => this.collaboratorsById.get(collaborator.id) ?? collaborator)
      .filter((collaborator) =>
        collaborator.id !== studentId &&
        collaborator.assignment === "instructor" &&
        !this.pendingReleaseIds.has(collaborator.id) &&
        (formId !== "course-x" || this.courseXUnlocked) &&
        collaborator.forms.includes(formId) &&
        (!isInstructorForm(formId) || collaborator.instructorForms.includes(formId)) &&
        !this.priorityQualificationTechnicianIds.has(collaborator.id) &&
        (this.teachingCounts.get(collaborator.id) ?? 0) < this.capacity
      )
      .sort((left, right) =>
        compareInstructorTeachingPriority(
          left,
          right,
          this.teachingCounts,
          this.courseXUnlocked,
        )
      )[0];
  }

  startAgonistCourse(
    personId: string,
    instructorId: string,
  ): TrainingStartResult | undefined {
    const arenaLevel = this.state.upgrades["technical-arena"] ?? 0;
    const agonistCourseUnlocked = isAgonistCourseUnlocked(this.state.upgrades);
    if (
      arenaLevel < 1 ||
      !this.state.unlocks.forms ||
      isSummerBreak(this.state.school.currentMonth)
    ) return undefined;

    const collaborator = this.collaboratorsById.get(personId);
    const possibleMember = this.contactsById.get(personId);
    const member = possibleMember?.status === "enrolled" &&
        !this.collaboratorContactIds.has(possibleMember.id)
      ? possibleMember
      : undefined;
    const student = collaborator ?? member;
    const collaboratorContact = collaborator
      ? this.contactsById.get(collaborator.contactId)
      : undefined;
    const athleteContact = collaboratorContact?.status === "enrolled"
      ? collaboratorContact
      : member;
    const instructor = this.collaboratorsById.get(instructorId);
    const usedAnnualSlots = student
      ? getFormTrainingCount(student, this.trainingYear)
      : 0;
    const remainingAnnualSlots = this.annualTrainingLimit - usedAnnualSlots;
    const cost = getAgonistCourseCost(this.state);
    const agonistCourseGrantsStats = agonistCourseUnlocked;
    if (
      !student ||
      !athleteContact ||
      !instructor ||
      instructor.id === personId ||
      instructor.assignment !== "instructor" ||
      this.pendingReleaseIds.has(instructor.id) ||
      (collaborator ? this.pendingReleaseIds.has(collaborator.id) : false) ||
      (this.courseXUnlocked && needsCourseXRecovery(student.forms)) ||
      student.training ||
      remainingAnnualSlots <= 0 ||
      student.lastAgonistCourseYear === this.trainingYear ||
      (this.teachingCounts.get(instructor.id) ?? 0) >= this.capacity ||
      this.euros < cost
    ) return undefined;

    const requiredSwords = getAgonistCourseRequiredSwords(student.forms);
    const reservedEquipment = reserveSwords(this.equipment, requiredSwords);
    if (!reservedEquipment) {
      const training: FormTraining = {
        formId: AGONIST_COURSE_ID,
        startedAt: this.now,
        completesAt: this.now,
        status: "waitingForEquipment",
        requestedInstructorId: instructor.id,
        equipmentUsed: requiredSwords,
        wearPerSword: GAME_CONFIG.equipmentLoadPerAgonistCourse,
        agonistCourseGrantsStats,
      };
      if (member) this.updateContact({ ...member, training });
      if (collaborator) this.updateCollaborator({ ...collaborator, training });
      return { training };
    }

    const baseDuration = agonistCourseUnlocked
      ? GAME_CONFIG.agonistCourseDurationMs
      : getTechnicalArenaDurationMs(arenaLevel);
    const trainingSpeed = getCollaboratorProductivity(instructor, "instructor");
    const training = scheduleTraining(
      this.state,
      personId,
      this.now,
      baseDuration / trainingSpeed,
      {
        formId: AGONIST_COURSE_ID,
        instructorId: instructor.id,
        status: "running",
        equipmentUsed: requiredSwords,
        wearPerSword: GAME_CONFIG.equipmentLoadPerAgonistCourse,
        agonistCourseSlotsConsumed: remainingAnnualSlots,
        agonistCourseGrantsStats,
        trainingTrack: "agonist",
        trainingPhase: "agonist",
      },
      this.teachingCounts,
    );
    this.equipment = reservedEquipment;
    this.euros = roundCurrency(this.euros - cost);
    this.updateContact({
      ...athleteContact,
      training: collaborator ? athleteContact.training : training,
      lastFormTrainingYear: collaborator
        ? athleteContact.lastFormTrainingYear
        : this.trainingYear,
      formTrainingYearCount: collaborator
        ? athleteContact.formTrainingYearCount
        : this.annualTrainingLimit,
      lastAgonistCourseYear: this.trainingYear,
    });
    if (collaborator) {
      this.updateCollaborator({
        ...collaborator,
        training,
        lastFormTrainingYear: this.trainingYear,
        formTrainingYearCount: this.annualTrainingLimit,
        lastAgonistCourseYear: this.trainingYear,
      });
    }
    this.refreshDurationsOnCommit = true;
    return { training };
  }

  startFormTraining(
    personId: string,
    formId: FormId,
    mode: FormTrainingStartMode = "standard",
  ): TrainingStartResult | undefined {
    if (!this.state.unlocks.forms) return undefined;
    const collaborator = this.collaboratorsById.get(personId);
    if (collaborator && this.pendingReleaseIds.has(collaborator.id)) {
      return undefined;
    }
    const candidateForms = collaborator?.forms ?? this.contactsById.get(personId)?.forms ?? [];
    if (
      (!this.courseXUnlocked && formId === "course-x") ||
      (
        this.courseXUnlocked &&
        needsCourseXRecovery(candidateForms) &&
        formId !== "course-x"
      )
    ) return undefined;

    const studentOnly = mode === "student-only";
    const qualificationOnly = Boolean(
      !studentOnly &&
      collaborator?.assignment === "instructor" &&
      collaborator.forms.includes(formId) &&
      isInstructorForm(formId) &&
      !collaborator.instructorForms.includes(formId),
    );
    const canTrainAsInstructorInSummer = Boolean(
      !studentOnly &&
      collaborator?.assignment === "instructor" && isInstructorForm(formId),
    );
    if (
      isSummerBreak(this.state.school.currentMonth) &&
      !canTrainAsInstructorInSummer
    ) return undefined;

    const possibleMember = this.contactsById.get(personId);
    const member = possibleMember?.status === "enrolled" &&
        !this.collaboratorContactIds.has(possibleMember.id)
      ? possibleMember
      : undefined;
    const student = collaborator ?? member;
    const definition = getFormDefinition(formId);
    if (qualificationOnly && collaborator && definition) {
      const qualificationCost = applyQualifyingCourseDiscount(
        this.state.upgrades,
        getInstructorQualificationCost(definition.cost),
      );
      if (collaborator.training || this.euros < qualificationCost) return undefined;
      const training = scheduleTraining(
        this.state,
        collaborator.id,
        this.now,
        getInstructorQualificationDuration(definition.durationMs) /
          getCollaboratorProductivity(collaborator, "instructor"),
        {
          formId,
          status: "running",
          equipmentUsed: 0,
          wearPerSword: 0,
          includesInstructorCertification: true,
          trainingTrack: "instructor",
          trainingPhase: "instructor",
        },
        this.teachingCounts,
      );
      this.euros = roundCurrency(this.euros - qualificationCost);
      this.updateCollaborator({ ...collaborator, training });
      return { training };
    }

    const instructorSelf = collaborator?.assignment === "instructor";
    const instructor = !instructorSelf || !isSummerBreak(this.state.school.currentMonth)
      ? this.selectAvailableInstructor(formId, personId)
      : undefined;
    const instructorTrack = Boolean(
      !studentOnly &&
      instructorSelf && !instructor && isInstructorForm(formId),
    );
    const trainingCost = instructorTrack
      ? applyQualifyingCourseDiscount(
          this.state.upgrades,
          getInstructorFormCost(definition?.cost ?? 0),
        )
      : instructor
        ? getStudentFormCost(definition?.cost ?? 0)
        : definition?.cost ?? 0;
    const branchCapacity = collaborator?.assignment === "instructor"
      ? Math.min(3, 1 + (this.state.upgrades["instructor-versatility"] ?? 0))
      : undefined;
    const instructorLearnedBranches = new Set(
      collaborator?.forms.flatMap((learnedFormId) => {
        const branch = getFormDefinition(learnedFormId)?.branch;
        return branch ? [branch] : [];
      }) ?? [],
    );
    const initialBranchCompatible = !definition?.branch ||
      instructorLearnedBranches.size > 0 ||
      !collaborator?.formBranchPreferences?.length ||
      collaborator.formBranchPreferences.includes(definition.branch);
    if (
      !student ||
      !definition ||
      !canTrainForm(
        student,
        definition,
        this.trainingYear,
        branchCapacity,
        collaborator?.assignment !== "instructor",
        this.annualTrainingLimit,
        this.courseXUnlocked,
      ) ||
      !initialBranchCompatible ||
      this.euros < trainingCost
    ) return undefined;

    const reservedEquipment = reserveSwords(this.equipment, definition.requiredSwords);
    if (!reservedEquipment) {
      const training: FormTraining = {
        formId,
        startedAt: this.now,
        completesAt: this.now,
        status: "waitingForEquipment",
        requestedInstructorId: instructor?.id,
        equipmentUsed: definition.requiredSwords,
        wearPerSword: definition.loadPerSword,
        trainingTrack: studentOnly ? "athlete" : undefined,
      };
      if (member) this.updateContact({ ...member, training });
      if (collaborator) this.updateCollaborator({ ...collaborator, training });
      return { training };
    }

    const trainingInstructor = instructor ?? (instructorTrack ? collaborator : undefined);
    const instructorTeachingSpeed = instructor
      ? 1 + getUpgradeEffectTotal(this.state.upgrades, "instructorTeachingSpeed")
      : 1;
    const trainingSpeed = trainingInstructor
      ? getCollaboratorProductivity(trainingInstructor, "instructor") *
        instructorTeachingSpeed
      : 1;
    const training = scheduleTraining(
      this.state,
      personId,
      this.now,
      definition.durationMs / trainingSpeed,
      {
        formId,
        instructorId: instructor?.id,
        status: "running",
        equipmentUsed: definition.requiredSwords,
        wearPerSword: definition.loadPerSword,
        includesInstructorCertification: instructorTrack || undefined,
        trainingTrack: instructorTrack ? "combined-instructor" : "athlete",
        trainingPhase: "athlete",
      },
      this.teachingCounts,
    );
    const formTrainingYearCount = getFormTrainingCount(student, this.trainingYear) + 1;
    this.equipment = reservedEquipment;
    this.euros = roundCurrency(this.euros - trainingCost);
    if (member) {
      this.updateContact({
        ...member,
        training,
        lastFormTrainingYear: this.trainingYear,
        formTrainingYearCount,
      });
    }
    if (collaborator) {
      this.updateCollaborator({
        ...collaborator,
        training,
        lastFormTrainingYear: this.trainingYear,
        formTrainingYearCount,
      });
    }
    this.refreshDurationsOnCommit = true;
    return { training };
  }

  commit(): GameState {
    if (!this.changed) return this.state;
    const contacts = this.changedContactIds.size > 0
      ? this.state.contacts.map((contact) =>
          this.changedContactIds.has(contact.id)
            ? this.contactsById.get(contact.id) ?? contact
            : contact
        )
      : this.state.contacts;
    const collaborators = this.changedCollaboratorIds.size > 0
      ? this.state.collaborators.map((collaborator) =>
          this.changedCollaboratorIds.has(collaborator.id)
            ? this.collaboratorsById.get(collaborator.id) ?? collaborator
            : collaborator
        )
      : this.state.collaborators;
    const nextState: GameState = {
      ...this.state,
      school: this.euros === this.state.school.euros
        ? this.state.school
        : { ...this.state.school, euros: this.euros },
      equipment: this.equipment,
      contacts,
      collaborators,
    };
    return this.refreshDurationsOnCommit
      ? refreshTrainingDurations(nextState, this.now)
      : nextState;
  }
}

export function createTrainingStartPlan(
  state: GameState,
  now: number,
  teachingCounts: Map<string, number> = new Map(
    getInstructorTeachingCounts(state.contacts, state.collaborators),
  ),
): TrainingStartPlan {
  return new BatchedTrainingStartPlan(state, now, teachingCounts);
}
