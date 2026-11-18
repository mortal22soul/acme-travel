import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import env from "@/env";
import redis from "@/db/redis";
import type { Actor } from "@/types/hono";
import { ApiError } from "@/routes/contracts";

const accessLifetime = 15 * 60;
const sessionLifetime = 7 * 24 * 60 * 60;
const refreshSecret = env.JWT_REFRESH_SECRET ?? createHash("sha256").update("acme-refresh:" + env.JWT_SECRET).digest("hex");
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const sessionKey = (sessionId: string) => `acme:session:v2:${sessionId}`;

type Claims = { kind: "access" | "refresh" };
type Tokens = { accessToken: string; refreshToken: string };

function parse(token: string, kind: Claims["kind"]) {
  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, kind === "access" ? env.JWT_SECRET : refreshSecret, {
      algorithms: ["HS256"], issuer: "acme",
    });
  } catch {
    throw new ApiError(401, "Session expired");
  }
  if (typeof payload === "string" || payload.kind !== kind || typeof payload.sid !== "string" ||
    typeof payload.ver !== "number" || typeof payload.sub !== "string" || !Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) < 1) {
    throw new ApiError(401, "Session expired");
  }
  return { id: Number(payload.sub), sessionId: payload.sid, version: payload.ver };
}

function pair(id: number, sid: string, version: number): Tokens {
  const sign = (kind: Claims["kind"], secret: string, expiresIn: number) =>
    jwt.sign({ sid, kind, ver: version }, secret, { subject: String(id), jwtid: randomUUID(), issuer: "acme", expiresIn });
  return { accessToken: sign("access", env.JWT_SECRET, accessLifetime), refreshToken: sign("refresh", refreshSecret, sessionLifetime) };
}

async function sessionStore<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch {
    throw new ApiError(503, "Session service temporarily unavailable");
  }
}

export async function startSession(id: number, version: number) {
  const sid = randomUUID();
  const tokens = pair(id, sid, version);
  await sessionStore(() => redis.set(sessionKey(sid), digest(tokens.refreshToken), "EX", sessionLifetime));
  return tokens;
}

export async function authenticateToken(token: string) {
  const claims = parse(token, "access");
  const active = await sessionStore(() => redis.exists(sessionKey(claims.sessionId)));
  if (!active) throw new ApiError(401, "Session expired");
  return claims;
}

export function refreshIdentity(token: string) {
  return parse(token, "refresh");
}

export async function rotateSession(token: string, actor: { id: number; sessionId: string; version: number }) {
  const key = sessionKey(actor.sessionId);
  const replacement = pair(actor.id, actor.sessionId, actor.version);
  const result = await sessionStore(() => redis.eval(
    `local current = redis.call('GET', KEYS[1])
     if not current then return false end
     if current == ARGV[1] then
       redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
       redis.call('SET', KEYS[2], ARGV[2] .. ARGV[3], 'EX', 5)
       return ARGV[3]
     end
     local previous = redis.call('GET', KEYS[2])
     if previous and string.sub(previous, 1, 64) == current then return string.sub(previous, 65) end
     return false`,
    2, key, `${key}:rotated:${digest(token)}`,
    digest(token), digest(replacement.refreshToken), JSON.stringify(replacement), String(sessionLifetime),
  ));
  if (typeof result !== "string") throw new ApiError(401, "Session expired");
  return JSON.parse(result) as Tokens;
}

export async function revokeSession(actor: Actor) {
  await sessionStore(() => redis.del(sessionKey(actor.sessionId)));
}
