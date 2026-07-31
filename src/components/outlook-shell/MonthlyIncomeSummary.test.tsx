import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { MonthlyIncomeSummary } from "./MonthlyIncomeSummary";

afterEach(cleanup);

describe("MonthlyIncomeSummary", () => {
  it("shows member and Social income with an accessible breakdown", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.map((contact, index) => ({
      ...contact,
      status: index < 2 ? ("enrolled" as const) : contact.status,
      forms: index === 0 ? (["form-1"] as FormId[]) : contact.forms,
    }));
    const memberFees = 85;
    const socialIncome = 10;

    render(
      <MonthlyIncomeSummary
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
      />,
    );

    const income = screen.getByLabelText(/^Entrate mensili:/);
    expect(income).toBeVisible();
    expect(income).toHaveAttribute(
      "aria-label",
      `Entrate mensili: ${formatCurrency(memberFees + socialIncome)}`,
    );
    expect(income).not.toHaveAttribute("role", "button");
    expect(income).toHaveTextContent("Entrate mensili");

    const tooltip = screen.getByRole("tooltip");
    expect(income).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Quote iscritti");
    expect(tooltip).toHaveTextContent(/85,00\s*€/);
    expect(tooltip).toHaveTextContent("Bonus Social");
    expect(tooltip).toHaveTextContent(/10,00\s*€/);
    expect(tooltip).not.toHaveTextContent("Vendite Gadget (stima)");
  });

  it("includes estimated Gadget sales from a version-78 hot state", () => {
    const initial = createInitialState(1_000);
    const product = initial.gadgets.products.wristband;
    const gadgetCollaborator: Collaborator = {
      id: "gadget-collaborator",
      contactId: "gadget-contact",
      displayName: "Collaboratore Gadget",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "gadget",
      rarity: "ultra-rare",
    };
    const hotState: GameState = {
      ...initial,
      version: 78,
      school: { ...initial.school, activeMembers: 10 },
      collaborators: [gadgetCollaborator],
      unlocks: { ...initial.unlocks, gadget: true },
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...product,
            unlocked: true,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            rarities: {
              ...product.rarities,
              common: {
                ...product.rarities.common,
                unlocked: true,
                quality: 100,
              },
            },
          },
        },
      },
    };
    delete (hotState.gadgets as Partial<GameState["gadgets"]>).monthlyRevenue;

    render(
      <MonthlyIncomeSummary
        state={hotState}
      />,
    );

    expect(screen.getByLabelText(/Entrate mensili: 415,00/)).toBeVisible();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Vendite Gadget (stima)");
    expect(hotState.gadgets.monthlyRevenue).toBeUndefined();
    expect(tooltip).toHaveTextContent(/15,00\s*€/);
  });
});
