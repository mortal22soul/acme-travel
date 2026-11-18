import { afterEach, describe, expect, it, vi } from "vitest";
import redis from "@/db/redis";
import { getOrSet } from "@/db/cache";

afterEach(() => vi.restoreAllMocks());

describe("cache resilience", () => {
  it("serves the database loader when Redis is unavailable", async () => {
    vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("Redis unavailable"));
    vi.spyOn(redis, "set").mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(getOrSet("test:unavailable", async () => ({ source: "database" }))).resolves.toEqual({
      source: "database",
    });
  });
});
