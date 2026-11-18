import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireRole } from "@/middleware/auth";
import { ApiError, router } from "@/routes/contracts";
import type { Actor } from "@/types/hono";
import { cancelBooking, customerIdFor } from "@/utils/booking";
import { cancelBookingRoute, createBooking, deleteBooking, getAllBookings, getBookingById } from "./routes";

const bookingRouter = router();

async function filterFor(actor: Actor) {
  requireRole(actor, "admin", "customer");
  if (actor.role === "customer") return customerIdFor(actor);
}

bookingRouter.openapi(getAllBookings, async (c) => {
  const customerId = await filterFor(c.get("user"));
  const { limit, offset } = c.req.valid("query");
  const rows = await db.select().from(bookings).where(customerId === undefined ? undefined : eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.id)).limit(limit).offset(offset);
  return c.json(rows, 200);
});

bookingRouter.openapi(getBookingById, async (c) => {
  const customerId = await filterFor(c.get("user"));
  const { id } = c.req.valid("param");
  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, id), customerId === undefined ? undefined : eq(bookings.customerId, customerId)));
  if (!booking) throw new ApiError(404, "Booking not found");
  return c.json(booking, 200);
});

bookingRouter.openapi(createBooking, (c) => {
  c.header("Allow", "GET");
  return c.json({ message: "Create bookings through checkout" }, 405);
});
bookingRouter.openapi(cancelBookingRoute, async (c) => {
  await cancelBooking(c.req.valid("param").id, await filterFor(c.get("user")));
  return c.json({ message: "Booking canceled" }, 200);
});
bookingRouter.openapi(deleteBooking, async (c) => {
  await cancelBooking(c.req.valid("param").id, await filterFor(c.get("user")));
  return c.json({ message: "Booking canceled" }, 200);
});
export default bookingRouter;
