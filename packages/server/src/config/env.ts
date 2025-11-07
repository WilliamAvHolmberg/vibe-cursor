import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CURSOR_API_KEY: z.string().optional(),
  CURSOR_WEBHOOK_SECRET: z.string().min(32),
  CURSOR_ORCHESTRATOR_AGENT_ID: z.string().min(1),
  CURSOR_AUTH_CLIENT_ID: z.string().optional(),
  CURSOR_AUTH_CLIENT_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().url(),
  APP_WS_URL: z.string().url(),
  ORCHESTRATOR_CRYPTO_KEY: z.string().min(64, "ORCHESTRATOR_CRYPTO_KEY must be a 32-byte hex string"),
});

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env: Env = parsedEnv.data;
