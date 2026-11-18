import {
  agentProfile, authTokens, bearer, body, bookingResponse, createRoute, credentials,
  customerProfile, errors, id, json, message, password, text, z,
} from "@/routes/contracts";

const identity = credentials.extend({
  firstName: text(80), lastName: text(80), username: z.string().trim().regex(/^[A-Za-z0-9_.-]{3,40}$/),
});
const registration = z.discriminatedUnion("role", [
  identity.extend({ role: z.literal("customer"), profile: customerProfile }).strict(),
  identity.extend({ role: z.literal("agent"), profile: agentProfile }).strict(),
]);
const signupResponse = authTokens.extend({ userId: id, message: z.string() });
const sessionRequest = z.object({ refreshToken: z.string().min(1).max(2048) }).strict();

export const signupRoute = createRoute({
  method: "post", path: "/signup", tags: ["auth"], summary: "Register a customer or agent",
  request: { body: body(registration) },
  responses: { 201: json(signupResponse, "Account and profile created"), ...errors },
});
export const loginRoute = createRoute({
  method: "post", path: "/login", tags: ["auth"], summary: "Start a session",
  request: { body: body(credentials) },
  responses: { 200: json(signupResponse, "Session started"), ...errors },
});
export const refreshTokenRoute = createRoute({
  method: "post", path: "/refresh", tags: ["auth"], summary: "Rotate a session",
  request: { body: body(sessionRequest) },
  responses: { 200: json(authTokens, "Session rotated"), ...errors },
});
export const logoutRoute = createRoute({
  method: "post", path: "/logout", tags: ["auth"], summary: "End the current session", security: bearer,
  responses: { 200: json(message, "Session ended"), ...errors },
});
export const meRoute = createRoute({
  method: "get", path: "/me", tags: ["auth"], summary: "Get the signed-in user", security: bearer,
  responses: {
    200: json(z.object({ id, email: z.string(), role: z.enum(["admin", "agent", "customer"]), agentId: id.optional(), customerId: id.optional() }), "Current user"),
    ...errors,
  },
});
export const completeProfileRoute = createRoute({
  method: "post", path: "/me/profile", tags: ["auth"], summary: "Complete an existing account profile", security: bearer,
  request: { body: body(z.discriminatedUnion("role", [
    z.object({ role: z.literal("customer"), profile: customerProfile }).strict(),
    z.object({ role: z.literal("agent"), profile: agentProfile }).strict(),
  ])) },
  responses: { 201: json(message, "Profile created"), ...errors },
});
export const myBookingsRoute = createRoute({
  method: "get", path: "/me/bookings", tags: ["bookings"], summary: "Get the customer's bookings", security: bearer,
  responses: {
    200: json(z.array(bookingResponse.pick({ id: true, status: true, travelers: true, totalPrice: true, bookingDate: true, tripId: true })
      .extend({ destination: z.string(), origin: z.string(), departureDate: z.string() })), "Customer booking history"),
    ...errors,
  },
});

export const changePasswordRoute = createRoute({
  method: "put", path: "/me/password", tags: ["auth"], summary: "Change the password and end existing sessions", security: bearer,
  request: { body: body(z.object({ currentPassword: password, newPassword: password }).strict()) },
  responses: { 200: json(message, "Password changed"), ...errors },
});
