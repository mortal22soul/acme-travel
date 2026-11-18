import type { z } from "zod";

export type { AuthUser } from "./contracts";

export const clearSession = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("acme:session-ended"));
};

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  if (response.status === 401 && path !== "/login" && path !== "/signup") clearSession();
  return response;
}

export async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.message === "string" ? body.message : fallback;
}

export async function parseResponse<T>(response: Response, schema: z.ZodType<T>, error: string) {
  if (!response.ok) throw new Error(await readError(response, error));
  return schema.parse(await response.json());
}
