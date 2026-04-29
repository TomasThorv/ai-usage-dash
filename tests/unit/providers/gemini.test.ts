import { generateKeyPairSync } from "node:crypto";
import gemini from "@/lib/providers/gemini";
import { geminiHandlers } from "@/tests/msw/handlers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const server = setupServer(...geminiHandlers);

function makeServiceAccount(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return JSON.stringify({
    client_email: "test-sa@example.iam.gserviceaccount.com",
    private_key: privateKey,
    token_uri: "https://oauth2.googleapis.com/token",
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers(...geminiHandlers));
afterAll(() => server.close());

describe("gemini adapter", () => {
  it("verify succeeds on 200", async () => {
    await expect(
      gemini.verify(
        { serviceAccountJson: makeServiceAccount(), projectId: "test-project" },
        new AbortController().signal,
      ),
    ).resolves.toBeUndefined();
  });

  it("verify throws on 401", async () => {
    server.use(
      http.get(
        "https://cloudquotas.googleapis.com/v1/projects/:project/locations/global/services/generativelanguage.googleapis.com/quotaInfos",
        () => new HttpResponse("nope", { status: 401 }),
      ),
    );
    await expect(
      gemini.verify(
        { serviceAccountJson: makeServiceAccount(), projectId: "test-project" },
        new AbortController().signal,
      ),
    ).rejects.toThrow(/401/);
  });

  it("fetchUsage builds a daily ceiling quota with zero used", async () => {
    const snap = await gemini.fetchUsage(
      { serviceAccountJson: makeServiceAccount(), projectId: "test-project" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("gemini");
    expect(snap.session.inputTokens).toBe(0);
    expect(snap.session.outputTokens).toBe(0);
    expect(snap.quota?.period).toBe("day");
    expect(snap.quota?.unit).toBe("requests");
    expect(snap.quota?.limit).toBe(1500);
    expect(snap.quota?.used).toBe(0);
    expect(snap.errors?.length).toBeGreaterThan(0);
  });
});
