import { createHash } from "node:crypto";
import { and, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, checkoutOrders, payments, trips, type CheckoutBooking } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, bearer, body, checkoutItem, createRoute, errors, id, json, paymentMethod, router, z } from "@/routes/contracts";
import { customerIdFor, multiplyMoney, todayUtc } from "@/utils/booking";

const order = z.object({ items: z.array(checkoutItem).min(1).max(20), paymentMethod }).strict();
const result = z.object({
  message: z.string(),
  bookings: z.array(z.object({ bookingId: id, tripId: id, totalPrice: z.string() })),
});
const checkoutRoute = createRoute({
  method: "post", path: "/", tags: ["bookings"], summary: "Pay for and reserve trips with a simulated payment",
  security: bearer,
  request: { headers: z.object({ "idempotency-key": z.uuid() }), body: body(order) },
  responses: { 201: json(result, "Order placed or replayed"), ...errors },
});

const checkoutRouter = router();
checkoutRouter.openapi(checkoutRoute, async (c) => {
  const actor = c.get("user");
  requireRole(actor, "customer");
  const customerId = await customerIdFor(actor);
  const { items, paymentMethod } = c.req.valid("json");
  const key = c.req.valid("header")["idempotency-key"];
  const sortedItems = items.toSorted((a, b) => a.tripId - b.tripId);
  if (new Set(sortedItems.map(item => item.tripId)).size !== items.length) {
    throw new ApiError(400, "Include each trip only once");
  }
  const requestHash = createHash("sha256").update(JSON.stringify({ items: sortedItems, paymentMethod })).digest("hex");
  const orderBookings = await db.transaction(async (tx) => {
    const orderId = and(eq(checkoutOrders.customerId, customerId), eq(checkoutOrders.key, key));
    const [newOrder] = await tx.insert(checkoutOrders).values({ customerId, key, requestHash })
      .onConflictDoNothing().returning({ key: checkoutOrders.key });
    if (!newOrder) {
      const [existing] = await tx.select().from(checkoutOrders).where(orderId);
      if (existing?.requestHash !== requestHash || !existing.result) {
        throw new ApiError(409, "This checkout key belongs to another request");
      }
      return existing.result;
    }

    const created: CheckoutBooking[] = [];
    for (const item of sortedItems) {
      const [trip] = await tx.update(trips).set({
        availableSeats: sql`${trips.availableSeats} - ${item.travelers}`,
      }).where(and(eq(trips.id, item.tripId), gt(trips.departureDate, todayUtc()), gte(trips.availableSeats, item.travelers)))
        .returning({ price: trips.price });
      if (!trip) {
        const [existing] = await tx.select({ departureDate: trips.departureDate }).from(trips).where(eq(trips.id, item.tripId));
        if (!existing) throw new ApiError(404, "A trip in your cart is no longer available");
        if (existing.departureDate <= todayUtc()) throw new ApiError(409, "A trip in your cart has already started");
        throw new ApiError(409, "One or more trips no longer have enough available seats");
      }

      if (item.expectedPrice && multiplyMoney(item.expectedPrice, 1) !== trip.price) {
        throw new ApiError(409, "A trip price changed. Review the new total and try again.");
      }
      const totalPrice = multiplyMoney(trip.price, item.travelers);
      const date = new Date().toISOString();
      const [booking] = await tx.insert(bookings).values({
        customerId, tripId: item.tripId, bookingDate: date, travelers: item.travelers, totalPrice, status: "confirmed",
      }).returning({ id: bookings.id });
      await tx.insert(payments).values({
        bookingId: booking.id, date, amount: totalPrice, status: "successful", method: paymentMethod,
      });
      created.push({ bookingId: booking.id, tripId: item.tripId, totalPrice });
    }

    await tx.update(checkoutOrders).set({ result: created }).where(orderId);
    return created;
  });
  return c.json({ message: "Mock payment approved", bookings: orderBookings }, 201);
});
export default checkoutRouter;
