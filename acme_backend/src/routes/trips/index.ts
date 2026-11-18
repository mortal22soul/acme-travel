import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { agents, trips } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router, type tripFields, type z } from "@/routes/contracts";
import type { Actor } from "@/types/hono";
import { todayUtc } from "@/utils/booking";
import { createTrip, deleteRoute, getRoute, listRoute, updateRoute } from "./routes";

const tripRouter = router();

async function ownedAgent(actor: Actor) {
  requireRole(actor, "admin", "agent");
  if (actor.role === "admin") return;
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, actor.id));
  if (!agent) throw new ApiError(403, "Complete your agent profile");
  return agent.id;
}

function validateDates(trip: Pick<z.output<typeof tripFields>, "type" | "departureDate" | "returnDate">, isNew: boolean) {
  if (isNew && trip.departureDate <= todayUtc()) throw new ApiError(400, "Choose a departure date after today");
  if (trip.type === "round-trip" && (!trip.returnDate || trip.returnDate < trip.departureDate)) {
    throw new ApiError(400, "Choose a return date on or after departure");
  }
  if (trip.type === "one-way" && trip.returnDate) throw new ApiError(400, "A one-way trip has no return date");
}

tripRouter.openapi(listRoute, async (c) => {
  const { limit, offset } = c.req.valid("query");
  const rows = await db.select().from(trips).where(gt(trips.departureDate, todayUtc()))
    .orderBy(trips.departureDate, trips.id).limit(limit).offset(offset);
  return c.json(rows, 200);
});
tripRouter.openapi(getRoute, async (c) => {
  const [trip] = await db.select().from(trips).where(eq(trips.id, c.req.valid("param").id));
  if (!trip) throw new ApiError(404, "Trip not found");
  return c.json(trip, 200);
});
tripRouter.openapi(createTrip, async (c) => {
  const { agentId: requestedAgent, ...values } = c.req.valid("json");
  const owner = await ownedAgent(c.get("user"));
  if (owner && requestedAgent && requestedAgent !== owner) throw new ApiError(403, "Forbidden");
  const agentId = owner ?? requestedAgent;
  if (!agentId) throw new ApiError(400, "Select an agent");
  validateDates(values, true);
  const [trip] = await db.insert(trips).values({ ...values, agentId }).returning();
  return c.json(trip, 201);
});
tripRouter.openapi(updateRoute, async (c) => {
  const owner = await ownedAgent(c.get("user"));
  const { id } = c.req.valid("param");
  const values = c.req.valid("json");
  const trip = await db.transaction(async (tx) => {
    const predicate = and(eq(trips.id, id), owner === undefined ? undefined : eq(trips.agentId, owner));
    const [existing] = await tx.select().from(trips).where(predicate).for("update");
    if (!existing) throw new ApiError(404, "Trip not found");
    const returnDate = values.type === "one-way" && values.returnDate === undefined ? null : values.returnDate;
    validateDates({ ...existing, ...values, returnDate: returnDate === undefined ? existing.returnDate : returnDate }, !!values.departureDate);
    const [changed] = await tx.update(trips).set({ ...values, returnDate, updatedAt: new Date().toISOString() }).where(predicate).returning();
    return changed;
  });
  return c.json(trip, 200);
});
tripRouter.openapi(deleteRoute, async (c) => {
  const owner = await ownedAgent(c.get("user"));
  const [trip] = await db.delete(trips)
    .where(and(eq(trips.id, c.req.valid("param").id), owner === undefined ? undefined : eq(trips.agentId, owner)))
    .returning({ id: trips.id });
  if (!trip) throw new ApiError(404, "Trip not found");
  return c.json({ message: "Trip deleted" }, 200);
});
export default tripRouter;
