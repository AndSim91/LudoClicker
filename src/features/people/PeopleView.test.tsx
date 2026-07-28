import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { createInitialState } from "../../game/engine";
import { GameTimeProvider } from "../../game/GameTimeProvider";
import type { Collaborator, FormBranch, FormId } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { PeopleView } from "./PeopleView";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PeopleView", () => {
  it("replaces the individual list with an operational dashboard after the aggregate unlock", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 9 }, (_, index) => ({
      id: `aggregate-${index}`,
      contactId: initial.contacts[0].id,
      displayName: `Collaboratore Aggregato ${index}`,
      joinedAt: 1_000 + index,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      formBranchPreferences: [],
      assignment: null,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    }));
    const state = {
      ...initial,
      collaborators,
      unlocks: { ...initial.unlocks, collaborators: true },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };
    const onIncrement = vi.fn();
    render(
      <PeopleView
        state={state}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onIncrementCollaboratorAssignment={onIncrement}
      />,
    );

    expect(screen.getByText("9/9 liberi")).toBeVisible();
    expect(screen.queryByText("Collaboratori disponibili")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Gestione aggregata dei collaboratori" })).toBeVisible();
    expect(screen.queryByText("Collaboratore Aggregato 0")).not.toBeInTheDocument();
    expect(screen.queryByText(/Preset/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Gestisci settore" })).toHaveLength(3);
    screen.getAllByRole("button", { name: "Gestisci settore" }).forEach((button) => {
      expect(button).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Aumenta collaboratori in Redazione" }));
    expect(onIncrement).toHaveBeenCalledWith("writing");
  });

  it("keeps the progress clock fluid for a high-volume teaching dashboard", () => {
    const initial = createInitialState(1_000);
    const instructor: Collaborator = {
      id: "scale-instructor",
      contactId: "scale-instructor-contact",
      displayName: "Istruttore Scalabile",
      joinedAt: 1_000,
      forms: ["form-1"],
      instructorForms: ["form-1"],
      assignment: "instructor",
      rarity: "ultra-rare",
    };
    const contacts = Array.from({ length: 100 }, (_, index) => ({
      ...initial.contacts[index % initial.contacts.length],
      id: `scale-student-${index}`,
      email: `scale-student-${index}@example.invalid`,
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 101_000,
        status: "running" as const,
        instructorId: instructor.id,
      },
    }));
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(
      <PeopleView
        state={{
          ...initial,
          contacts,
          collaborators: [instructor],
          school: { ...initial.school, activeMembers: contacts.length },
          unlocks: { ...initial.unlocks, collaborators: true, forms: true },
          collaboratorManagement: {
            ...initial.collaboratorManagement,
            aggregateViewUnlocked: true,
            targets: {
              ...initial.collaboratorManagement.targets,
              instructor: 1,
            },
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByRole("progressbar", {
      name: "Forma 1: 100 corsi",
    })).toHaveClass("is-compact");
    expect(intervalSpy.mock.calls.some(
      ([, intervalMs]) => intervalMs === GAME_CONFIG.progressUpdateIntervalMs,
    )).toBe(true);
    expect(intervalSpy.mock.calls.some(
      ([, intervalMs]) => intervalMs === GAME_CONFIG.gameTickMs,
    )).toBe(false);
  });

  it("does not animate an equipment sector when all equipment is already repaired", () => {
    const initial = createInitialState(1_000);
    const collaborator: Collaborator = {
      id: "idle-equipment-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: "equipment",
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare",
    };
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(
      <PeopleView
        state={{
          ...initial,
          collaborators: [collaborator],
          unlocks: { ...initial.unlocks, collaborators: true },
          collaboratorManagement: {
            ...initial.collaboratorManagement,
            aggregateViewUnlocked: true,
            targets: {
              ...initial.collaboratorManagement.targets,
              equipment: 1,
            },
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(intervalSpy).not.toHaveBeenCalled();
  });

  it("enables sector management only when the sector has assigned collaborators", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 9 }, (_, index) => ({
      id: `aggregate-${index}`,
      contactId: initial.contacts[0].id,
      displayName: `Collaboratore Aggregato ${index}`,
      joinedAt: 1_000 + index,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      formBranchPreferences: [],
      assignment: index === 0 ? "writing" as const : null,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    }));
    const state = {
      ...initial,
      collaborators,
      unlocks: { ...initial.unlocks, collaborators: true },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: {
          ...initial.collaboratorManagement.targets,
          writing: 1,
        },
      },
    };

    render(
      <PeopleView
        state={state}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onIncrementCollaboratorAssignment={() => undefined}
      />,
    );

    const writingCard = screen.getByRole("heading", { name: "Redazione" }).closest("article");
    expect(writingCard).not.toBeNull();
    expect(writingCard).not.toHaveClass("is-empty");
    expect(within(writingCard as HTMLElement).getByRole("button", { name: "Gestisci settore" })).toBeEnabled();

    const eventsCard = screen.getByRole("heading", { name: "Eventi" }).closest("article");
    expect(eventsCard).not.toBeNull();
    expect(eventsCard).toHaveClass("is-empty");
    expect(within(eventsCard as HTMLElement).getByRole("button", { name: "Gestisci settore" })).toBeDisabled();
  });

  it("sorts every collaborator column in sector management and the teaching center", () => {
    const initial = createInitialState(1_000);
    const collaborators: Collaborator[] = [
      {
        id: "sector-alpha",
        contactId: initial.contacts[0].id,
        displayName: "Alpha Redazione",
        joinedAt: 1_000,
        forms: ["form-1", "course-y"],
        instructorForms: [],
        assignment: "writing",
        mastery: { writing: 100, events: 0, equipment: 0, instructor: 0 },
        rarity: "ultra-rare",
      },
      {
        id: "sector-zeta",
        contactId: initial.contacts[0].id,
        displayName: "Zeta Redazione",
        joinedAt: 1_001,
        forms: ["form-1"],
        instructorForms: [],
        assignment: "writing",
        mastery: { writing: 100, events: 0, equipment: 0, instructor: 0 },
        rarity: "legendary",
      },
      {
        id: "instructor-delta",
        contactId: initial.contacts[0].id,
        displayName: "Delta Istruttore",
        joinedAt: 1_002,
        forms: ["form-1", "course-y"],
        instructorForms: ["form-1"],
        assignment: "instructor",
        mastery: { writing: 0, events: 0, equipment: 0, instructor: 200 },
        rarity: "ultra-rare",
      },
      {
        id: "instructor-beta",
        contactId: initial.contacts[0].id,
        displayName: "Beta Istruttore",
        joinedAt: 1_003,
        forms: ["form-1"],
        instructorForms: ["form-1"],
        assignment: "instructor",
        mastery: { writing: 0, events: 0, equipment: 0, instructor: 20 },
        rarity: "ultra-rare",
      },
    ];
    render(
      <PeopleView
        state={{
          ...initial,
          collaborators,
          unlocks: { ...initial.unlocks, collaborators: true },
          collaboratorManagement: {
            ...initial.collaboratorManagement,
            aggregateViewUnlocked: true,
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const writingCard = screen.getByRole("heading", { name: "Redazione" }).closest("article");
    fireEvent.click(within(writingCard as HTMLElement).getByRole("button", { name: "Gestisci settore" }));
    const writingDialog = screen.getByRole("dialog", { name: "Redazione" });
    expect(within(writingDialog).getAllByRole("button", { name: /Apri dettagli di/ })
      .map((button) => button.getAttribute("aria-label")))
      .toEqual(["Apri dettagli di Zeta Redazione", "Apri dettagli di Alpha Redazione"]);
    const writingSortLabels = ["Collaboratore", "Maestria", "Attività", "Arena", "Stile", "Forme"];
    writingSortLabels.forEach((label) => {
      const button = within(writingDialog).getByRole("button", {
        name: `Ordina collaboratori per ${label}`,
      });
      fireEvent.click(button);
      expect(button.closest('[role="columnheader"]')).toHaveAttribute("aria-sort", "ascending");
    });
    const masterySort = within(writingDialog).getByRole("button", {
      name: "Ordina collaboratori per Maestria",
    });
    fireEvent.click(masterySort);
    expect(within(writingDialog).getAllByRole("button", { name: /Apri dettagli di/ })
      .map((button) => button.getAttribute("aria-label")))
      .toEqual(["Apri dettagli di Zeta Redazione", "Apri dettagli di Alpha Redazione"]);
    const nameSort = within(writingDialog).getByRole("button", {
      name: "Ordina collaboratori per Collaboratore",
    });
    fireEvent.click(nameSort);
    expect(within(writingDialog).getAllByRole("button", { name: /Apri dettagli di/ })
      .map((button) => button.getAttribute("aria-label")))
      .toEqual(["Apri dettagli di Alpha Redazione", "Apri dettagli di Zeta Redazione"]);
    fireEvent.click(nameSort);
    expect(within(writingDialog).getAllByRole("button", { name: /Apri dettagli di/ })
      .map((button) => button.getAttribute("aria-label")))
      .toEqual(["Apri dettagli di Zeta Redazione", "Apri dettagli di Alpha Redazione"]);

    fireEvent.click(within(writingDialog).getByRole("button", { name: "Chiudi pannello Redazione" }));
    fireEvent.click(screen.getByRole("button", { name: "Apri centro didattico" }));
    const instructorDialog = screen.getByRole("dialog", { name: "Istruttori" });
    const trainingSort = within(instructorDialog).getByRole("button", {
      name: "Ordina collaboratori per Formazione",
    });
    fireEvent.click(trainingSort);
    expect(trainingSort.closest('[role="columnheader"]')).toHaveAttribute("aria-sort", "ascending");

    const mobileSort = within(instructorDialog).getByRole("combobox", {
      name: "Campo di ordinamento collaboratori del settore",
    });
    fireEvent.change(mobileSort, { target: { value: "mastery" } });
    expect(within(instructorDialog).getAllByRole("button", { name: /Apri dettagli di/ })
      .map((button) => button.getAttribute("aria-label")))
      .toEqual(["Apri dettagli di Beta Istruttore", "Apri dettagli di Delta Istruttore"]);
  });

  it("shows continuous athletic preparation and the single instructor course action", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 9 }, (_, index) => ({
      id: `aggregate-instructor-${index}`,
      contactId: initial.contacts[0].id,
      displayName: index === 0 ? "Istruttore Operativo" : `Collaboratore ${index}`,
      joinedAt: 1_000 + index,
      forms: index === 0 ? ["form-1", "course-x"] as FormId[] : [] as FormId[],
      instructorForms: index === 0 ? ["form-1"] as FormId[] : [] as FormId[],
      formBranchPreferences: [],
      assignment: index === 0 ? "instructor" as const : null,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    }));

    const onStartTraining = vi.fn();
    const state = {
      ...initial,
      school: { ...initial.school, euros: 1_000 },
      collaborators,
      upgrades: {
        ...initial.upgrades,
        "athletic-preparation": 1,
        "project-x": 1,
      },
      unlocks: { ...initial.unlocks, collaborators: true },
      automation: { ...initial.automation, lessonBuffer: 0.58 },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };
    const renderView = (isPaused: boolean) => (
      <GameTimeProvider getNow={() => 1_000} isPaused={isPaused}>
        <PeopleView
          state={state}
          onAssign={() => undefined}
          onStartTraining={onStartTraining}
        />
      </GameTimeProvider>
    );
    const view = render(renderView(false));

    expect(screen.getByText("Preparazione atletica in corso...")).toBeVisible();
    expect(document.querySelector(".instructor-preparation-row")).not.toBeInTheDocument();
    expect(screen.queryByText("Attività principale")).not.toBeInTheDocument();
    expect(screen.queryByText("Attività del gruppo")).not.toBeInTheDocument();
    const preparationBar = screen.getByRole("progressbar", {
      name: "Preparazione atletica continuativa",
    });
    expect(preparationBar).toHaveClass("is-indeterminate");
    expect(preparationBar).not.toHaveClass("is-paused");

    view.rerender(renderView(true));
    expect(screen.getByRole("progressbar", {
      name: "Preparazione atletica continuativa",
    })).toHaveClass("is-indeterminate", "is-paused");
    expect(screen.getByRole("progressbar", {
      name: "Preparazione atletica continuativa",
    })).toHaveAttribute("aria-valuetext", "Attività in pausa");
    expect(screen.getByText("Corso Istruttori disponibile")).toBeVisible();
    expect(screen.getByText("Istruttore Operativo")).toBeVisible();

    const courseAction = screen.getByRole("button", { name: /Avvia Corso Istruttori/ });
    fireEvent.click(courseAction);
    expect(onStartTraining).toHaveBeenCalledWith("aggregate-instructor-0", "course-x");
  });

  it("shows athletic preparation as active work in the individual collaborator list", () => {
    const initial = createInitialState(1_000);
    const instructor: Collaborator = {
      id: "individual-preparation-instructor",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Preparatore",
      joinedAt: 1_000,
      forms: ["form-1"],
      instructorForms: ["form-1"],
      assignment: "instructor",
      rarity: "ultra-rare",
    };
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, currentMonth: 1 },
      contacts: initial.contacts.map((contact, index) =>
        index === 0 ? { ...contact, status: "enrolled" as const } : contact
      ),
      collaborators: [instructor],
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    render(
      <GameTimeProvider getNow={() => 1_000} isPaused={false}>
        <PeopleView
          state={state}
          onAssign={() => undefined}
          onStartTraining={() => undefined}
        />
      </GameTimeProvider>,
    );

    const row = screen.getByText("Istruttore Preparatore").closest("article");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("Preparazione atletica")).toBeVisible();
    expect(within(row!).queryByText("In attesa di un allievo")).not.toBeInTheDocument();
    expect(within(row!).getByRole("progressbar", {
      name: "Preparazione atletica di Istruttore Preparatore",
    })).toHaveClass("is-indeterminate");

    fireEvent.change(screen.getByRole("combobox", { name: "Filtra per attività" }), {
      target: { value: "active" },
    });
    expect(screen.getByText("Istruttore Preparatore")).toBeVisible();
  });

  it("shows Technician coverage and the active internal Instructor course", () => {
    const initial = createInitialState(1_000);
    const technician = {
      id: "aggregate-technician",
      contactId: "technician-contact",
      displayName: "Tecnico Glicine",
      joinedAt: 1_000,
      forms: ["form-1"] as FormId[],
      instructorForms: ["form-1"] as FormId[],
      technicianForms: ["form-1"] as FormId[],
      formBranchPreferences: [],
      assignment: "instructor" as const,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    };
    const trainee = {
      ...technician,
      id: "aggregate-trainee",
      contactId: "trainee-contact",
      displayName: "Aspirante Istruttore",
      joinedAt: 2_000,
      instructorForms: [] as FormId[],
      technicianForms: [] as FormId[],
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 11_000,
        status: "running" as const,
        technicianId: technician.id,
        trainingTrack: "instructor" as const,
        trainingPhase: "instructor" as const,
      },
    };
    const otherCollaborators = Array.from({ length: 7 }, (_, index) => ({
      ...technician,
      id: `aggregate-other-${index}`,
      contactId: `aggregate-other-contact-${index}`,
      displayName: `Altro ${index}`,
      joinedAt: 3_000 + index,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      technicianForms: [] as FormId[],
      assignment: null,
    }));

    render(
      <GameTimeProvider getNow={() => 6_000} isPaused>
        <PeopleView
          state={{
            ...initial,
            collaborators: [technician, trainee, ...otherCollaborators],
            unlocks: { ...initial.unlocks, collaborators: true, forms: true },
            collaboratorManagement: {
              ...initial.collaboratorManagement,
              aggregateViewUnlocked: true,
            },
          }}
          onAssign={() => undefined}
          onStartTraining={() => undefined}
        />
      </GameTimeProvider>,
    );

    expect(screen.getByTitle("Forma 1 · Qualifica da Tecnico")).toBeVisible();
    expect(screen.getByText("Corsi Istruttori interni")).toBeVisible();
    const internalCourseProgress = screen.getByRole("progressbar", {
      name: "Forma 1: 1 corso",
    });
    expect(internalCourseProgress).toHaveAttribute("aria-valuenow", "50");
    expect(internalCourseProgress).toHaveClass("aggregated-teaching-bar");
    expect(internalCourseProgress.closest(".aggregated-teaching-groups"))
      .toHaveClass("is-internal-instructor");
    expect(screen.queryByText(
      /esame (fallito|non superato)|probabilità dell'esame|rischio dell'esame/i,
    )).not.toBeInTheDocument();
  });

  it("allows booking an eligible Technician course from the Instructor card", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "sis-ui-candidate",
      contactId: initial.contacts[0].id,
      displayName: "Candidata SIS",
      joinedAt: 1_000,
      forms: ["form-1"] as FormId[],
      instructorForms: ["form-1"] as FormId[],
      technicianForms: [] as FormId[],
      formBranchPreferences: [],
      assignment: "instructor" as const,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    };
    const onBookTechnicianCourse = vi.fn();

    const renderView = (sisUnlocked: boolean, candidate: Collaborator = collaborator) => (
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, euros: 1_000 },
          collaborators: [candidate],
          unlocks: { ...initial.unlocks, collaborators: true, forms: true },
          upgrades: {
            ...initial.upgrades,
            "sis-accreditation": sisUnlocked ? 1 : 0,
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onBookTechnicianCourse={onBookTechnicianCourse}
      />
    );

    const view = render(renderView(false));
    expect(screen.queryByText("Corso Tecnici")).not.toBeInTheDocument();
    expect(document.querySelector(".technician-course-control")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Prenota SIS/ })).not.toBeInTheDocument();

    view.unmount();
    const unlockedView = render(renderView(true));
    const sisHeading = screen.getByText("Corso Tecnici");
    const sisControl = sisHeading.closest(".technician-course-control");
    expect(sisControl).toBeVisible();
    expect(sisControl?.parentElement).toHaveClass("collaborator-copy");
    expect(sisControl?.previousElementSibling).toHaveClass("form-logo-strip");
    const sisToggle = screen.getByRole("button", { name: /Corso Tecnici/ });
    expect(sisToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Prenota SIS/ })).not.toBeInTheDocument();

    fireEvent.click(sisToggle);
    expect(sisToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /Prenota SIS/ }));
    expect(onBookTechnicianCourse).toHaveBeenCalledWith(collaborator.id, "form-1");

    unlockedView.rerender(renderView(true, {
      ...collaborator,
      technicianCourseReservation: {
        formId: "form-1",
        bookedAt: 2_000,
        eligibleMonth: 7,
      },
    }));
    const reservationCard = screen.getByLabelText(/Corso Tecnico SIS prenotato: Forma 1/);
    expect(reservationCard).toHaveClass("technician-course-reservation");
    expect(within(reservationCard).getByText("SIS")).toBeVisible();
    expect(within(reservationCard).getByText(/Prenotato .* Luglio, anno 1/)).toBeVisible();
  });

  it.each([7, 8])(
    "shows the athletic preparation summer break in aggregate month %i",
    (currentMonth) => {
      const initial = createInitialState(1_000);
      const instructor = {
        id: "summer-instructor",
        contactId: initial.contacts[0].id,
        displayName: "Istruttore Estivo",
        joinedAt: 1_000,
        forms: [] as FormId[],
        instructorForms: [] as FormId[],
        formBranchPreferences: [],
        assignment: "instructor" as const,
        mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
        rarity: "ultra-rare" as const,
      };

      render(
        <PeopleView
          state={{
            ...initial,
            school: { ...initial.school, currentMonth },
            collaborators: [instructor],
            upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
            unlocks: { ...initial.unlocks, collaborators: true },
            collaboratorManagement: {
              ...initial.collaboratorManagement,
              aggregateViewUnlocked: true,
            },
          }}
          onAssign={() => undefined}
          onStartTraining={() => undefined}
        />,
      );

      expect(screen.getByText("Pausa estiva")).toBeVisible();
      expect(screen.getByText("Preparazione atletica sospesa")).toBeVisible();
      expect(screen.queryByText("Preparazione atletica in corso...")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar", {
        name: "Preparazione atletica continuativa",
      })).not.toBeInTheDocument();
    },
  );

  it("stops and mutes athletic preparation while every instructor is teaching", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "busy-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Istruttore Impegnato",
      joinedAt: 1_000,
      forms: ["form-1"] as FormId[],
      instructorForms: ["form-1"] as FormId[],
      formBranchPreferences: [],
      assignment: "instructor" as const,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    };
    const student = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 31_000,
        instructorId: instructor.id,
      },
    };

    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 1 },
          contacts: initial.contacts.map((contact) =>
            contact.id === student.id ? student : contact,
          ),
          collaborators: [instructor],
          upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
          unlocks: { ...initial.unlocks, collaborators: true },
          collaboratorManagement: {
            ...initial.collaboratorManagement,
            aggregateViewUnlocked: true,
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByText("In attesa · tutti gli istruttori stanno insegnando")).toBeVisible();
    const preparationBar = screen.getByRole("progressbar", {
      name: "Preparazione atletica in attesa",
    });
    expect(preparationBar).toHaveClass("is-inactive");
    expect(preparationBar).not.toHaveClass("is-indeterminate");
    expect(preparationBar).toHaveAttribute("aria-valuenow", "0");
    expect(preparationBar).toHaveAttribute(
      "aria-valuetext",
      "In attesa di istruttori disponibili",
    );
  });

  it("keeps the idle equipment status separate from its wear indicator", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborator = {
      id: "aggregate-equipment",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      assignment: "equipment" as const,
      rarity: "rare" as const,
    };

    render(
      <PeopleView
        state={{
          ...initial,
          collaborators: [equipmentCollaborator],
          unlocks: { ...initial.unlocks, collaborators: true },
          collaboratorManagement: {
            ...initial.collaboratorManagement,
            aggregateViewUnlocked: true,
          },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const equipmentCard = screen.getByRole("heading", { name: "Attrezzatura" }).closest("article");
    expect(equipmentCard).not.toBeNull();
    const card = within(equipmentCard!);
    expect(card.getByText("In attesa")).toBeVisible();
    expect(card.getByText("Attrezzatura in ordine")).toBeVisible();
    expect(card.getByText("Usura attrezzatura")).toBeVisible();
    expect(card.getByText("0/100")).toBeVisible();
    expect(card.getByRole("progressbar", {
      name: "Condizione attrezzatura del settore Attrezzatura",
    })).toBeVisible();
  });

  it("lets users add and remove an enrolled athlete from favorites", () => {
    const initial = createInitialState(1_000);
    const favorite = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      favorite: true,
    };
    const onToggleFavorite = vi.fn();

    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [favorite],
          school: { ...initial.school, activeMembers: 1 },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    const star = screen.getByRole("button", {
      name: `Rimuovi ${favorite.firstName} ${favorite.lastName} dai preferiti`,
    });
    expect(star).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(star);
    expect(onToggleFavorite).toHaveBeenCalledWith(favorite.id);
  });

  it("keeps the roster DOM bounded and lets users reach every member", () => {
    const initial = createInitialState(1_000);
    const seed = initial.contacts[0];
    const contacts = Array.from({ length: 160 }, (_, index) => ({
      ...seed,
      id: `member-${index}`,
      firstName: `Membro ${index}`,
      lastName: "Scalabile",
      email: `member-${index}@example.test`,
      status: "enrolled" as const,
    }));

    render(
      <PeopleView
        state={{
          ...initial,
          contacts,
          school: { ...initial.school, activeMembers: contacts.length },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Iscritti" });
    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(25);
    expect(within(roster).getByText("Membro 0 Scalabile")).toBeVisible();
    expect(within(roster).getByText("Pagina 1 di 7")).toBeVisible();

    fireEvent.click(within(roster).getByRole("button", { name: "Successiva" }));

    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(25);
    expect(within(roster).queryByText("Membro 0 Scalabile")).not.toBeInTheDocument();
    expect(within(roster).getByText("Membro 25 Scalabile")).toBeVisible();

    for (let page = 2; page < 7; page += 1) {
      fireEvent.click(within(roster).getByRole("button", { name: "Successiva" }));
    }

    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(10);
    expect(within(roster).getByText("Membro 159 Scalabile")).toBeVisible();
  });

  it("shows the requested columns and sorts visible scores in both directions", () => {
    const initial = createInitialState(1_000);
    const hidden = {
      ...initial.contacts[0],
      id: "hidden-score",
      firstName: "Punteggio",
      lastName: "Nascosto",
      status: "enrolled" as const,
      forms: ["form-1" as const],
      arenaBase: 1,
      styleBase: 1,
      rarity: "legendary" as const,
    };
    const high = {
      ...initial.contacts[1],
      id: "high-score",
      firstName: "Arena",
      lastName: "Alta",
      status: "enrolled" as const,
      forms: ["course-y" as const],
      arenaBase: 90,
      styleBase: 80,
      rarity: "common" as const,
    };
    const low = {
      ...initial.contacts[2],
      id: "low-score",
      firstName: "Arena",
      lastName: "Bassa",
      status: "enrolled" as const,
      forms: ["course-y" as const],
      arenaBase: 10,
      styleBase: 20,
      rarity: "rare" as const,
    };

    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [hidden, high, low],
          school: { ...initial.school, activeMembers: 3 },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Iscritti" });
    const labels = ["Nome", "Rarità", "Percorso", "Arena", "Stile", "Stato", "Prossima Forma"];
    for (const label of labels) {
      expect(within(roster).getByRole("button", { name: `Ordina per ${label}` })).toBeVisible();
    }
    expect(within(roster).queryByRole("button", { name: "Ordina per Email" })).not.toBeInTheDocument();
    const hiddenName = within(roster).getByText("Punteggio Nascosto");
    expect(hiddenName.closest(".member-identity")).toHaveTextContent(hidden.email);
    expect(within(roster).getByText("Leggendario")).toBeVisible();
    expect(within(roster).getAllByText("???", { exact: true })).toHaveLength(2);

    fireEvent.click(within(roster).getByRole("button", { name: "Ordina per Rarità" }));
    let rows = roster.querySelectorAll(".member-row:not(.people-head)");
    expect(rows[0]).toHaveTextContent("Arena Alta");
    expect(rows[1]).toHaveTextContent("Arena Bassa");
    expect(rows[2]).toHaveTextContent("Punteggio Nascosto");

    const arenaSort = within(roster).getByRole("button", { name: "Ordina per Arena" });
    fireEvent.click(arenaSort);
    rows = roster.querySelectorAll(".member-row:not(.people-head)");
    expect(rows[0]).toHaveTextContent("Arena Bassa");
    expect(rows[1]).toHaveTextContent("Arena Alta");
    expect(rows[2]).toHaveTextContent("Punteggio Nascosto");
    expect(arenaSort.closest('[role="columnheader"]')).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(arenaSort);
    rows = roster.querySelectorAll(".member-row:not(.people-head)");
    expect(rows[0]).toHaveTextContent("Arena Alta");
    expect(rows[1]).toHaveTextContent("Arena Bassa");
    expect(rows[2]).toHaveTextContent("Punteggio Nascosto");
    expect(arenaSort.closest('[role="columnheader"]')).toHaveAttribute("aria-sort", "descending");
  });

  it("shows secret Legendaries as the highest official rarity without a name badge", () => {
    const initial = createInitialState(1_000);
    const regularLegendary = {
      ...initial.contacts[0],
      id: "regular-legendary-enrolled",
      firstName: "Andrea",
      lastName: "Simonazzi",
      status: "enrolled" as const,
      rarity: "legendary" as const,
      specialProfileId: "andrea-simonazzi" as const,
      secretLegendaryId: undefined,
    };
    const secretLegendary = {
      ...initial.contacts[1],
      id: "secret-enrolled",
      firstName: "Enrico",
      lastName: "Giovanetti",
      status: "enrolled" as const,
      rarity: "legendary" as const,
      specialProfileId: "enrico-giovanetti" as const,
      secretLegendaryId: "enrico-giovanetti" as const,
    };

    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [secretLegendary, regularLegendary],
          school: { ...initial.school, activeMembers: 2 },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Iscritti" });
    const row = within(roster).getByText("Enrico Giovanetti").closest(".member-row");

    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Leggendario Segreto")).toBeVisible();
    expect(row?.querySelector(".special-collaborator-badge.secret")).not.toBeInTheDocument();

    const raritySort = within(roster).getByRole("button", { name: "Ordina per Rarità" });
    fireEvent.click(raritySort);
    let rows = roster.querySelectorAll(".member-row:not(.people-head)");
    expect(rows[0]).toHaveTextContent("Andrea Simonazzi");
    expect(rows[1]).toHaveTextContent("Enrico Giovanetti");

    fireEvent.click(raritySort);
    rows = roster.querySelectorAll(".member-row:not(.people-head)");
    expect(rows[0]).toHaveTextContent("Enrico Giovanetti");
    expect(rows[1]).toHaveTextContent("Andrea Simonazzi");
  });

  it("filters enrolled athletes using the values of their columns", () => {
    const initial = createInitialState(1_000);
    const members = [
      {
        ...initial.contacts[0],
        id: "member-hidden",
        firstName: "Carla",
        lastName: "Base",
        email: "carla@example.test",
        status: "enrolled" as const,
        rarity: "legendary" as const,
        forms: [] as FormId[],
      },
      {
        ...initial.contacts[1],
        id: "member-high",
        firstName: "Alba",
        lastName: "Esperta",
        email: "alba@example.test",
        status: "enrolled" as const,
        rarity: "common" as const,
        forms: ["course-y" as const],
        arenaBase: 90,
        styleBase: 70,
      },
      {
        ...initial.contacts[2],
        id: "member-low",
        firstName: "Bruno",
        lastName: "Raro",
        email: "bruno@example.test",
        status: "enrolled" as const,
        rarity: "rare" as const,
        forms: ["course-y" as const],
        arenaBase: 20,
        styleBase: 30,
      },
    ];
    render(
      <PeopleView
        state={{
          ...initial,
          contacts: members,
          school: { ...initial.school, activeMembers: members.length },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Iscritti" });
    expect(within(roster).getByRole("combobox", { name: "Filtra iscritti per rarità" })).toBeVisible();
    expect(within(roster).getByRole("spinbutton", { name: "Filtra iscritti per Arena minima" })).toBeVisible();

    fireEvent.change(within(roster).getByRole("combobox", { name: "Filtra iscritti per rarità" }), {
      target: { value: "rare" },
    });
    expect(within(roster).getByText("Bruno Raro")).toBeVisible();
    expect(within(roster).queryByText("Alba Esperta")).not.toBeInTheDocument();

    fireEvent.click(within(roster).getByRole("button", { name: "Azzera filtri" }));
    fireEvent.change(within(roster).getByRole("spinbutton", { name: "Filtra iscritti per Arena minima" }), {
      target: { value: "50" },
    });
    expect(within(roster).getByText("Alba Esperta")).toBeVisible();
    expect(within(roster).queryByText("Bruno Raro")).not.toBeInTheDocument();
    expect(within(roster).queryByText("Carla Base")).not.toBeInTheDocument();
    expect(within(roster).getByText("1 di 3 iscritti")).toBeVisible();
  });

  it("uses one shared progress clock for multiple simultaneous trainings", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.slice(0, 2).map((contact, index) => ({
      ...contact,
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 100_000,
      },
      id: `training-member-${index}`,
    }));
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(
      <PeopleView
        state={{
          ...initial,
          contacts,
          school: { ...initial.school, activeMembers: contacts.length },
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(intervalSpy).toHaveBeenCalledTimes(1);
    intervalSpy.mockRestore();
  });

  it("shows only active members and excludes people who left the school", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.map((contact, index) => ({
      ...contact,
      status: index < 3 ? ("enrolled" as const) : ("departed" as const),
    }));

    render(
      <PeopleView
        state={{ ...initial, contacts, school: { ...initial.school, activeMembers: 3 } }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const membersHeading = screen.getByRole("heading", { name: "Iscritti attivi" });
    expect(membersHeading).toBeVisible();
    expect(membersHeading.parentElement).toHaveClass("is-inline-count");
    expect(membersHeading.parentElement).toHaveTextContent("3");
    expect(screen.getAllByText("Iscritto")).toHaveLength(3);
    expect(screen.queryByText("Ha lasciato la scuola")).not.toBeInTheDocument();
  });

  it("shows monthly member and Social income with an accessible breakdown", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.map((contact, index) => ({
      ...contact,
      status: index < 2 ? ("enrolled" as const) : contact.status,
      forms: index === 0 ? (["form-1"] as FormId[]) : contact.forms,
    }));
    const memberFees = 85;
    const socialIncome = 10;

    render(
      <PeopleView
        state={{
          ...initial,
          contacts,
          school: {
            ...initial.school,
            activeMembers: 2,
            followers: 100,
          },
          unlocks: { ...initial.unlocks, social: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const income = screen.getByRole("button", {
      name: `Guadagno al mese: ${formatCurrency(memberFees + socialIncome)}`,
    });
    expect(income).toBeVisible();
    const pageHeader = screen.getByRole("heading", { name: "Iscritti", level: 1 })
      .closest("header");
    expect(pageHeader).toContainElement(income);
    expect(screen.getByRole("heading", { name: "Iscritti attivi" }).parentElement)
      .not.toContainElement(income);

    const tooltip = screen.getByRole("tooltip");
    expect(income).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Quote iscritti");
    expect(tooltip).toHaveTextContent(/85,00\s*€/);
    expect(tooltip).toHaveTextContent("Bonus Social");
    expect(tooltip).toHaveTextContent(/10,00\s*€/);
  });

  it("keeps advanced roster concepts hidden for the first member", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, fame: 1 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Collaboratori" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Sistema di rarità" })).not.toBeInTheDocument();
  });

  it("shows collaborators and changes their single assignment", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      collaborators: [
        {
          id: "collaborator-1",
          contactId: initial.contacts[0].id,
          displayName: "Andrea Simonazzi",
          joinedAt: 1_000,
          forms: ["form-1" as const, "course-x" as const, "form-2" as const, "course-y" as const],
          instructorForms: ["form-1" as const],
          assignment: null,
          rarity: "legendary" as const,
          specialProfileId: "andrea-simonazzi" as const,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true },
    };
    const onAssign = vi.fn();
    render(<PeopleView state={state} onAssign={onAssign} onStartTraining={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Iscritti" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Potenziali interessati/ })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "ComuneComparsa: 80%Prova dopo la mail: 40%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Ultra RaroComparsa: 5,5%Prova dopo la mail: 75%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "LeggendarioComparsa: 2%Prova dopo la mail: 100%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Effettiva base mail → iscritto: 25%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Effettiva base mail → iscritto: 17,5%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" }))
      .not.toHaveTextContent("Pity");
    const collaboratorsHeading = screen.getByRole("heading", { name: "Collaboratori" });
    const membersHeading = screen.getByRole("heading", { name: "Iscritti attivi" });
    expect(collaboratorsHeading.compareDocumentPosition(membersHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("Andrea Simonazzi")).toHaveClass("rarity-legendary");
    expect(screen.queryByText("VIP")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Forma 1 — emblema ufficiale/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /Corso X — emblema generato/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /Corso Y — emblema ufficiale/ })).toBeVisible();
    const collaboratorRegion = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    const formOneLogo = within(collaboratorRegion).getByRole("img", {
      name: /Forma 1 — emblema ufficiale/,
    }).closest(".form-logo-item");
    const courseXLogo = within(collaboratorRegion).getByRole("img", {
      name: /Corso X — emblema generato/,
    }).closest(".form-logo-item");
    expect(formOneLogo).toHaveClass("instructor-certified");
    expect(formOneLogo).toHaveTextContent("♛");
    expect(courseXLogo).not.toHaveClass("instructor-certified");
    expect(within(collaboratorRegion).queryByText("Collaboratore VIP")).not.toBeInTheDocument();
    const officialStats = collaboratorRegion.querySelector(".collaborator-official-stats");
    expect(officialStats).toHaveTextContent("Arena");
    expect(officialStats).toHaveTextContent("Stile");
    expect(officialStats?.querySelectorAll(":scope > span")).toHaveLength(2);
    expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
    expect(screen.queryByText(/Livello Leggendario/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Potere VIP ×2/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dettagli di Andrea Simonazzi" }));
    expect(screen.getByRole("dialog", { name: "Scheda collaboratore" })).not.toHaveTextContent("VIP");
    fireEvent.change(screen.getByRole("combobox", { name: "Assegnazione" }), {
      target: { value: "writing" },
    });

    expect(onAssign).toHaveBeenCalledWith("collaborator-1", "writing");
  });

  it("keeps collaborator cards bounded and paginates the full roster", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 30 }, (_, index) => ({
      id: `collaborator-${index}`,
      contactId: initial.contacts[index % initial.contacts.length].id,
      displayName: `Collaboratore Scalabile ${index}`,
      joinedAt: 1_000 + index,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      assignment: null,
      rarity: "ultra-rare" as const,
    }));

    render(
      <PeopleView
        state={{
          ...initial,
          collaborators,
          unlocks: { ...initial.unlocks, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(roster.querySelectorAll(".collaborator-row")).toHaveLength(25);
    expect(within(roster).getByText("Collaboratore Scalabile 0")).toBeVisible();
    expect(within(roster).getByText("Pagina 1 di 2")).toBeVisible();

    fireEvent.click(within(roster).getByRole("button", { name: "Successiva" }));

    expect(roster.querySelectorAll(".collaborator-row")).toHaveLength(5);
    expect(within(roster).getByText("Collaboratore Scalabile 29")).toBeVisible();
    expect(within(roster).queryByText("Collaboratore Scalabile 0")).not.toBeInTheDocument();
  });

  it("filters collaborators by the values shown in their table columns", () => {
    const initial = createInitialState(1_000);
    const collaborators = [
      {
        id: "writer",
        contactId: initial.contacts[0].id,
        displayName: "Alba Autrice",
        joinedAt: 1_000,
        forms: [] as FormId[],
        instructorForms: [] as FormId[],
        assignment: "writing" as const,
        rarity: "legendary" as const,
        mastery: { writing: 120, events: 0, equipment: 0, instructor: 0 },
      },
      {
        id: "event-manager",
        contactId: initial.contacts[1].id,
        displayName: "Bruno Eventi",
        joinedAt: 1_000,
        forms: ["course-y" as const],
        instructorForms: [] as FormId[],
        assignment: "events" as const,
        rarity: "ultra-rare" as const,
      },
      {
        id: "unassigned",
        contactId: initial.contacts[2].id,
        displayName: "Carla Libera",
        joinedAt: 1_000,
        forms: [] as FormId[],
        instructorForms: [] as FormId[],
        assignment: null,
        rarity: "ultra-rare" as const,
      },
    ];
    render(
      <PeopleView
        state={{
          ...initial,
          collaborators,
          unlocks: { ...initial.unlocks, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    fireEvent.change(within(roster).getByPlaceholderText("Nome o email"), {
      target: { value: "Bruno" },
    });
    expect(within(roster).getByText("Bruno Eventi")).toBeVisible();
    expect(within(roster).queryByText("Alba Autrice")).not.toBeInTheDocument();

    fireEvent.click(within(roster).getByRole("button", { name: "Azzera" }));
    fireEvent.change(within(roster).getByRole("combobox", { name: "Filtra per livello" }), {
      target: { value: "1" },
    });
    expect(within(roster).getByText("Alba Autrice")).toBeVisible();
    expect(within(roster).queryByText("Bruno Eventi")).not.toBeInTheDocument();

    fireEvent.click(within(roster).getByRole("button", { name: "Azzera" }));
    fireEvent.change(within(roster).getByRole("combobox", { name: "Filtra per statistiche" }), {
      target: { value: "visible" },
    });
    expect(within(roster).getByText("Bruno Eventi")).toBeVisible();
    expect(within(roster).queryByText("Carla Libera")).not.toBeInTheDocument();
  });

  it("sorts collaborator rows using column data in both directions", () => {
    const initial = createInitialState(1_000);
    const contacts = [
      { ...initial.contacts[0], id: "contact-carla", arenaBase: 1, styleBase: 1 },
      { ...initial.contacts[1], id: "contact-alba", arenaBase: 90, styleBase: 70 },
      { ...initial.contacts[2], id: "contact-bruno", arenaBase: 20, styleBase: 30 },
    ];
    const collaborators = [
      {
        id: "collaborator-carla",
        contactId: "contact-carla",
        displayName: "Carla Base",
        joinedAt: 1_000,
        forms: [] as FormId[],
        instructorForms: [] as FormId[],
        assignment: null,
        rarity: "ultra-rare" as const,
      },
      {
        id: "collaborator-alba",
        contactId: "contact-alba",
        displayName: "Alba Esperta",
        joinedAt: 1_000,
        forms: ["course-y" as const],
        instructorForms: [] as FormId[],
        assignment: "writing" as const,
        rarity: "legendary" as const,
      },
      {
        id: "collaborator-bruno",
        contactId: "contact-bruno",
        displayName: "Bruno Tecnico",
        joinedAt: 1_000,
        forms: ["course-y" as const],
        instructorForms: [] as FormId[],
        assignment: "equipment" as const,
        rarity: "ultra-rare" as const,
      },
    ];
    render(
      <PeopleView
        state={{
          ...initial,
          contacts,
          collaborators,
          unlocks: { ...initial.unlocks, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    const nameSort = within(roster).getByRole("button", {
      name: "Ordina collaboratori per Collaboratore",
    });
    fireEvent.click(nameSort);
    let rows = roster.querySelectorAll(".collaborator-row");
    expect(rows[0]).toHaveTextContent("Alba Esperta");
    expect(rows[1]).toHaveTextContent("Bruno Tecnico");
    expect(rows[2]).toHaveTextContent("Carla Base");

    fireEvent.click(nameSort);
    rows = roster.querySelectorAll(".collaborator-row");
    expect(rows[0]).toHaveTextContent("Carla Base");
    expect(nameSort.closest('[role="columnheader"]')).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(within(roster).getByRole("button", {
      name: "Ordina collaboratori per Arena",
    }));
    rows = roster.querySelectorAll(".collaborator-row");
    expect(rows[0]).toHaveTextContent("Bruno Tecnico");
    expect(rows[1]).toHaveTextContent("Alba Esperta");
    expect(rows[2]).toHaveTextContent("Carla Base");
  });

  it("shows every collaborator automation progress without the Corso Agonisti box", () => {
    const initial = createInitialState(1_000);
    const assignments = ["writing", "events", "instructor", "equipment"] as const;
    const collaborators = assignments.map((assignment, index) => ({
      id: `collaborator-${index}`,
      contactId: initial.contacts[index].id,
      displayName: `Collaboratore ${index}`,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment,
      rarity: "ultra-rare" as const,
    }));
    render(
      <PeopleView
        state={{
          ...initial,
          emails: [],
          collaborators,
          upgrades: { ...initial.upgrades, "technical-arena": 1 },
          automation: {
            ...initial.automation,
            lessonBuffer: 0.25,
            socialContentBuffer: 50_000,
            equipmentBuffer: 0.75,
            lastImprovedAthlete: "Mario Rossi",
          },
          equipment: { ...initial.equipment, wear: 42 },
          acquisitionEvents: [
            {
              id: "event-1",
              definitionId: "public-demo",
              title: "Lezioni all'aperto",
              location: "Parco",
              startedAt: 1_000,
              resolvesAt: 11_000,
              cost: 120,
              peopleMet: 10,
              demonstrationsGiven: 5,
              contactReward: 2,
              membersUsed: 2,
              equipmentUsed: 4,
              wearAdded: 6,
              collaboratorId: "collaborator-1",
              status: "running",
            },
          ],
          unlocks: { ...initial.unlocks, collaborators: true, social: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.queryByText("Corso Agonisti")).not.toBeInTheDocument();
    expect(screen.getByText("Contenuti Social")).toBeVisible();
    expect(screen.getByText("Lezioni all'aperto")).toBeVisible();
    expect(screen.getByText("In attesa di un allievo")).toBeVisible();
    expect(screen.getByText(/50% follower · \+0% Eventi/)).toBeVisible();
    const socialCard = screen.getByText("Contenuti Social").closest("article");
    expect(socialCard).not.toBeNull();
    expect(within(socialCard!).queryByText(/contatto/i)).not.toBeInTheDocument();
    expect(screen.getByText("Usura attrezzatura: 42")).toBeVisible();
    expect(screen.getByRole("progressbar", {
      name: "Condizione attrezzatura di Collaboratore 3",
    })).toHaveClass("is-aggregate");
    expect(screen.getAllByRole("progressbar")).toHaveLength(7);
    expect(screen.getAllByRole("progressbar", { name: "Progresso verso Iniziato" })).toHaveLength(4);
    expect(screen.queryByRole("checkbox", { name: "Attivo" })).not.toBeInTheDocument();
  });

  it("shows separate Social and email rows in the aggregate Social box", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-social-workstreams",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Social",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "writing" as const,
      rarity: "rare" as const,
    };
    const state = {
      ...initial,
      emails: [],
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, collaborators: true, social: true },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: { ...initial.collaboratorManagement.targets, writing: 1 },
      },
    };
    const props = {
      onAssign: () => undefined,
      onStartTraining: () => undefined,
    };
    const { rerender } = render(<PeopleView state={state} {...props} />);

    let socialCard = screen.getByRole("heading", { name: "Social" }).closest("article");
    expect(socialCard).not.toBeNull();
    expect(within(socialCard!).getByLabelText("Contenuti Social")).toBeVisible();
    const idleEmail = within(socialCard!).getByLabelText("Scrittura email inattiva");
    expect(idleEmail).toHaveClass("is-inactive");
    expect(within(idleEmail).getByText("Nessuna email da scrivere")).toBeVisible();

    rerender(<PeopleView state={{ ...state, emails: initial.emails }} {...props} />);
    socialCard = screen.getByRole("heading", { name: "Social" }).closest("article");
    const activeEmail = within(socialCard!).getByLabelText("Scrittura email");
    expect(activeEmail).not.toHaveClass("is-inactive");
    expect(within(activeEmail).getByText(initial.emails[0].subject, { exact: false }))
      .toBeVisible();
    expect(within(socialCard!).queryByText(/forza lavoro/)).not.toBeInTheDocument();
  });

  it("shows the aggregate equipment condition in the row and detail drawer", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborator = {
      id: "collaborator-equipment",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment" as const,
      rarity: "rare" as const,
    };

    render(
      <PeopleView
        state={{
          ...initial,
          collaborators: [equipmentCollaborator],
          equipment: { ...initial.equipment, wear: 10 },
          automation: {
            ...initial.automation,
            equipmentBuffer: 0.2,
            lastProcessedAt: 1_000,
          },
          unlocks: { ...initial.unlocks, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const rowCondition = screen.getByRole("progressbar", {
      name: "Condizione attrezzatura di Collaboratore Attrezzatura",
    });
    expect(rowCondition).toHaveClass("is-aggregate");
    expect(rowCondition).toHaveAttribute("aria-valuemax", "600");
    expect(rowCondition).toHaveAttribute("aria-valuenow", "10");
    expect(rowCondition.querySelectorAll(".equipment-condition-segment")).toHaveLength(4);
    expect(rowCondition.querySelectorAll(".equipment-sword-cell")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", {
      name: "Dettagli di Collaboratore Attrezzatura",
    }));
    expect(screen.getByRole("progressbar", {
      name: "Condizione attrezzatura nel dettaglio di Collaboratore Attrezzatura",
    })).toHaveClass("is-aggregate");
  });

  it("shows the Corso Agonisti total in the athlete row instead of the inbox", () => {
    const initial = createInitialState(1_000);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      agonistCourseCompletions: 3,
      agonistCourseArenaBonus: 3,
      agonistCourseStyleBonus: 3,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [athlete],
          school: { ...initial.school, activeMembers: 1 },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const athleteRow = screen.getByText(`${athlete.firstName} ${athlete.lastName}`)
      .closest(".member-row");
    expect(athleteRow).not.toBeNull();
    const courseMessage = within(athleteRow as HTMLElement).getByText(
      "Corso Agonisti | Potenziale totale +6",
    );
    expect(courseMessage).toBeVisible();
    expect(courseMessage.closest(".member-training-cell")).not.toBeNull();
    expect(courseMessage.closest(".member-status")).toBeNull();
  });

  it("shows the assigned student's condensed training progress for an instructor", () => {
    const initial = createInitialState(1_000);
    const student = {
      ...initial.contacts[1],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 0,
        completesAt: 1,
        instructorId: "collaborator-1",
      },
    };
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => (contact.id === student.id ? student : contact)),
      collaborators: [
        {
          id: "collaborator-1",
          contactId: initial.contacts[0].id,
          displayName: "Andrea Simonazzi",
          joinedAt: 1_000,
          forms: ["form-1" as const, "course-x" as const, "form-2" as const, "course-y" as const],
          instructorForms: [],
          assignment: "instructor" as const,
          rarity: "legendary" as const,
          specialProfileId: "andrea-simonazzi" as const,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true, forms: true },
    };

    render(
      <PeopleView state={state} onAssign={() => undefined} onStartTraining={() => undefined} />,
    );

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByText(`${student.firstName} ${student.lastName}`)).toBeVisible();
    const fastProgress = within(region).getByRole("progressbar", {
      name: `Formazione di ${student.firstName} ${student.lastName}`,
    });
    expect(fastProgress).toHaveClass("is-indeterminate");
    expect(fastProgress).not.toHaveAttribute("aria-valuenow");
  });

  it("offers timed Instructor courses instead of a bulk certificate purchase", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: ["form-1", "course-x", "form-2", "course-y"] as FormId[],
      instructorForms: [],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      specialProfileId: "andrea-simonazzi" as const,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, euros: 3_000 },
          collaborators: [collaborator],
          unlocks: { ...initial.unlocks, collaborators: true, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByText("Scegli la prossima formazione")).toBeVisible();
    expect(within(region).queryByRole("button", { name: "Paga attestati" })).not.toBeInTheDocument();
  });

  it("also shows collaborators in the members list without training controls", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const, forms: [] as FormId[] };
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === enrolled.id ? enrolled : contact,
      ),
      collaborators: [
        {
          id: "collaborator-1",
          contactId: enrolled.id,
          displayName: `${enrolled.firstName} ${enrolled.lastName}`,
          joinedAt: 1_000,
          forms: ["form-1" as const],
          instructorForms: ["form-1" as const],
          assignment: "writing" as const,
          rarity: enrolled.rarity,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    render(
      <PeopleView state={state} onAssign={() => undefined} onStartTraining={() => undefined} />,
    );

    const collaborators = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    const members = screen.getByRole("region", { name: "Iscritti" });
    expect(
      within(collaborators).getByText(`${enrolled.firstName} ${enrolled.lastName}`),
    ).toBeVisible();
    expect(within(collaborators).getByText("F1", { exact: true })).toBeVisible();
    const memberName = within(members).getByText(`${enrolled.firstName} ${enrolled.lastName}`);
    const memberRow = memberName.closest(".member-row");
    expect(memberName).toBeVisible();
    const memberFormLogo = memberRow?.querySelector(".form-logo-item");
    expect(memberFormLogo).toHaveClass("instructor-certified");
    expect(memberFormLogo).toHaveTextContent("♛");
    expect(within(members).queryByText(/Esperienza tornei/)).not.toBeInTheDocument();
    expect(memberRow?.querySelector(".member-training-cell")).toHaveTextContent(
      /^Collaboratore$/,
    );
    expect(within(members).queryByRole("combobox", {
      name: `Formazione per ${enrolled.firstName} ${enrolled.lastName}`,
    })).not.toBeInTheDocument();
  });

  it("shows only the official Arena and Style values with their score colors", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["course-y"] as FormId[],
      arenaBase: 108.564,
      styleBase: 50,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const roster = screen.getByRole("region", { name: "Iscritti" });
    const arena = within(roster).getByText("108.564");
    const style = within(roster).getByText("50.000");
    expect(arena.style.getPropertyValue("--official-stat-from")).toBe("var(--official-stat-100)");
    expect(arena.style.getPropertyValue("--official-stat-to")).toBe("var(--official-stat-150)");
    expect(arena).toHaveClass("official-stat-value");
    expect(arena.tagName).toBe("STRONG");
    expect(style.style.getPropertyValue("--official-stat-from")).toBe("var(--official-stat-50)");
    expect(style.style.getPropertyValue("--official-stat-to")).toBe("var(--official-stat-100)");
    expect(style).toHaveClass("official-stat-value");
    expect(style.tagName).toBe("STRONG");
    expect(roster).not.toHaveTextContent("→");
  });

  it("lets enrolled members start a manual form training without an instructor", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      enrolledMonth: 21,
    };
    const displayName = `${enrolled.firstName} ${enrolled.lastName}`;
    const onStartTraining = vi.fn();
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, euros: 50, currentMonth: 21 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={onStartTraining}
      />,
    );

    expect(screen.getByText("Rischio abbandono - alto")).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: `Formazione per ${displayName}` }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Forma 1/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Paga e avvia/ }));
    expect(onStartTraining).toHaveBeenCalledWith(enrolled.id, "form-1");
  });

  it("places cancellation at the row end and asks for confirmation in a modal", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    const onCancelEnrollment = vi.fn();

    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [enrolled, ...initial.contacts.slice(1)],
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onCancelEnrollment={onCancelEnrollment}
      />,
    );

    const cancellationButton = screen.getByRole("button", {
      name: `Annulla l'iscrizione di ${enrolled.firstName} ${enrolled.lastName}`,
    });
    expect(cancellationButton.closest(".member-row")?.lastElementChild).toBe(cancellationButton);

    fireEvent.click(cancellationButton);

    const dialog = screen.getByRole("alertdialog", { name: "Annullare l'iscrizione?" });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent(`${enrolled.firstName} ${enrolled.lastName}`);
    expect(onCancelEnrollment).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Mantieni iscrizione" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onCancelEnrollment).not.toHaveBeenCalled();

    fireEvent.click(cancellationButton);
    fireEvent.click(within(
      screen.getByRole("alertdialog", { name: "Annullare l'iscrizione?" }),
    ).getByRole("button", { name: "Annulla iscrizione" }));

    expect(onCancelEnrollment).toHaveBeenCalledWith(enrolled.id);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("prevents cancelling the enrollment of a favorite athlete", () => {
    const initial = createInitialState(1_000);
    const favorite = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      favorite: true,
    };
    const onCancelEnrollment = vi.fn();

    render(
      <PeopleView
        state={{
          ...initial,
          contacts: [favorite, ...initial.contacts.slice(1)],
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onCancelEnrollment={onCancelEnrollment}
      />,
    );

    const protectedCancellation = screen.getByRole("button", {
      name: `Iscrizione protetta per ${favorite.firstName} ${favorite.lastName}: atleta preferito`,
    });
    expect(protectedCancellation).toBeDisabled();
    expect(protectedCancellation).toHaveAttribute(
      "title",
      "Rimuovi l'atleta dai preferiti per annullare l'iscrizione",
    );
    fireEvent.click(protectedCancellation);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onCancelEnrollment).not.toHaveBeenCalled();
  });

  it("replaces manual training with every possible next Form when an Instructor is assigned", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2", "course-y"] as FormId[],
      formBranchPreferences: [
        "Spada Lunga",
        "Staffa",
        "Doppia spada corta",
      ] as FormBranch[],
    };
    const instructor = {
      id: "assigned-instructor",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore assegnato",
      joinedAt: 1_000,
      forms: ["form-1"] as FormId[],
      instructorForms: ["form-1"] as FormId[],
      assignment: "instructor" as const,
      rarity: "ultra-rare" as const,
    };

    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 21 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          collaborators: [instructor],
          unlocks: { ...initial.unlocks, forms: true, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const memberName = screen.getByText(`${enrolled.firstName} ${enrolled.lastName}`);
    const memberRow = memberName.closest(".member-row");
    expect(memberRow).not.toBeNull();
    const trainingCell = within(memberRow as HTMLElement).getByText("Prossime Forme possibili")
      .closest(".member-training-cell");

    expect(trainingCell).toHaveTextContent("Forma 3 Spada Lunga");
    expect(trainingCell).toHaveTextContent("Forma 3 Staffa");
    expect(trainingCell).toHaveTextContent("Forma 3 Doppie Spade Corte");
    expect(within(trainingCell as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
    expect(within(trainingCell as HTMLElement).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("does not repeat the current form label below its logo", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1"] as FormId[],
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, euros: 50 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getAllByText("Forma 1", { exact: true })).toHaveLength(1);
  });

  it("does not report Forma 7 when the member has only trained this year", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1"] as FormId[],
      lastFormTrainingYear: 1,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 1 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByText("Corsi annuali completati")).toBeVisible();
    expect(screen.queryByText("Percorso completato alla Forma 7")).not.toBeInTheDocument();
  });

  it("shows qualitative departure risk for members without current-year form training", () => {
    const initial = createInitialState(1_000);
    const members = [
      { ...initial.contacts[0], status: "enrolled" as const, enrolledMonth: 9, forms: [] as FormId[] },
      { ...initial.contacts[1], status: "enrolled" as const, enrolledMonth: 9, forms: ["form-3-long"] as FormId[] },
      { ...initial.contacts[2], status: "enrolled" as const, enrolledMonth: 9, forms: ["form-6"] as FormId[] },
    ];
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: members.length, currentMonth: 21 },
          contacts: initial.contacts.map(
            (contact) => members.find((member) => member.id === contact.id) ?? contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getAllByText("Rischio abbandono - alto")).toHaveLength(1);
    expect(screen.getAllByText("Rischio abbandono - medio")).toHaveLength(1);
    expect(screen.getAllByText("Rischio abbandono - basso")).toHaveLength(1);
    expect(screen.queryByText(/Rischio annuo se ignorato/)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Iscritti" })).queryByText(/abbandono.*%/i),
    ).not.toBeInTheDocument();
  });

  it("shows departure immunity for a January-August enrollment until September", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      enrolledMonth: 13,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 18 },
          contacts: [enrolled],
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByText("Nuova iscrizione")).toBeVisible();
    expect(screen.queryByText(/Rischio abbandono/)).not.toBeInTheDocument();
  });

  it("shows no risk after a member completes form training this school year", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      enrolledMonth: 9,
      lastFormTrainingYear: 2,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 21 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByText("Corso in palestra")).toBeVisible();
    expect(screen.queryByText(/Seguito quest'anno/)).not.toBeInTheDocument();
  });

  it("shows the weapon selector after Course Y", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2", "course-y"] as FormId[],
      formBranchPreferences: ["Spada Lunga", "Staffa"] as Array<"Spada Lunga" | "Staffa">,
    };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, euros: 600 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    const trainingPicker = screen.getByRole("radiogroup", {
      name: `Formazione per ${enrolled.firstName} ${enrolled.lastName}`,
    });
    expect(trainingPicker).toBeVisible();
    expect(screen.queryByRole("combobox", {
      name: `Formazione per ${enrolled.firstName} ${enrolled.lastName}`,
    })).not.toBeInTheDocument();
    const staffOption = within(trainingPicker).getByRole("radio", { name: /Forma 3 Staffa/ });
    fireEvent.click(staffOption);
    expect(staffOption).toHaveAttribute("aria-checked", "true");
  });

  it("shows the summer break instead of allowing Form training in July", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 7 },
          contacts: initial.contacts.map((contact) =>
            contact.id === enrolled.id ? enrolled : contact,
          ),
          unlocks: { ...initial.unlocks, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
      />,
    );

    expect(screen.getByText("Pausa estiva")).toBeVisible();
    expect(screen.getByText("Le Forme riprendono a settembre")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: /Formazione per/ })).not.toBeInTheDocument();
  });

  it("allows an instructor who already trained this year to study during summer while teaching", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "summer-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Istruttore Estivo",
      joinedAt: 1_000,
      forms: ["form-1"] as FormId[],
      instructorForms: ["form-1"] as FormId[],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const student = {
      ...initial.contacts[1],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 31_000,
        instructorId: instructor.id,
      },
    };
    const onStartTraining = vi.fn();
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, currentMonth: 19, euros: 400 },
          contacts: initial.contacts.map((contact) =>
            contact.id === student.id ? student : contact,
          ),
          collaborators: [instructor],
          unlocks: { ...initial.unlocks, collaborators: true, forms: true },
          upgrades: { ...initial.upgrades, "project-x": 1 },
        }}
        onAssign={() => undefined}
        onStartTraining={onStartTraining}
      />,
    );

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByRole("img", { name: /Corso X/ })).toBeVisible();
    expect(within(region).getByRole("button", { name: /Paga e avvia/ })).toBeEnabled();
    fireEvent.click(within(region).getByRole("button", { name: /Paga e avvia/ }));

    expect(onStartTraining).toHaveBeenCalledWith(instructor.id, "course-x");
  });
});
