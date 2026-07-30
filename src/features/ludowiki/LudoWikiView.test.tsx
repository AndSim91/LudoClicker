import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import { createInitialState } from "../../game/engine";
import type { Contact } from "../../game/types";
import { LudoWikiView } from "./LudoWikiView";
import { getLegendaryDossier } from "./ludodexPresentation";

afterEach(cleanup);

function createAndreaContact(now: number): Contact {
  return {
    id: "ludodex-andrea",
    firstName: "Andrea",
    lastName: "Simonazzi",
    email: "andrea.simonazzi@example.test",
    source: "tournament",
    acquiredAt: now,
    status: "enrolled",
    rarity: "legendary",
    specialProfileId: "andrea-simonazzi",
    forms: ["form-1", "course-x", "form-2"],
    arenaBase: 80,
    styleBase: 70,
    tournamentExperience: 2,
    enrolledMonth: 9,
  };
}

describe("LudoWikiView", () => {
  it("starts with a fully locked Ludodex and never exposes locked names through search", () => {
    const state = createInitialState(1_000, "Verifica UI");
    render(<LudoWikiView state={state} />);

    expect(screen.getByRole("heading", { name: "LudoWiki" })).toBeVisible();
    expect(screen.getByText(`0 / ${LUDODEX_LEGENDARIES.length}`)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Leggendario sconosciuto" })).toBeVisible();
    expect(screen.getAllByText("#001")).toHaveLength(2);
    expect(screen.queryByText("Voce 001")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Cerca nel Ludodex" }), {
      target: { value: "Andrea Simonazzi" },
    });

    expect(screen.getByText("Nessun dossier trovato")).toBeVisible();
    expect(screen.queryByText("Andrea Simonazzi")).not.toBeInTheDocument();
  });

  it("opens a discovered dossier with base stats and a biography placeholder", () => {
    const now = 2_000;
    const initial = createInitialState(now, "Verifica UI");
    const state = {
      ...initial,
      contacts: [...initial.contacts, createAndreaContact(now)],
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrolledProfileIds: ["andrea-simonazzi" as const],
      },
    };
    render(<LudoWikiView state={state} />);

    expect(screen.getByText(`1 / ${LUDODEX_LEGENDARIES.length}`)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Andrea Simonazzi" })).toBeVisible();
    expect(screen.getByText("Attualmente nella scuola")).toBeVisible();
    expect(screen.getByLabelText("Valori di base")).toHaveTextContent("Arena base80.000");
    expect(screen.getByLabelText("Valori di base")).toHaveTextContent("Stile base70.000");
    expect(screen.queryByText("Forme numeriche")).not.toBeInTheDocument();
    expect(screen.queryByText("Esperienza tornei")).not.toBeInTheDocument();
    expect(screen.queryByText("Forme e corsi conservati")).not.toBeInTheDocument();
    expect(screen.queryByText("Scoperta permanente")).not.toBeInTheDocument();
    expect(screen.getByText("LudoSport Genova - Ordine delle Onde")).toBeVisible();
    expect(screen.getByText("9° contatto della scuola iniziale")).toBeVisible();
    expect(screen.getByText("Invia l'email, completa la prova in palestra e ottieni l'iscrizione.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Biografia" })).toBeVisible();
    expect(screen.getByText("La biografia di questo atleta sarà aggiunta in un secondo momento.")).toBeVisible();
  });

  it("reconstructs a permanent dossier after the contact is no longer in the current school", () => {
    const initial = createInitialState(3_000, "Verifica UI");
    const state = {
      ...initial,
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrolledProfileIds: ["andrea-simonazzi" as const],
        retainedProgress: {
          "andrea-simonazzi": {
            forms: ["form-1" as const],
            instructorForms: [],
            joinedAt: 1_000,
            arenaBase: 90,
            styleBase: 80,
            tournamentExperience: 1,
          },
        },
      },
    };
    const andrea = LUDODEX_LEGENDARIES.find((entry) => entry.id === "andrea-simonazzi")!;

    const dossier = getLegendaryDossier(state, andrea);
    expect(dossier).toMatchObject({
      currentStatus: "remembered",
      arenaBase: 90,
      styleBase: 80,
    });

    render(<LudoWikiView state={state} />);
    expect(screen.getByText("Conservato dalla Rete delle scuole")).toBeVisible();
    expect(screen.getByText("90.000")).toBeVisible();
    expect(screen.getByText("80.000")).toBeVisible();
    expect(screen.queryByText("Scoperta permanente")).not.toBeInTheDocument();
  });

  it("provides searchable technical chapters, diagrams, numbers and related navigation", () => {
    render(<LudoWikiView state={createInitialState(4_000, "Verifica UI")} />);

    fireEvent.click(screen.getByRole("tab", { name: "Manuale di gioco" }));

    expect(screen.getByRole("heading", { name: "Prove e iscrizioni" })).toBeVisible();
    expect(screen.getByText("15 s")).toBeVisible();
    expect(screen.getByText("€ 40 + (2 × € 5) = € 50 al mese")).toBeVisible();
    expect(screen.getByRole("figure", { name: "Schema del flusso: Prove e iscrizioni" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Rarità e Leggendari" }));
    expect(screen.getByRole("heading", { name: "Rarità e Leggendari" })).toBeVisible();
    expect(screen.getByText("2% in coda")).toBeVisible();

    fireEvent.change(screen.getByRole("textbox", { name: "Cerca nel manuale" }), {
      target: { value: "Gadget" },
    });
    expect(screen.getByRole("button", { name: /Gadget/ })).toBeVisible();
  });

  it("keeps non-recruitable external opponents outside the completion total", () => {
    expect(LUDODEX_LEGENDARIES.some((entry) => entry.id === "daniele-maggi")).toBe(false);
    expect(LUDODEX_LEGENDARIES).toHaveLength(22);
  });

  it("defines school, encounter location and acquisition method for every Legendary", () => {
    for (const legendary of LUDODEX_LEGENDARIES) {
      expect(legendary.initialSchool).not.toHaveLength(0);
      expect(legendary.foundAt).not.toHaveLength(0);
      expect(legendary.acquisition).not.toHaveLength(0);
    }

    expect(LUDODEX_LEGENDARIES.find((entry) => entry.id === "marco-palena")).toMatchObject({
      initialSchool: "Ordine degli Elementi · LudoSport Alpha",
      foundAt: "Torneo Accademico Alpha",
    });
    expect(LUDODEX_LEGENDARIES.find((entry) => entry.id === "simone-pedrazzi")).toMatchObject({
      initialSchool: "LudoSport Aemilia",
      foundAt: "Torneo Nazionale",
    });
    expect(LUDODEX_LEGENDARIES.find((entry) => entry.id === "francesco-d-addosio")).toMatchObject({
      initialSchool: "Chronicles of Ludosport",
      foundAt: "Chronicles of Ludosport",
    });
  });
});
