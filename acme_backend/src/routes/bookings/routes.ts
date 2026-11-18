import { bearer, body, bookingResponse, createRoute, errors, idParam, json, message, pagination, z } from "@/routes/contracts";

const tags = ["bookings"];
const security = bearer;
export const getAllBookings = createRoute({
  method: "get", path: "/", tags, security, summary: "List visible bookings",
  request: { query: pagination },
  responses: { 200: json(z.array(bookingResponse), "Bookings"), ...errors },
});
export const getBookingById = createRoute({
  method: "get", path: "/{id}", tags, security, summary: "Get a visible booking",
  request: { params: idParam },
  responses: { 200: json(bookingResponse, "Booking"), ...errors },
});
export const cancelBookingRoute = createRoute({
  method: "put", path: "/{id}", tags, security, summary: "Cancel a booking and retain its history",
  request: { params: idParam, body: body(z.object({ status: z.literal("canceled") }).strict()) },
  responses: { 200: json(message, "Booking canceled"), ...errors },
});
export const deleteBooking = createRoute({
  method: "delete", path: "/{id}", tags, security, summary: "Cancel a booking and retain its history",
  request: { params: idParam },
  responses: { 200: json(message, "Booking canceled"), ...errors },
});
export const createBooking = createRoute({
  method: "post", path: "/", tags, security, summary: "Retired. Create bookings through checkout",
  responses: { 405: json(message, "Use checkout"), ...errors },
});
