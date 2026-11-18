import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cacheKeys, getOrSet, remove } from "@/db/cache";
import { bookings, reviews, trips } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import type { Actor } from "@/types/hono";
import { customerIdFor } from "@/utils/booking";
import { createReview, deleteRoute, getRoute, listRoute, updateRoute } from "./routes";

const reviewRouter = router();
const fields = {
  id: reviews.id, tripId: reviews.tripId, rating: reviews.rating, title: reviews.title,
  comment: reviews.comment, createdAt: reviews.createdAt, updatedAt: reviews.updatedAt,
};
async function ownerFor(actor: Actor) {
  requireRole(actor, "admin", "customer");
  if (actor.role === "customer") return customerIdFor(actor);
}

reviewRouter.openapi(listRoute, async (c) => {
  const { limit, offset } = c.req.valid("query");
  return c.json(await db.select(fields).from(reviews).orderBy(desc(reviews.id)).limit(limit).offset(offset), 200);
});
reviewRouter.openapi(getRoute, async (c) => {
  const { tripId } = c.req.valid("param");
  const { limit, offset } = c.req.valid("query");
  const load = () => db.select(fields).from(reviews).where(eq(reviews.tripId, tripId)).orderBy(desc(reviews.id)).limit(limit).offset(offset);
  const [trip] = await db.select({ id: trips.id }).from(trips).where(eq(trips.id, tripId));
  if (!trip) throw new ApiError(404, "Trip not found");
  const rows = limit === 24 && offset === 0 ? await getOrSet(cacheKeys.reviews.byTripId(tripId), load) : await load();
  return c.json(rows, 200);
});
reviewRouter.openapi(createReview, async (c) => {
  const actor = c.get("user");
  requireRole(actor, "customer");
  const customerId = await customerIdFor(actor);
  const values = c.req.valid("json");
  const review = await db.transaction(async (tx) => {
    const [booking] = await tx.select({ id: bookings.id }).from(bookings).where(and(
      eq(bookings.customerId, customerId), eq(bookings.tripId, values.tripId), eq(bookings.status, "confirmed"),
    )).limit(1).for("share");
    if (!booking) throw new ApiError(403, "A confirmed booking is required to review this trip");
    const [created] = await tx.insert(reviews).values({ ...values, customerId }).returning(fields);
    return created;
  });
  await remove(cacheKeys.reviews.byTripId(review.tripId));
  return c.json(review, 201);
});
reviewRouter.openapi(updateRoute, async (c) => {
  const owner = await ownerFor(c.get("user"));
  const [review] = await db.update(reviews).set({ ...c.req.valid("json"), updatedAt: new Date().toISOString() }).where(and(
    eq(reviews.id, c.req.valid("param").id), owner === undefined ? undefined : eq(reviews.customerId, owner),
  )).returning(fields);
  if (!review) throw new ApiError(404, "Review not found");
  await remove(cacheKeys.reviews.byTripId(review.tripId));
  return c.json(review, 200);
});
reviewRouter.openapi(deleteRoute, async (c) => {
  const owner = await ownerFor(c.get("user"));
  const [review] = await db.delete(reviews).where(and(
    eq(reviews.id, c.req.valid("param").id), owner === undefined ? undefined : eq(reviews.customerId, owner),
  )).returning({ tripId: reviews.tripId });
  if (!review) throw new ApiError(404, "Review not found");
  await remove(cacheKeys.reviews.byTripId(review.tripId));
  return c.json({ message: "Review removed" }, 200);
});
export default reviewRouter;
