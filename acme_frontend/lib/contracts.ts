import { z } from "zod";

const id = z.number().int().positive();
export const authUser = z.object({
  id, email: z.string(), role: z.enum(["admin", "agent", "customer"]),
  agentId: id.optional(), customerId: id.optional(),
});
export type AuthUser = z.infer<typeof authUser>;

export const trip = z.object({
  id, agentId: id, destination: z.string(), origin: z.string(), images: z.array(z.string()),
  price: z.string(), departureDate: z.iso.date(), returnDate: z.iso.date().nullable(),
  availableSeats: z.number().int().nonnegative(), type: z.enum(["round-trip", "one-way"]),
});
export type Trip = z.infer<typeof trip>;
export const tripList = z.array(trip);

export const reviews = z.array(z.object({
  id, title: z.string(), comment: z.string().nullable(), rating: z.number().int().min(1).max(5),
}));
export const itinerary = z.array(z.object({ id, day: z.number().int().positive(), activity: z.string().nullable() }));
export const bookingList = z.array(z.object({
  id, tripId: id, travelers: z.number().int(), totalPrice: z.string(), status: z.enum(["confirmed", "pending", "canceled"]),
  destination: z.string(), origin: z.string(), departureDate: z.iso.date(),
}));
export const checkoutReceipt = z.object({
  message: z.string(), bookings: z.array(z.object({ bookingId: id, tripId: id, totalPrice: z.string() })),
});
export const tokens = z.object({ accessToken: z.string(), refreshToken: z.string() });
