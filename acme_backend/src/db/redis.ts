import { Redis } from "ioredis";
import env from "@/env";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 1500,
  commandTimeout: 1500,
  lazyConnect: true,
  retryStrategy: (attempt) => Math.min(attempt * 100, 2000),
});

redis.on("error", () => console.warn("Redis connection unavailable"));
process.once("SIGINT", () => redis.disconnect());
process.once("SIGTERM", () => redis.disconnect());

export default redis;
