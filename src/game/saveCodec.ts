import { compressToUTF16, decompressFromUTF16 } from "lz-string";

export const STORED_SAVE_PREFIX = "lz-string-v1:";

export function encodeSerializedSave(serialized: string): string {
  return STORED_SAVE_PREFIX + compressToUTF16(serialized);
}

export function encodeStoredSave(value: unknown): string {
  return encodeSerializedSave(JSON.stringify(value));
}

export function normalizeStoredSave(raw: string): string {
  return raw.startsWith(STORED_SAVE_PREFIX) ? raw : encodeSerializedSave(raw);
}

export function decodeStoredSave(raw: string): unknown {
  const serialized = raw.startsWith(STORED_SAVE_PREFIX)
    ? decompressFromUTF16(raw.slice(STORED_SAVE_PREFIX.length))
    : raw;

  if (typeof serialized !== "string") {
    throw new Error("Il salvataggio compresso non pu? essere decodificato.");
  }

  return JSON.parse(serialized);
}
