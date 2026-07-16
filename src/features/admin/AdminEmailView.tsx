import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import {
  EMAIL_CATALOG_STAGES,
  EMAIL_PRESENTATION_LEVELS,
} from "../../content/emailPresentation";
import {
  EMAIL_COPY_TOKENS,
  EMAIL_COPY_OVERRIDES_FILE,
  getEmailCopyOverrideKey,
  loadEmailCopyOverrides,
  renderEmailCopyTokens,
  saveEmailCopyOverrides,
  type EmailCopyOverride,
} from "../../content/emailOverrides";
import {
  EMAIL_TEMPLATES,
  getDefaultEmailTemplateCopy,
} from "../../content/emailTemplates";
import type {
  EmailPresentationLevel,
  UpgradeLevels,
} from "../../game/types";

const PRESENTATION_LEVELS = Object.keys(EMAIL_PRESENTATION_LEVELS).map(
  Number,
) as EmailPresentationLevel[];

const previewRecipient = "Giulia";
const previewSender = "Andrea Ungaro";
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

interface AdminEmailViewProps {
  upgrades: UpgradeLevels;
  activeMembers: number;
  euros: number;
  onAddMembers: (amount: number) => void;
  onAddEuros: (amount: number) => void;
}

export function AdminEmailView({
  upgrades,
  activeMembers,
  euros,
  onAddMembers,
  onAddEuros,
}: AdminEmailViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<EmailPresentationLevel>(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => EMAIL_TEMPLATES[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState(loadEmailCopyOverrides);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [memberAmount, setMemberAmount] = useState("1");
  const [euroAmount, setEuroAmount] = useState("1000");

  const parsedMemberAmount = Math.floor(Number(memberAmount));
  const parsedEuroAmount = Number(euroAmount);
  const canAddMembers = Number.isSafeInteger(parsedMemberAmount) && parsedMemberAmount > 0;
  const canAddEuros = Number.isFinite(parsedEuroAmount) && parsedEuroAmount > 0;

  const selectedTemplate =
    EMAIL_TEMPLATES.find((template) => template.id === selectedTemplateId) ??
    EMAIL_TEMPLATES[0];
  if (!selectedTemplate) return null;

  const overrideKey = getEmailCopyOverrideKey(selectedTemplate.id, selectedLevel);
  const defaults = getDefaultEmailTemplateCopy(
    selectedTemplate,
    EMAIL_COPY_TOKENS.firstName,
    EMAIL_COPY_TOKENS.senderName,
    selectedLevel,
  );
  const selectedOverride = overrides[overrideKey];
  const editorCopy = selectedOverride ?? defaults;
  const filteredTemplates = EMAIL_TEMPLATES.filter((template) => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
    if (!normalizedQuery) return true;
    return `${template.id} ${template.subject}`
      .toLocaleLowerCase("it-IT")
      .includes(normalizedQuery);
  });

  const stage = selectedLevel === 0
    ? undefined
    : EMAIL_CATALOG_STAGES[selectedLevel - 1];
  const purchasedLevels = stage ? Math.min(5, upgrades[stage.upgradeId] ?? 0) : 0;
  const newCatalogPercentage = purchasedLevels * 20;

  const updateCopy = (field: keyof EmailCopyOverride, value: string) => {
    setOverrides((current) => ({
      ...current,
      [overrideKey]: {
        subject: current[overrideKey]?.subject ?? defaults.subject,
        body: current[overrideKey]?.body ?? defaults.body,
        [field]: value,
      },
    }));
    setStatus("Modifiche non salvate");
  };

  const restoreDefault = () => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[overrideKey];
      return next;
    });
    setStatus("Ripristino non ancora salvato");
  };

  const save = async () => {
    setSaving(true);
    setStatus(`Salvataggio di ${EMAIL_COPY_OVERRIDES_FILE}...`);
    const success = await saveEmailCopyOverrides(overrides);
    setSaving(false);
    setStatus(
      success
        ? `File modificato: ${EMAIL_COPY_OVERRIDES_FILE}`
        : `Impossibile modificare ${EMAIL_COPY_OVERRIDES_FILE}. Verifica che l'app sia avviata con il server Vite dev.`,
    );
  };

  const selectLevel = (level: EmailPresentationLevel) => {
    setSelectedLevel(level);
    setStatus("");
  };

  return (
    <main className="overview-view admin-email-view">
      <header>
        <Icon name="admin" />
        <div>
          <h1>Admin · Cataloghi email</h1>
          <p>Salvataggio diretto nel file {EMAIL_COPY_OVERRIDES_FILE}</p>
        </div>
        <span className="dev-only-badge">DEV ONLY</span>
      </header>

      <section className="admin-email-help" aria-label="Funzionamento dei cataloghi">
        <strong>Ogni macro-potenziamento ha 5 acquisti.</strong>
        <span>
          Ogni acquisto sposta il 20% delle nuove email dal catalogo precedente a
          quello nuovo: 20%, 40%, 60%, 80%, 100%.
        </span>
      </section>

      <section className="admin-resource-tools" aria-labelledby="admin-resource-title">
        <div className="admin-resource-heading">
          <span>Risorse partita</span>
          <h2 id="admin-resource-title">Aggiunte manuali</h2>
          <p>Le quantità vengono sommate ai valori attuali.</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddMembers) onAddMembers(parsedMemberAmount);
          }}
        >
          <label htmlFor="admin-member-amount">
            Iscritti da aggiungere
            <input
              id="admin-member-amount"
              type="number"
              min="1"
              step="1"
              value={memberAmount}
              onChange={(event) => setMemberAmount(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!canAddMembers}>Aggiungi iscritti</button>
          <small>Attuali: {activeMembers}</small>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddEuros) onAddEuros(parsedEuroAmount);
          }}
        >
          <label htmlFor="admin-euro-amount">
            Euro da aggiungere
            <input
              id="admin-euro-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={euroAmount}
              onChange={(event) => setEuroAmount(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!canAddEuros}>Aggiungi Euro</button>
          <small>Attuali: {euro.format(euros)}</small>
        </form>
      </section>

      <div className="admin-email-workspace">
        <nav className="admin-level-list" aria-label="Livelli catalogo email">
          <strong>Livelli di potenziamento</strong>
          {PRESENTATION_LEVELS.map((level) => {
            const definition = EMAIL_PRESENTATION_LEVELS[level];
            const catalogStage = level === 0 ? undefined : EMAIL_CATALOG_STAGES[level - 1];
            const gameLevel = catalogStage
              ? Math.min(5, upgrades[catalogStage.upgradeId] ?? 0)
              : 0;
            return (
              <button
                key={level}
                type="button"
                className={selectedLevel === level ? "active" : ""}
                onClick={() => selectLevel(level)}
                aria-current={selectedLevel === level ? "page" : undefined}
              >
                <span>Catalogo {level}</span>
                <b>{definition.label}</b>
                <small>
                  {level === 0 ? "Base iniziale" : `Partita: ${gameLevel}/5 · ${gameLevel * 20}%`}
                </small>
              </button>
            );
          })}
        </nav>

        <aside className="admin-template-list">
          <label htmlFor="admin-email-search">100 email nel catalogo</label>
          <input
            id="admin-email-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca oggetto o ID"
          />
          <div>
            {filteredTemplates.map((template, index) => {
              const key = getEmailCopyOverrideKey(template.id, selectedLevel);
              const copy = overrides[key];
              return (
                <button
                  key={template.id}
                  type="button"
                  className={selectedTemplate.id === template.id ? "active" : ""}
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    setStatus("");
                  }}
                >
                  <span>{String(index + 1).padStart(3, "0")}</span>
                  <b>{copy?.subject || template.subject}</b>
                  {copy ? <i title="Testo personalizzato">●</i> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <form
          className="admin-email-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="admin-editor-heading">
            <div>
              <span>Catalogo {selectedLevel} · {selectedTemplate.id}</span>
              <h2>{EMAIL_PRESENTATION_LEVELS[selectedLevel].label}</h2>
            </div>
            {selectedOverride ? <b>Personalizzata</b> : <b className="is-default">Default</b>}
          </div>

          {stage ? (
            <p className="admin-mix-summary">
              Nella partita attuale <strong>{EMAIL_PRESENTATION_LEVELS[selectedLevel].label}</strong>
              {" è al livello "}<strong>{purchasedLevels}/5</strong>: {newCatalogPercentage}%
              catalogo nuovo e {100 - newCatalogPercentage}% catalogo {selectedLevel - 1}.
            </p>
          ) : (
            <p className="admin-mix-summary">
              Questo è il catalogo iniziale usato prima di acquistare Controllo ortografico.
            </p>
          )}

          <label htmlFor="admin-email-subject">
            <span>Oggetto</span>
            <input
              id="admin-email-subject"
              value={editorCopy.subject}
              onChange={(event) => updateCopy("subject", event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label htmlFor="admin-email-body" className="admin-email-body-field">
            <span>Corpo email</span>
            <textarea
              id="admin-email-body"
              value={editorCopy.body}
              onChange={(event) => updateCopy("body", event.target.value)}
              maxLength={5_000}
              required
            />
          </label>

          <div className="admin-token-note">
            Token disponibili: <code>{EMAIL_COPY_TOKENS.firstName}</code> destinatario ·{" "}
            <code>{EMAIL_COPY_TOKENS.senderName}</code> mittente
          </div>

          <details className="admin-email-preview">
            <summary>Anteprima con {previewRecipient}</summary>
            <strong>{renderEmailCopyTokens(editorCopy.subject, previewRecipient, previewSender)}</strong>
            <p>{renderEmailCopyTokens(editorCopy.body, previewRecipient, previewSender)}</p>
          </details>

          <div className="admin-editor-actions">
            <button
              type="submit"
              disabled={saving || !editorCopy.subject.trim() || !editorCopy.body.trim()}
            >
              {saving ? "Salvataggio file..." : "Salva cataloghi nel file"}
            </button>
            <button type="button" className="secondary" onClick={restoreDefault}>
              Ripristina questa email
            </button>
            {status ? <span role="status">{status}</span> : null}
          </div>
        </form>
      </div>
    </main>
  );
}
