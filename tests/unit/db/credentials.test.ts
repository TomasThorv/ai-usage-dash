import { closeDb, setDbForTests } from "@/lib/db/client";
import * as creds from "@/lib/db/credentials";
import { migrate } from "@/lib/db/migrate";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("credentials db", () => {
  beforeEach(() => {
    closeDb();
    const db = new Database(":memory:");
    db.pragma("journal_mode = MEMORY");
    setDbForTests(db);
    migrate(db);
  });

  afterEach(() => {
    closeDb();
  });

  it("upsert/get/count/delete cycle", () => {
    expect(creds.count()).toBe(0);
    const blob = new Uint8Array([1, 2, 3, 4, 5]);
    creds.upsert("claude", blob);
    expect(creds.count()).toBe(1);
    const row = creds.get("claude");
    expect(row).toBeDefined();
    expect(row?.providerId).toBe("claude");
    expect(Array.from(row?.encryptedBlob ?? [])).toEqual([1, 2, 3, 4, 5]);

    creds.upsert("claude", new Uint8Array([9, 9]));
    const row2 = creds.get("claude");
    expect(Array.from(row2?.encryptedBlob ?? [])).toEqual([9, 9]);

    creds.markVerified("claude");
    creds.setError("claude", "nope");
    const row3 = creds.get("claude");
    expect(row3?.lastError).toBe("nope");

    creds.remove("claude");
    expect(creds.count()).toBe(0);
    expect(creds.get("claude")).toBeUndefined();
  });

  it("deleteAll wipes every row and reports the count", () => {
    creds.upsert("claude", new Uint8Array([1]));
    creds.upsert("openai", new Uint8Array([2]));
    creds.upsert("cursor", new Uint8Array([3]));
    expect(creds.count()).toBe(3);

    const removed = creds.deleteAll();
    expect(removed).toBe(3);
    expect(creds.count()).toBe(0);

    // calling again is a no-op
    expect(creds.deleteAll()).toBe(0);
  });
});
