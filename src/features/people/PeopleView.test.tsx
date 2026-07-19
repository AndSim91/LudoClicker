import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { FormId } from "../../game/types";
import { PeopleView } from "./PeopleView";

afterEach(() => cleanup());

describe("PeopleView", () => {
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

    render(<PeopleView
      state={{
        ...initial,
        contacts,
        school: { ...initial.school, activeMembers: contacts.length },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    const roster = screen.getByRole("region", { name: "Iscritti" });
    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(75);
    expect(within(roster).getByText("Membro 0 Scalabile")).toBeVisible();
    expect(within(roster).getByText("Pagina 1 di 3")).toBeVisible();

    fireEvent.click(within(roster).getByRole("button", { name: "Successiva" }));

    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(75);
    expect(within(roster).queryByText("Membro 0 Scalabile")).not.toBeInTheDocument();
    expect(within(roster).getByText("Membro 75 Scalabile")).toBeVisible();

    fireEvent.click(within(roster).getByRole("button", { name: "Successiva" }));

    expect(roster.querySelectorAll(".member-row:not(.people-head)")).toHaveLength(10);
    expect(within(roster).getByText("Membro 159 Scalabile")).toBeVisible();
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

    render(<PeopleView
      state={{
        ...initial,
        contacts,
        school: { ...initial.school, activeMembers: contacts.length },
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(intervalSpy).toHaveBeenCalledTimes(1);
    intervalSpy.mockRestore();
  });

  it("shows only active members and excludes people who left the school", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.map((contact, index) => ({
      ...contact,
      status: index < 3 ? "enrolled" as const : "departed" as const,
    }));

    render(<PeopleView
      state={{ ...initial, contacts, school: { ...initial.school, activeMembers: 3 } }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    expect(screen.getByRole("tab", { name: "Iscritti attivi (3)" })).toBeVisible();
    expect(screen.getAllByText("Iscritto")).toHaveLength(3);
    expect(screen.queryByText("Ha lasciato la scuola")).not.toBeInTheDocument();
  });

  it("keeps advanced roster concepts hidden for the first member", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    render(<PeopleView state={{ ...initial, school: { ...initial.school, activeMembers: 1, historicMembers: 1 }, contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact), unlocks: { ...initial.unlocks, forms: true } }} onAssign={() => undefined} onStartTraining={() => undefined} />);

    expect(screen.queryByRole("tab", { name: /Collaboratori/ })).not.toBeInTheDocument();
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
          instructorForms: [],
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
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    expect(screen.getByText("Andrea Simonazzi")).toHaveClass("rarity-legendary");
    expect(screen.getByText("VIP")).toBeVisible();
    expect(screen.getByRole("img", { name: /Forma 1 — emblema ufficiale/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /Corso X — emblema generato/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /Corso Y — emblema ufficiale/ })).toBeVisible();
    expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
    expect(screen.queryByText(/Livello Leggendario/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Potere VIP ×2/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Assegnazione" }), {
      target: { value: "writing" },
    });

    expect(onAssign).toHaveBeenCalledWith("collaborator-1", "writing");
  });

  it("shows Arena Tecnica toggle and writing/event progress", () => {
    const initial = createInitialState(1_000);
    const collaborators = ["writing", "events"].map((assignment, index) => ({
      id: `collaborator-${index}`,
      contactId: initial.contacts[index].id,
      displayName: `Collaboratore ${index}`,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: assignment as "writing" | "events",
      rarity: "ultra-rare" as const,
    }));
    const onToggleAgonistCourses = vi.fn();
    render(<PeopleView
      state={{
        ...initial,
        collaborators,
        upgrades: { ...initial.upgrades, "technical-arena": 1 },
        automation: { ...initial.automation, agonistCoursesEnabled: true },
        acquisitionEvents: [{
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
        }],
        unlocks: { ...initial.unlocks, collaborators: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
      onToggleAgonistCourses={onToggleAgonistCourses}
    />);

    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    expect(screen.getByText("Corso Agonisti")).toBeVisible();
    expect(screen.getByText(initial.emails[0].subject)).toBeVisible();
    expect(screen.getByText("Lezioni all'aperto")).toBeVisible();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: "Attivo" }));
    expect(onToggleAgonistCourses).toHaveBeenCalledWith(false);
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
      contacts: initial.contacts.map((contact) => contact.id === student.id ? student : contact),
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

    render(<PeopleView state={state} onAssign={() => undefined} onStartTraining={() => undefined} />);
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByText(`${student.firstName} ${student.lastName}`)).toBeVisible();
    expect(within(region).getByRole("progressbar", { name: `Formazione di ${student.firstName} ${student.lastName}` })).toHaveAttribute("aria-valuenow", "100");
  });

  it("shows the total and pays all missing instructor certificates at once", () => {
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
    const onPayInstructorCertificates = vi.fn();
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, euros: 1_000 },
          collaborators: [collaborator],
          unlocks: { ...initial.unlocks, collaborators: true, forms: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onPayInstructorCertificates={onPayInstructorCertificates}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByText(/850,00/)).toBeVisible();
    fireEvent.click(within(region).getByRole("button", { name: "Paga attestati" }));

    expect(onPayInstructorCertificates).toHaveBeenCalledWith(collaborator.id);
  });

  it("shows a collaborator's learned path in the members tab", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const, forms: [] as FormId[] };
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
      collaborators: [
        {
          id: "collaborator-1",
          contactId: enrolled.id,
          displayName: `${enrolled.firstName} ${enrolled.lastName}`,
          joinedAt: 1_000,
          forms: ["form-1" as const],
          instructorForms: [],
          assignment: null,
          rarity: enrolled.rarity,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    render(<PeopleView state={state} onAssign={() => undefined} onStartTraining={() => undefined} />);

    expect(screen.getByText("Forma 1", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Da iniziare/)).not.toBeInTheDocument();
  });

  it("shows only the official Arena and Style values with their score colors", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["course-x"] as FormId[],
      arenaBase: 108.564,
      styleBase: 50,
    };
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    const roster = screen.getByRole("region", { name: "Iscritti" });
    const arena = within(roster).getByText("108.564");
    const style = within(roster).getByText("50.000");
    expect(arena).toHaveStyle({ color: "rgb(176, 128, 0)" });
    expect(arena).toHaveClass("official-stat-value");
    expect(arena.tagName).toBe("STRONG");
    expect(style).toHaveStyle({ color: "rgb(23, 23, 23)" });
    expect(style).toHaveClass("official-stat-value");
    expect(style.tagName).toBe("STRONG");
    expect(roster).not.toHaveTextContent("→");
  });

  it("lets enrolled members start a manual form training without an instructor", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    const displayName = `${enrolled.firstName} ${enrolled.lastName}`;
    const onStartTraining = vi.fn();
    render(<PeopleView state={{ ...initial, school: { ...initial.school, activeMembers: 1, euros: 25 }, contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact), unlocks: { ...initial.unlocks, forms: true } }} onAssign={() => undefined} onStartTraining={onStartTraining} />);

    fireEvent.click(screen.getByRole("tab", { name: /Iscritti/ }));
    expect(screen.getByText("Rischio abbandono - alto")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: `Formazione per ${displayName}` })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Forma 1/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Paga e avvia/ }));
    expect(onStartTraining).toHaveBeenCalledWith(enrolled.id, "form-1");
  });

  it("does not repeat the current form label below its logo", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1"] as FormId[],
    };
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1, euros: 50 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

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
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1, currentMonth: 1 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    expect(screen.getByText("Hai raggiunto il limite di Forme per quest'anno")).toBeVisible();
    expect(screen.queryByText("Percorso completato alla Forma 7")).not.toBeInTheDocument();
  });

  it("shows qualitative departure risk for members without current-year form training", () => {
    const initial = createInitialState(1_000);
    const members = [
      { ...initial.contacts[0], status: "enrolled" as const, forms: [] as FormId[] },
      { ...initial.contacts[1], status: "enrolled" as const, forms: ["form-3-long"] as FormId[] },
      { ...initial.contacts[2], status: "enrolled" as const, forms: ["form-6"] as FormId[] },
    ];
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: members.length },
        contacts: initial.contacts.map((contact) => members.find((member) => member.id === contact.id) ?? contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    expect(screen.getAllByText("Rischio abbandono - alto")).toHaveLength(1);
    expect(screen.getAllByText("Rischio abbandono - medio")).toHaveLength(1);
    expect(screen.getAllByText("Rischio abbandono - basso")).toHaveLength(1);
    expect(screen.queryByText(/Rischio annuo se ignorato/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Iscritti" })).queryByText(/abbandono.*%/i))
      .not.toBeInTheDocument();
  });

  it("shows no risk after a member completes form training this school year", () => {
    const initial = createInitialState(1_000);
    const enrolled = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      lastFormTrainingYear: 1,
    };
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    expect(screen.getByText("Nessun rischio")).toBeVisible();
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
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1, euros: 600 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

    const trainingSelect = screen.getByRole("combobox", { name: `Formazione per ${enrolled.firstName} ${enrolled.lastName}` });
    expect(trainingSelect).toBeVisible();
    fireEvent.change(trainingSelect, { target: { value: "form-3-staff" } });
    expect(screen.getByRole("img", { name: /Forma 3/ })).toBeVisible();
  });

  it("shows the summer break instead of allowing Form training in July", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1, currentMonth: 7 },
        contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact),
        unlocks: { ...initial.unlocks, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={() => undefined}
    />);

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
    render(<PeopleView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 1, currentMonth: 19, euros: 400 },
        contacts: initial.contacts.map((contact) => contact.id === student.id ? student : contact),
        collaborators: [instructor],
        unlocks: { ...initial.unlocks, collaborators: true, forms: true },
      }}
      onAssign={() => undefined}
      onStartTraining={onStartTraining}
    />);
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByRole("img", { name: /Corso X/ })).toBeVisible();
    expect(within(region).getByRole("button", { name: /Paga e avvia/ })).toBeEnabled();
    fireEvent.click(within(region).getByRole("button", { name: /Paga e avvia/ }));

    expect(onStartTraining).toHaveBeenCalledWith(instructor.id, "course-x");
  });
});
