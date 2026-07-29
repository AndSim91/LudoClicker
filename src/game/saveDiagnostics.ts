export type SaveFailureReason =
  | "quota-exceeded"
  | "storage-access-denied"
  | "storage-unavailable"
  | "serialization-failed"
  | "stored-save-protected";

export type SaveOperation =
  | "serialize"
  | "read-current"
  | "read-backup"
  | "write-backup"
  | "write-primary"
  | "protect-existing";

export interface SaveFailure {
  reason: SaveFailureReason;
  operation: SaveOperation;
  errorName: string;
  errorMessage: string;
  serializedLength: number | null;
}

export type SaveGameResult = { ok: true } | { ok: false; error: SaveFailure };

const MAX_ERROR_MESSAGE_LENGTH = 300;

function readErrorProperty(error: unknown, property: "name" | "message"): string {
  if (typeof error !== "object" || error === null || !(property in error)) return "";
  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" ? value : "";
}

function classifySaveFailure(
  operation: SaveOperation,
  errorName: string,
  errorMessage: string,
): SaveFailureReason {
  if (operation === "serialize") return "serialization-failed";

  const normalizedName = errorName.toLowerCase();
  const normalizedMessage = errorMessage.toLowerCase();
  if (
    normalizedName === "quotaexceedederror" ||
    normalizedName === "ns_error_dom_quota_reached" ||
    normalizedMessage.includes("quota")
  ) {
    return "quota-exceeded";
  }
  if (
    normalizedName === "securityerror" ||
    normalizedMessage.includes("access is denied") ||
    normalizedMessage.includes("access denied") ||
    normalizedMessage.includes("not allowed")
  ) {
    return "storage-access-denied";
  }
  return "storage-unavailable";
}

export function createSaveFailure(
  operation: SaveOperation,
  error: unknown,
  serializedLength: number | null,
): SaveFailure {
  const errorName = readErrorProperty(error, "name") || typeof error;
  const rawMessage = readErrorProperty(error, "message") || String(error);
  const errorMessage = rawMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH);

  return {
    reason: classifySaveFailure(operation, errorName, errorMessage),
    operation,
    errorName,
    errorMessage,
    serializedLength,
  };
}
