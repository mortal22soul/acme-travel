import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError } from "@/routes/contracts";
import type { Actor, AppEnv } from "@/types/hono";
import { authenticateToken } from "@/utils/tokenService";

export const authorizeApi: MiddlewareHandler<AppEnv> = async (c, next) => {
  const { method, path } = c.req;
  const publicRead = (method === "GET" || method === "HEAD") &&
    /^\/(?:trips(?:\/[^/]+)?|reviews(?:\/[^/]+)?|itineraries\/[^/]+)$/.test(path);
  if (publicRead || (method === "POST" && ["/signup", "/login", "/refresh"].includes(path))) return next();

  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new ApiError(401, "Sign in to continue");
  const { id, sessionId, version } = await authenticateToken(authorization.slice(7));
  const [user] = await db.select({ id: users.id, email: users.email, role: users.role, sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, id));
  if (!user || user.sessionVersion !== version) throw new ApiError(401, "Session expired");
  c.set("user", { ...user, sessionId });
  await next();
};

export function requireRole(actor: Actor, ...roles: Actor["role"][]) {
  if (!roles.includes(actor.role)) throw new ApiError(403, "Forbidden");
}
