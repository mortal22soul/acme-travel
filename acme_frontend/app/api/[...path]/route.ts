import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { backendRequest } from "@/lib/backend";
import { tokens } from "@/lib/contracts";

const production = process.env.NODE_ENV === "production";
const accessCookie = production ? "__Host-acme_access" : "acme_access";
const refreshCookie = production ? "__Host-acme_refresh" : "acme_refresh";
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: production, path: "/" };
const maxBodyBytes = 32 * 1024;

const endpoints: Record<string, RegExp> = {
  GET: /^(?:me(?:\/bookings)?|trips(?:\/[1-9]\d*)?|reviews(?:\/[1-9]\d*)?|itineraries\/[1-9]\d*)$/,
  POST: /^(?:login|signup|logout|me\/profile|trips|reviews|itineraries|checkout)$/,
  PUT: /^(?:me\/password|bookings\/[1-9]\d*)$/,
};

function reply(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function boundedBody(request: NextRequest) {
  if (!request.body) return "";
  let bytes = 0;
  const decoder = new TextDecoder();
  const reader = request.body.getReader();
  let payload = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return payload + decoder.decode();
    bytes += value.byteLength;
    if (bytes > maxBodyBytes) {
      await reader.cancel();
      return null;
    }
    payload += decoder.decode(value, { stream: true });
  }
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const method = request.method;
  if (!endpoints[method]?.test(endpoint) || path.some(segment => segment.includes("/"))) return reply("Resource not found", 404);
  const mutation = method !== "GET";
  const expectedOrigin = process.env.APP_ORIGIN ?? request.nextUrl.origin;
  if (mutation && request.headers.get("origin") !== expectedOrigin) return reply("Invalid request origin", 403);
  if (mutation && endpoint !== "logout" && !request.headers.get("content-type")?.split(";")[0].includes("application/json")) {
    return reply("Send JSON for this request", 415);
  }
  if (Number(request.headers.get("content-length")) > maxBodyBytes) return reply("Request exceeds 32 KB", 413);

  const query = new URLSearchParams();
  if (!mutation && /^(?:trips|reviews)(?:\/[1-9]\d*)?$/.test(endpoint)) {
    for (const name of ["limit", "offset"]) {
      const value = request.nextUrl.searchParams.get(name);
      if (value !== null) query.set(name, value);
    }
  }
  const upstream = `/${endpoint}${query.size ? `?${query}` : ""}`;
  const upstreamHeaders = new Headers({ "Content-Type": "application/json" });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) upstreamHeaders.set("Idempotency-Key", idempotencyKey);
  const trustedIpHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip = trustedIpHeader ? request.headers.get(trustedIpHeader) : null;
  if (ip && isIP(ip)) upstreamHeaders.set("X-Client-IP", ip);

  const access = request.cookies.get(accessCookie)?.value;
  const refresh = request.cookies.get(refreshCookie)?.value;
  const publicAuth = endpoint === "login" || endpoint === "signup";
  let newTokens: { accessToken: string; refreshToken: string } | undefined;
  let clear = false;
  try {
    const body = mutation ? await boundedBody(request) : undefined;
    if (body === null) return reply("Request exceeds 32 KB", 413);
    function send(token?: string) {
      const headers = new Headers(upstreamHeaders);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return backendRequest(upstream, { method, headers, body: body || undefined });
    }

    let response = await send(publicAuth ? undefined : access);
    if (response.status === 401 && refresh && !publicAuth) {
      const rotation = await backendRequest("/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (rotation.ok) {
        newTokens = tokens.parse(await rotation.json());
        response = await send(newTokens.accessToken);
      } else if (rotation.status === 401) {
        clear = true;
      } else {
        return reply("Session service temporarily unavailable", 503);
      }
    } else if (response.status === 401 && !publicAuth) {
      clear = true;
    }

    let payload: unknown = await response.json();
    if (publicAuth && response.ok) {
      newTokens = tokens.parse(payload);
      const { userId, message } = payload as { userId: number; message: string };
      payload = { userId, message };
    }
    if (endpoint === "logout" && (response.ok || response.status === 401)) {
      clear = true;
      if (response.status === 401) return withCookies(reply("Signed out", 200), true);
    }
    if (endpoint === "me/password" && response.ok) clear = true;

    const outgoing = NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "private, no-store" } });
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) outgoing.headers.set("Retry-After", retryAfter);
    return withCookies(outgoing, clear, newTokens);
  } catch {
    return reply("The API is temporarily unavailable", 503);
  }
}

function withCookies(response: NextResponse, clear: boolean, session?: { accessToken: string; refreshToken: string }) {
  if (clear) {
    response.cookies.set(accessCookie, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(refreshCookie, "", { ...cookieOptions, maxAge: 0 });
  } else if (session) {
    response.cookies.set(accessCookie, session.accessToken, { ...cookieOptions, maxAge: 15 * 60 });
    response.cookies.set(refreshCookie, session.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 });
  }
  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
