import { and, desc, eq, sql } from "drizzle-orm";
import { isIP } from "node:net";
import { db } from "@/db";
import { agents, bookings, customers, trips, users } from "@/db/schema";
import env from "@/env";
import { requireRole } from "@/middleware/auth";
import { ApiError, databaseErrorCode, router } from "@/routes/contracts";
import { checkPassword, hashPassword, validatePasswordStrength } from "@/utils/pass";
import { rateLimit } from "@/utils/rateLimiter";
import { refreshIdentity, revokeSession, rotateSession, startSession } from "@/utils/tokenService";
import { changePasswordRoute, completeProfileRoute, loginRoute, logoutRoute, meRoute, myBookingsRoute, refreshTokenRoute, signupRoute } from "./routes";

const authRouter = router();

function clientAddress(c: { req: { header: (name: string) => string | undefined }; env?: { incoming?: { socket?: { remoteAddress?: string } } } }) {
  const proxyAddress = env.TRUST_PROXY === "true" ? c.req.header("X-Client-IP") : undefined;
  return proxyAddress && isIP(proxyAddress) ? proxyAddress : c.env?.incoming?.socket?.remoteAddress ?? "local";
}

authRouter.openapi(signupRoute, async (c) => {
  const { firstName, lastName, username, email, password, role, profile } = c.req.valid("json");
  await rateLimit("signup", clientAddress(c), 15, 900);
  const strength = validatePasswordStrength(password);
  if (!strength.isValid) throw new ApiError(400, strength.requirements.join(". "));
  const hash = await hashPassword(password);
  let userId: number;
  try {
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ firstName, lastName, username, email, password: hash, role })
        .returning({ id: users.id });
      if (role === "agent") await tx.insert(agents).values({ ...profile, userId: user.id });
      else await tx.insert(customers).values({ ...profile, userId: user.id });
      return user.id;
    });
  } catch (error) {
    if (databaseErrorCode(error) === "23505") throw new ApiError(409, "Email, username or phone is already in use");
    throw error;
  }
  return c.json({ userId, message: "Account created", ...await startSession(userId, 0) }, 201);
});

authRouter.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  await rateLimit("login-address", clientAddress(c), 100, 900);
  await rateLimit("login-account", email, 20, 900);
  const [user] = await db.select({ id: users.id, password: users.password, version: users.sessionVersion }).from(users).where(sql`lower(${users.email}) = ${email}`);
  if (!user || !(await checkPassword(password, user.password))) throw new ApiError(401, "Invalid email or password");
  return c.json({ userId: user.id, message: "Signed in", ...await startSession(user.id, user.version) }, 200);
});

authRouter.openapi(refreshTokenRoute, async (c) => {
  const { refreshToken } = c.req.valid("json");
  const identity = refreshIdentity(refreshToken);
  const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, identity.id), eq(users.sessionVersion, identity.version)));
  if (!user) throw new ApiError(401, "Session expired");
  return c.json(await rotateSession(refreshToken, identity), 200);
});

authRouter.openapi(logoutRoute, async (c) => {
  await revokeSession(c.get("user"));
  return c.json({ message: "Signed out" }, 200);
});

authRouter.openapi(meRoute, async (c) => {
  const { id, email, role } = c.get("user");
  const [agent, customer] = await Promise.all([
    db.select({ id: agents.id }).from(agents).where(eq(agents.userId, id)),
    db.select({ id: customers.id }).from(customers).where(eq(customers.userId, id)),
  ]);
  return c.json({ id, email, role, agentId: agent[0]?.id, customerId: customer[0]?.id }, 200);
});

authRouter.openapi(completeProfileRoute, async (c) => {
  const actor = c.get("user");
  const { role, profile } = c.req.valid("json");
  requireRole(actor, role);
  try {
    if (role === "agent") await db.insert(agents).values({ ...profile, userId: actor.id });
    else await db.insert(customers).values({ ...profile, userId: actor.id });
  } catch (error) {
    if (databaseErrorCode(error) === "23505") throw new ApiError(409, "Profile already exists or the phone is in use");
    throw error;
  }
  return c.json({ message: "Profile created" }, 201);
});

authRouter.openapi(myBookingsRoute, async (c) => {
  const actor = c.get("user");
  requireRole(actor, "customer");
  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, actor.id));
  if (!customer) throw new ApiError(403, "Complete your customer profile");
  const rows = await db.select({
    id: bookings.id, status: bookings.status, travelers: bookings.travelers, totalPrice: bookings.totalPrice,
    bookingDate: bookings.bookingDate, tripId: trips.id, destination: trips.destination,
    origin: trips.origin, departureDate: trips.departureDate,
  }).from(bookings).innerJoin(trips, eq(bookings.tripId, trips.id))
    .where(eq(bookings.customerId, customer.id)).orderBy(desc(bookings.bookingDate), desc(bookings.id));
  return c.json(rows, 200);
});

authRouter.openapi(changePasswordRoute, async (c) => {
  const { id } = c.get("user");
  const { currentPassword, newPassword } = c.req.valid("json");
  await rateLimit("password-change", String(id), 10, 900);
  const [user] = await db.select({ password: users.password }).from(users).where(eq(users.id, id));
  if (!user || !(await checkPassword(currentPassword, user.password))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) throw new ApiError(400, strength.requirements.join(". "));
  const hash = await hashPassword(newPassword);
  const [updated] = await db.update(users)
    .set({ password: hash, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date().toISOString() })
    .where(and(eq(users.id, id), eq(users.password, user.password))).returning({ id: users.id });
  if (!updated) throw new ApiError(409, "The password changed during this request. Sign in again.");
  return c.json({ message: "Password changed. Sign in again." }, 200);
});

export default authRouter;
