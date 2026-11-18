import { swaggerUI } from "@hono/swagger-ui";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import redis from "@/db/redis";
import env from "@/env";
import { authorizeApi } from "@/middleware/auth";
import authRouter from "@/routes/auth";
import userRouter from "@/routes/users";
import customerRouter from "@/routes/customers";
import agentRouter from "@/routes/agents";
import tripRouter from "@/routes/trips";
import bookingRouter from "@/routes/bookings";
import paymentRouter from "@/routes/payments";
import reviewRouter from "@/routes/reviews";
import itineraryRouter from "@/routes/itineraries";
import checkoutRouter from "@/routes/checkout";
import { ApiError, databaseErrorCode, router } from "@/routes/contracts";

export const app = router();
app.use("*", secureHeaders({ strictTransportSecurity: env.NODE_ENV === "production" ? "max-age=31536000" : false }));
app.use("*", cors({ origin: env.ALLOWED_ORIGIN.split(",").map(origin => origin.trim()), exposeHeaders: ["Retry-After"] }));
app.use("*", bodyLimit({
  maxSize: 32 * 1024,
  onError: (c) => c.json({ message: "Request exceeds 32 KB" }, 413),
}));
app.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  await next();
});
app.get("/", (c) => c.json({ status: "running" }));
app.get("/health/ready", async (c) => {
  try {
    await Promise.all([db.execute(sql`select id from users limit 1`), redis.ping()]);
    return c.json({ status: "ready" });
  } catch {
    return c.json({ status: "unavailable" }, 503);
  }
});
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", { type: "http", scheme: "bearer", bearerFormat: "JWT" });
app.doc31("/openapi", {
  openapi: "3.1.0",
  info: { version: "1.0.0", title: "ACME Travel API" },
});
app.get("/docs", swaggerUI({ url: "/openapi" }));
app.use("*", authorizeApi);
app.route("/", authRouter);
app.route("/users", userRouter);
app.route("/customers", customerRouter);
app.route("/agents", agentRouter);
app.route("/trips", tripRouter);
app.route("/bookings", bookingRouter);
app.route("/payments", paymentRouter);
app.route("/reviews", reviewRouter);
app.route("/itineraries", itineraryRouter);
app.route("/checkout", checkoutRouter);
app.notFound((c) => c.json({ message: "Resource not found" }, 404));
app.onError((error, c) => {
  if (error instanceof ApiError) {
    if (error.status === 429) c.header("Retry-After", "900");
    return c.json({ message: error.message }, error.status);
  }
  if (error instanceof HTTPException && error.status === 400) return c.json({ message: "Malformed request" }, 400);
  const code = databaseErrorCode(error);
  if (code === "23505") return c.json({ message: "A matching record already exists" }, 409);
  if (code === "23503") return c.json({ message: "This operation conflicts with a related record" }, 409);
  if (code === "23514" || code === "22003") return c.json({ message: "Values exceed the supported limits" }, 400);
  console.error("API request failed", error.name, code ?? "unknown");
  return c.json({ message: "Internal server error" }, 500);
});
