import { createHash } from "node:crypto";
import redis from "@/db/redis";
import { ApiError } from "@/routes/contracts";

export async function rateLimit(scope: string, identifier: string, max: number, windowSeconds: number) {
  const key = `acme:limit:${scope}:${createHash("sha256").update(identifier).digest("hex")}`;
  let attempts: number;
  try {
    attempts = Number(await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
      1, key, windowSeconds,
    ));
  } catch {
    throw new ApiError(503, "Authentication service temporarily unavailable");
  }
  if (attempts > max) throw new ApiError(429, "Too many requests. Try again in 15 minutes.");
}
