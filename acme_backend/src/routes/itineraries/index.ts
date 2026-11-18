import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { agents, itineraries, trips } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import type { Actor } from "@/types/hono";
import { createItinerary, deleteRoute, getRoute, listRoute, updateRoute } from "./routes";

const itineraryRouter = router();
function visibleTripIds(actor: Actor) {
  requireRole(actor, "admin", "agent");
  if (actor.role === "admin") return;
  return db.select({ id: trips.id }).from(trips).innerJoin(agents, eq(trips.agentId, agents.id)).where(eq(agents.userId, actor.id));
}
const order = [itineraries.day, itineraries.id] as const;
itineraryRouter.openapi(listRoute, async (c) => {
  const visible = visibleTripIds(c.get("user"));
  const { limit, offset } = c.req.valid("query");
  return c.json(await db.select().from(itineraries)
    .where(visible ? inArray(itineraries.tripId, visible) : undefined).orderBy(...order).limit(limit).offset(offset), 200);
});
itineraryRouter.openapi(getRoute, async (c) => {
  const { tripId } = c.req.valid("param");
  const [trip] = await db.select({ id: trips.id }).from(trips).where(eq(trips.id, tripId));
  if (!trip) throw new ApiError(404, "Trip not found");
  return c.json(await db.select().from(itineraries).where(eq(itineraries.tripId, tripId)).orderBy(...order), 200);
});
itineraryRouter.openapi(createItinerary, async (c) => {
  const visible = visibleTripIds(c.get("user"));
  const values = c.req.valid("json");
  const itinerary = await db.transaction(async (tx) => {
    const [trip] = await tx.select({ id: trips.id }).from(trips)
      .where(and(eq(trips.id, values.tripId), visible ? inArray(trips.id, visible) : undefined)).for("share");
    if (!trip) throw new ApiError(404, "Trip not found");
    const [entry] = await tx.insert(itineraries).values(values).returning();
    return entry;
  });
  return c.json(itinerary, 201);
});
itineraryRouter.openapi(updateRoute, async (c) => {
  const visible = visibleTripIds(c.get("user"));
  const [entry] = await db.update(itineraries).set({ ...c.req.valid("json"), updatedAt: new Date().toISOString() }).where(and(
    eq(itineraries.id, c.req.valid("param").id), visible ? inArray(itineraries.tripId, visible) : undefined,
  )).returning();
  if (!entry) throw new ApiError(404, "Itinerary entry not found");
  return c.json(entry, 200);
});
itineraryRouter.openapi(deleteRoute, async (c) => {
  const visible = visibleTripIds(c.get("user"));
  const [entry] = await db.delete(itineraries).where(and(
    eq(itineraries.id, c.req.valid("param").id), visible ? inArray(itineraries.tripId, visible) : undefined,
  )).returning({ id: itineraries.id });
  if (!entry) throw new ApiError(404, "Itinerary entry not found");
  return c.json({ message: "Entry removed" }, 200);
});
export default itineraryRouter;
