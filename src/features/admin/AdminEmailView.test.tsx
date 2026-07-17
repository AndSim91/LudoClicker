import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminEmailView } from "./AdminEmailView";

afterEach(cleanup);

describe("AdminEmailView", () => {
  const renderAdmin = (
    onAddContacts = vi.fn(),
    onAddMembers = vi.fn(),
    onAddEuros = vi.fn(),
  ) => {
    render(
      <AdminEmailView
        totalContacts={8}
        availableContacts={4}
        activeMembers={4}
        euros={250}
        onAddContacts={onAddContacts}
        onAddMembers={onAddMembers}
        onAddEuros={onAddEuros}
      />,
    );
  };

  it("shows only the game resource tools", () => {
    renderAdmin();

    expect(screen.getByRole("heading", { name: "Admin" })).toBeVisible();
    expect(screen.getByText(/Totali: 8/)).toHaveTextContent("disponibili: 4");
    expect(screen.queryByRole("textbox", { name: "Oggetto" })).not.toBeInTheDocument();
    expect(screen.queryByText(/cataloghi email/i)).not.toBeInTheDocument();
  });

  it("submits the manually entered changes", () => {
    const onAddContacts = vi.fn();
    const onAddMembers = vi.fn();
    const onAddEuros = vi.fn();
    renderAdmin(onAddContacts, onAddMembers, onAddEuros);

    expect(screen.getByLabelText("Contatti email")).toHaveValue(1);
    expect(screen.getByLabelText("Iscritti")).toHaveValue(1);
    expect(screen.getByLabelText("Euro")).toHaveValue(1000);

    fireEvent.change(screen.getByLabelText("Contatti email"), {
      target: { value: "-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica contatti" }));
    fireEvent.change(screen.getByLabelText("Iscritti"), {
      target: { value: "-7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica iscritti" }));
    fireEvent.change(screen.getByLabelText("Euro"), {
      target: { value: "1250.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica Euro" }));

    expect(onAddContacts).toHaveBeenCalledWith(-2);
    expect(onAddMembers).toHaveBeenCalledWith(-7);
    expect(onAddEuros).toHaveBeenCalledWith(1250.5);
  });
});
