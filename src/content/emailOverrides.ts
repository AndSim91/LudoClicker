import type { EmailPresentationLevel } from "../game/types";
import fileOverrides from "./emailCatalogOverrides.json";

export interface EmailCopyOverride {
  subject: string;
  body: string;
}

export type EmailCopyOverrides = Record<string, EmailCopyOverride>;

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

export function isEmailCopyOverride(value: unknown): value is EmailCopyOverride {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EmailCopyOverride>;
  return typeof candidate.subject === "string" && typeof candidate.body === "string";
}

function normalizeEmailCopyOverrides(value: unknown): EmailCopyOverrides {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, EmailCopyOverride] =>
      isEmailCopyOverride(entry[1]),
    ),
  );
}

const runtimeOverrides = normalizeEmailCopyOverrides(fileOverrides);

export function getEmailCopyOverride(
  templateId: string,
  level: EmailPresentationLevel,
): EmailCopyOverride | undefined {
  return runtimeOverrides[getEmailCopyOverrideKey(templateId, level)];
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
