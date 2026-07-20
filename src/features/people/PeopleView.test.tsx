import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { FormId } from "../../game/types";
import { PeopleView } from "./PeopleView";

afterEach(() => cleanup());

describe("PeopleView", () => {
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
      forms: ["course-x" as const],
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
      forms: ["course-x" as const],
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
    expect(membersHeading.parentElement).toHaveTextContent("3");
    expect(screen.getAllByText("Iscritto")).toHaveLength(3);
    expect(screen.queryByText("Ha lasciato la scuola")).not.toBeInTheDocument();
  });

  it("keeps advanced roster concepts hidden for the first member", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    render(
      <PeopleView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 1, historicMembers: 1 },
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

  it("shows Arena Tecnica toggle and every collaborator automation progress", () => {
    const initial = createInitialState(1_000);
    const assignments = ["writing", "events", "lessons", "social", "equipment"] as const;
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
    const onToggleAgonistCourses = vi.fn();
    render(
      <PeopleView
        state={{
          ...initial,
          collaborators,
          upgrades: { ...initial.upgrades, "technical-arena": 1 },
          automation: {
            ...initial.automation,
            agonistCoursesEnabled: true,
            lessonBuffer: 0.25,
            socialBuffer: 0.5,
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
          unlocks: { ...initial.unlocks, collaborators: true },
        }}
        onAssign={() => undefined}
        onStartTraining={() => undefined}
        onToggleAgonistCourses={onToggleAgonistCourses}
      />,
    );

    expect(screen.getByText("Corso Agonisti")).toBeVisible();
    expect(screen.getByText(initial.emails[0].subject)).toBeVisible();
    expect(screen.getByText("Lezioni all'aperto")).toBeVisible();
    expect(screen.getByText("Ultimo atleta migliorato: Mario Rossi")).toBeVisible();
    expect(screen.getByText("Prossimo rendimento · 0,00 €")).toBeVisible();
    expect(screen.getByText("Ciclo base 60 s · 1% prova · 1% nuovo contatto")).toBeVisible();
    expect(screen.getByText("Usura attrezzatura: 42%")).toBeVisible();
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
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
    expect(
      within(region).getByRole("progressbar", {
        name: `Formazione di ${student.firstName} ${student.lastName}`,
      }),
    ).toHaveAttribute("aria-valuenow", "100");
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

    const region = screen.getByRole("region", { name: "Collaboratori delle Onde" });
    expect(within(region).getByText(/850,00/)).toBeVisible();
    fireEvent.click(within(region).getByRole("button", { name: "Paga attestati" }));

    expect(onPayInstructorCertificates).toHaveBeenCalledWith(collaborator.id);
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
      forms: ["course-x"] as FormId[],
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
          school: { ...initial.school, activeMembers: 1, euros: 25, currentMonth: 21 },
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

    expect(screen.getByText("Hai raggiunto il limite di Forme per quest'anno")).toBeVisible();
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

    expect(screen.getByText("Nuova iscrizione · immune fino a Settembre")).toBeVisible();
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

    expect(screen.getByText("Corso in palestra · immune al rinnovo annuale")).toBeVisible();
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

    const trainingSelect = screen.getByRole("combobox", {
      name: `Formazione per ${enrolled.firstName} ${enrolled.lastName}`,
    });
    expect(trainingSelect).toBeVisible();
    fireEvent.change(trainingSelect, { target: { value: "form-3-staff" } });
    expect(screen.getByRole("img", { name: /Forma 3/ })).toBeVisible();
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
