import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

const loaded = config({ path: ".env.local" });
if (loaded.parsed) expand(loaded);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  ALLOWED_ORIGIN: z.string().default("http://localhost:3001"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
}).refine(({ NODE_ENV, JWT_REFRESH_SECRET, JWT_SECRET }) =>
  NODE_ENV !== "production" || (!!JWT_REFRESH_SECRET && JWT_REFRESH_SECRET !== JWT_SECRET),
  { path: ["JWT_REFRESH_SECRET"], message: "Production requires a distinct refresh secret" });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error("Invalid environment variables: " + parsed.error.issues.map(issue => issue.path.join(".") + " " + issue.message).join(", "));
}

export const env = parsed.data;
export default env;
