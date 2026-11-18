import redis from "@/db/redis";
import { randomUUID } from "node:crypto";

const CACHE_NAMESPACE = "acme:v2";
const CACHE_TTL_SECONDS = 60;
const LOCK_TTL_MS = 5_000;
const LOCK_WAIT_MS = [25, 50, 100, 200, 400];

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const reportCacheError = (operation: string, error: unknown) => {
  console.warn(`Cache ${operation} failed; continuing without cache.`, error);
};

export const cacheKeys = {
  trips: {
    all: () => `${CACHE_NAMESPACE}:trips:all`,
    byId: (id: number) => `${CACHE_NAMESPACE}:trips:${id}`,
  },
  reviews: {
    all: () => `${CACHE_NAMESPACE}:reviews:all`,
    byTripId: (tripId: number) => `${CACHE_NAMESPACE}:reviews:trip:${tripId}`,
  },
};

async function read<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      reportCacheError(`parse for ${key}`, error);
      await remove(key);
      return null;
    }
  } catch (error) {
    reportCacheError(`read for ${key}`, error);
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
  } catch (error) {
    reportCacheError(`write for ${key}`, error);
  }
}

export async function remove(...keys: string[]): Promise<void> {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  try {
    await redis.del(...validKeys);
  } catch (error) {
    reportCacheError("invalidation", error);
  }
}

export async function invalidateApplicationCache(): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${CACHE_NAMESPACE}:*`,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (error) {
    reportCacheError("application cache clear", error);
  }
}

/**
 * Reads through Redis with a short distributed lock. Cache errors and lock
 * contention fall back to the loader so reads remain available.
 */
export async function getOrSet<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = await read<T>(key);
  if (cached !== null) return cached;

  const lockKey = `${key}:lock`;
  const lockValue = randomUUID();
  let lockAcquired = false;
  try {
    lockAcquired = (await redis.set(lockKey, lockValue, "PX", LOCK_TTL_MS, "NX")) === "OK";
  } catch (error) {
    reportCacheError(`lock for ${key}`, error);
  }

  if (!lockAcquired) {
    for (const wait of LOCK_WAIT_MS) {
      await sleep(wait);
      const populated = await read<T>(key);
      if (populated !== null) return populated;
    }
    return loader();
  }

  try {
    const loaded = await loader();
    await write(key, loaded);
    return loaded;
  } finally {
    try {
      await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
        1,
        lockKey,
        lockValue,
      );
    } catch (error) {
      reportCacheError(`lock release for ${key}`, error);
    }
  }
}
