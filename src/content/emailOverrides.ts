import type { EmailPresentationLevel } from "../game/types";

export interface EmailCopyOverride {
  subject: string;
  body: string;
}

export type EmailCopyOverrides = Record<string, EmailCopyOverride>;

export const EMAIL_COPY_OVERRIDES_STORAGE_KEY =
  "oggetto-nuovi-iscritti.dev-email-copy.v1";

export const EMAIL_COPY_TOKENS = {
  firstName: "{{firstName}}",
  senderName: "{{senderName}}",
} as const;

export function getEmailCopyOverrideKey(
  templateId: string,
  level: EmailPresentationLevel,
): string {
  return `${level}:${templateId}`;
}

function isEmailCopyOverride(value: unknown): value is EmailCopyOverride {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EmailCopyOverride>;
  return typeof candidate.subject === "string" && typeof candidate.body === "string";
}

export function loadEmailCopyOverrides(): EmailCopyOverrides {
  if (!import.meta.env.DEV || typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(EMAIL_COPY_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, EmailCopyOverride] =>
        isEmailCopyOverride(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function saveEmailCopyOverrides(overrides: EmailCopyOverrides): boolean {
  if (!import.meta.env.DEV || typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(EMAIL_COPY_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch {
    return false;
  }
}

export function getEmailCopyOverride(
  templateId: string,
  level: EmailPresentationLevel,
): EmailCopyOverride | undefined {
  return loadEmailCopyOverrides()[getEmailCopyOverrideKey(templateId, level)];
}

export function renderEmailCopyTokens(
  value: string,
  firstName: string,
  senderName: string,
): string {
  return value
    .replaceAll(EMAIL_COPY_TOKENS.firstName, firstName)
    .replaceAll(EMAIL_COPY_TOKENS.senderName, senderName);
}
