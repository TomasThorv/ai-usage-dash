import { z } from "zod";

const base64MasterKey = z
  .string()
  .min(1)
  .refine(
    (v) => {
      try {
        const decoded = Buffer.from(v, "base64");
        return decoded.length === 32;
      } catch {
        return false;
      }
    },
    { message: "MASTER_KEY must be base64-encoded 32 bytes" },
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MASTER_KEY: z.union([z.literal(""), base64MasterKey]).optional(),
  DATABASE_PATH: z.string().min(1).default("./data/app.db"),
});

export type Env = {
  NODE_ENV: "development" | "production" | "test";
  MASTER_KEY: string | undefined;
  DATABASE_PATH: string;
};

function parse(): Env {
  // TEST_DATABASE_PATH overrides DATABASE_PATH so Playwright workers can isolate state.
  const dbPath = process.env.TEST_DATABASE_PATH ?? process.env.DATABASE_PATH;
  const parsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    MASTER_KEY: process.env.MASTER_KEY,
    DATABASE_PATH: dbPath,
  });
  return {
    NODE_ENV: parsed.NODE_ENV,
    MASTER_KEY: parsed.MASTER_KEY && parsed.MASTER_KEY !== "" ? parsed.MASTER_KEY : undefined,
    DATABASE_PATH: parsed.DATABASE_PATH,
  };
}

export const env: Env = parse();

export function reloadEnv(): Env {
  const next = parse();
  Object.assign(env, next);
  return env;
}
