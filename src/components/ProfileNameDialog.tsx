import { useState, type FormEvent } from "react";
import { GAME_CONFIG } from "../game/config";

export function ProfileNameDialog({ onSubmit }: { onSubmit: (displayName: string) => void }) {
  const [displayName, setDisplayName] = useState("");
  const normalizedName = displayName.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedName) onSubmit(normalizedName);
  };

  return (
    <main className="profile-gate">
      <section
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        aria-describedby="profile-dialog-description"
      >
        <span className="profile-eyebrow">LudoSport Genova</span>
        <h1 id="profile-dialog-title">Come ti chiami?</h1>
        <p id="profile-dialog-description">
          Il tuo nome verrà salvato nel profilo delle email inviate dall&apos;Ordine delle Onde.
          Potrai modificarlo in qualsiasi momento dalle Impostazioni.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="profile-display-name">Nome e cognome</label>
          <input
            id="profile-display-name"
            name="displayName"
            type="text"
            autoComplete="name"
            autoFocus
            maxLength={GAME_CONFIG.profileNameMaxLength}
            placeholder="Es. Andrea Ungaro"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <button type="submit" disabled={!normalizedName}>Inizia</button>
        </form>
      </section>
    </main>
  );
}
