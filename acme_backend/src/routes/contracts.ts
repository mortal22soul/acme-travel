import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "@/types/hono";

export const id = z.number().int().min(1).max(2147483647);
export const idParam = z.object({ id: z.coerce.number<string>().pipe(id) });
export const tripParam = z.object({ tripId: z.coerce.number<string>().pipe(id) });
export const pagination = z.object({
  limit: z.coerce.number<string>().int().min(1).max(100).default(24),
  offset: z.coerce.number<string>().int().min(0).max(1_000_000).default(0),
});
export const message = z.object({ message: z.string() });
export const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
export const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(value => Number(value) > 0);
export const civilDate = z.iso.date();
export const instant = z.string();
export const role = z.enum(["admin", "agent", "customer"]);
export const tripType = z.enum(["one-way", "round-trip"]);
export const bookingStatus = z.enum(["confirmed", "canceled", "pending"]);
export const paymentStatus = z.enum(["successful", "failed", "pending"]);
export const paymentMethod = z.enum(["credit card", "debit card", "net banking"]);
export const images = z.array(z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.port && !url.username && !url.password &&
    ((url.hostname === "images.pexels.com" && url.pathname.startsWith("/photos/")) ||
      (url.hostname === "images.unsplash.com" && url.pathname.startsWith("/photo-")));
})).min(1).max(8);
export const phone = z.string().trim().regex(/^\+?[\d ()-]{7,20}$/).refine(value => value.replace(/\D/g, "").length >= 7);
export const email = z.email().max(254).transform(value => value.toLowerCase());
export const password = z.string().min(8).max(256);
export const credentials = z.object({ email, password }).strict();
export const customerProfile = z.object({
  phone,
  streetAddress1: text(160),
  streetAddress2: text(160).optional(),
  city: text(80),
  zip: text(20),
  dob: civilDate.refine(date => date >= "1900-01-01" && date < new Date().toISOString().slice(0, 10)),
}).strict();
export const agentProfile = z.object({ phone, region: text(80) }).strict();

export const checkoutItem = z.object({ tripId: id, travelers: z.number().int().min(1).max(10), expectedPrice: money.optional() }).strict();
export const authTokens = z.object({ accessToken: z.string(), refreshToken: z.string() });
export const publicUser = z.object({
  id, firstName: z.string(), lastName: z.string(), username: z.string(), email: z.string(),
  image: z.string().nullable(), role, createdAt: instant, updatedAt: instant,
});
export const tripFields = z.object({
  destination: text(100, 2), origin: text(100, 2), images, price: money, departureDate: civilDate,
  returnDate: civilDate.nullable().default(null), availableSeats: z.number().int().min(0).max(100_000), type: tripType,
});
export const tripResponse = z.object({
  ...tripFields.shape, id, agentId: id, returnDate: civilDate.nullable(), createdAt: instant, updatedAt: instant,
});
export const bookingResponse = z.object({
  id, customerId: id, tripId: id, bookingDate: instant, status: bookingStatus,
  travelers: z.number().int(), totalPrice: z.string(), createdAt: instant, updatedAt: instant,
});
export const itineraryResponse = z.object({
  id, tripId: id, day: z.number().int(), activity: z.string().nullable(), createdAt: instant, updatedAt: instant,
});
export const reviewResponse = z.object({
  id, tripId: id, rating: z.number().int(), title: z.string(), comment: z.string().nullable(),
  createdAt: instant, updatedAt: instant,
});
export const paymentResponse = z.object({
  id, bookingId: id, date: instant, amount: z.string(), status: paymentStatus, method: paymentMethod, createdAt: instant,
});
export const customerResponse = customerProfile.extend({
  id, userId: id, streetAddress2: z.string().nullable(), createdAt: instant, updatedAt: instant,
});
export const agentResponse = agentProfile.extend({ id, userId: id, createdAt: instant, updatedAt: instant });

export function json<T extends z.ZodType>(schema: T, description: string) {
  return { description, content: { "application/json": { schema } } };
}

export function body<T extends z.ZodType>(schema: T) {
  return { required: true, content: { "application/json": { schema } } };
}

export const errors = {
  400: json(message, "Invalid request"),
  401: json(message, "Authentication required"),
  403: json(message, "Operation forbidden"),
  404: json(message, "Resource not found"),
  409: json(message, "Conflicting state"),
  413: json(message, "Request exceeds the size limit"),
  429: json(message, "Too many requests"),
  503: json(message, "Service temporarily unavailable"),
};

export const bearer = [{ Bearer: [] }];
export const router = () => new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      return c.json({ message: [issue?.path.join("."), issue?.message].filter(Boolean).join(": ") || "Invalid request" }, 400);
    }
  },
});

export class ApiError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503, message: string) {
    super(message);
  }
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return;
  if ("code" in error && typeof error.code === "string") return error.code;
  return databaseErrorCode(error.cause);
}

export { createRoute, z };
