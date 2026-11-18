import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, customers, trips } from "@/db/schema";
import { ApiError } from "@/routes/contracts";
import type { Actor } from "@/types/hono";

export async function customerIdFor(actor: Actor) {
  const [profile] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, actor.id));
  if (!profile) throw new ApiError(403, "Complete your customer profile");
  return profile.id;
}

export async function cancelBooking(id: number, customerId?: number) {
  return db.transaction(async (tx) => {
    const ownership = customerId === undefined ? eq(bookings.id, id) : and(eq(bookings.id, id), eq(bookings.customerId, customerId));
    const [booking] = await tx.select().from(bookings).where(ownership).for("update");
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status === "canceled") return;
    // Retain the original booking and payment for history, and release its seats once.
    await tx.update(bookings).set({ status: "canceled", updatedAt: new Date().toISOString() }).where(eq(bookings.id, id));
    await tx.update(trips).set({ availableSeats: sql`${trips.availableSeats} + ${booking.travelers}` }).where(eq(trips.id, booking.tripId));
  });
}

export function multiplyMoney(price: string, travelers: number) {
  const [whole, decimal = ""] = price.split(".");
  const cents = (BigInt(whole) * 100n + BigInt(decimal.padEnd(2, "0"))) * BigInt(travelers);
  if (cents > 999_999_999_999n) throw new ApiError(409, "The booking total exceeds the supported amount");
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

export const todayUtc = () => new Date().toISOString().slice(0, 10);
