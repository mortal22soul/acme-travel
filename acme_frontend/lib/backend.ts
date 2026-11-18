export function backendRequest(path: string, init: RequestInit = {}) {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return fetch(new URL(path, base), {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(8_000),
  });
}
