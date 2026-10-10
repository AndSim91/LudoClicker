import { beforeEach, describe, expect, it } from "vitest";
import { migrateLegacyStorageKeys, STORAGE_KEYS } from "./storageKeys";

describe("migrateLegacyStorageKeys", () => {
  beforeEach(() => localStorage.clear());

  it("sposta salvataggio, backup e preferenze sotto ludoclicker.", () => {
    localStorage.setItem("oggetto-nuovi-iscritti.save", "partita");
    localStorage.setItem("oggetto-nuovi-iscritti.save.backup", "backup");
    localStorage.setItem("oggetto-nuovi-iscritti.theme", "light");
    localStorage.setItem("altro-gioco.save", "estraneo");
    migrateLegacyStorageKeys(localStorage);
    expect(localStorage.getItem(STORAGE_KEYS.gameSave)).toBe("partita");
    expect(localStorage.getItem(`${STORAGE_KEYS.gameSave}.backup`)).toBe("backup");
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe("light");
    expect(localStorage.getItem("oggetto-nuovi-iscritti.save")).toBeNull();
    expect(localStorage.getItem("altro-gioco.save")).toBe("estraneo");
  });

  it("non sovrascrive una chiave nuova già presente", () => {
    localStorage.setItem(STORAGE_KEYS.gameSave, "nuova");
    localStorage.setItem("oggetto-nuovi-iscritti.save", "vecchia");
    migrateLegacyStorageKeys(localStorage);
    expect(localStorage.getItem(STORAGE_KEYS.gameSave)).toBe("nuova");
    expect(localStorage.getItem("oggetto-nuovi-iscritti.save")).toBeNull();
  });
});
