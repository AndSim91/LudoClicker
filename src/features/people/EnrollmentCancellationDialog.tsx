import { useEffect, useRef } from "react";
import { Icon } from "../../components/common/Icon";
import type { Contact } from "../../game/types";

export function EnrollmentCancellationDialog({
  contact,
  onClose,
  onConfirm,
}: {
  contact: Contact;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const displayName = `${contact.firstName} ${contact.lastName}`;

  useEffect(() => {
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      if (event.shiftKey && document.activeElement === cancelButtonRef.current) {
        event.preventDefault();
        confirmButtonRef.current?.focus();
      } else if (!event.shiftKey && document.activeElement === confirmButtonRef.current) {
        event.preventDefault();
        cancelButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="member-cancellation-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="member-cancellation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="member-cancellation-title"
        aria-describedby="member-cancellation-description"
      >
        <header>
          <span className="member-cancellation-icon" aria-hidden="true">
            <Icon name="close" />
          </span>
          <div>
            <span>Conferma richiesta</span>
            <h2 id="member-cancellation-title">Annullare l&apos;iscrizione?</h2>
          </div>
        </header>

        <div className="member-cancellation-content">
          <p id="member-cancellation-description">
            Vuoi annullare definitivamente l&apos;iscrizione di <strong>{displayName}</strong>?
          </p>
          <p className="member-cancellation-warning">
            L&apos;azione non può essere annullata
          </p>
        </div>

        <footer>
          <button
            ref={cancelButtonRef}
            type="button"
            className="secondary"
            onClick={onClose}
          >
            Mantieni iscrizione
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="danger"
            onClick={onConfirm}
          >
            Annulla iscrizione
          </button>
        </footer>
      </section>
    </div>
  );
}
