// Vitest global setup: ensure deterministic env for tests.
const envObj = process.env as Record<string, string | undefined>;
if (!envObj.NODE_ENV) envObj.NODE_ENV = "test";
if (!envObj.MASTER_KEY) {
  // 32 zero bytes, base64
  envObj.MASTER_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
}
