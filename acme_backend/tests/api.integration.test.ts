import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app";
import redis from "@/db/redis";
import { cacheKeys } from "@/db/cache";

let adminToken: string;
let aliceToken: string;
let bobToken: string;
let firstTripId: number;

async function login(email: string) {
  const response = await app.request("http://localhost/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  expect(response.status).toBe(200);
  return (await response.json()).accessToken as string;
}

async function loginWithRefreshToken(email: string) {
  const response = await app.request("http://localhost/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  expect(response.status).toBe(200);
  return await response.json();
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  adminToken = await login("admin@acme.com");
  aliceToken = await login("alice@acme.com");
  bobToken = await login("bob@acme.com");

  const agents = await app.request("http://localhost/agents", {
    headers: bearer(adminToken),
  });
  const aliceAgent = (await agents.json()).find((agent: { userId: number }) => agent.userId);
  const trips = await app.request("http://localhost/trips");
  expect(trips.status).toBe(200);
  firstTripId = (await trips.json()).find((trip: { agentId: number }) => trip.agentId === aliceAgent.id).id;
});

describe("public API contract", () => {
  it("allows public trip reads and sets the allowed CORS origin", async () => {
    const response = await app.request("http://localhost/trips", {
      headers: { Origin: "http://localhost:3001" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3001");
    expect((await response.json()).length).toBeGreaterThan(0);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not authorize an unconfigured browser origin", async () => {
    const response = await app.request("http://localhost/trips", {
      headers: { Origin: "https://untrusted.example" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects malformed signup payloads before creating an account", async () => {
    const response = await app.request("http://localhost/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("JWT authentication and RBAC", () => {
  it("rejects missing and invalid bearer tokens on protected endpoints", async () => {
    const missing = await app.request("http://localhost/users");
    const invalid = await app.request("http://localhost/users", {
      headers: bearer("not-a-jwt"),
    });

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it("allows admins to access administrative resources", async () => {
    const response = await app.request("http://localhost/users", {
      headers: bearer(adminToken),
    });

    expect(response.status).toBe(200);
    const users = await response.json();
    expect(users[0]).not.toHaveProperty("password");
  });

  it("forbids customers from administrative resources", async () => {
    const customerToken = await login("charlie@example.com");
    const response = await app.request("http://localhost/users", {
      headers: bearer(customerToken),
    });

    expect(response.status).toBe(403);
  });

  it("prevents an agent from changing another agent's trip", async () => {
    const response = await app.request(`http://localhost/trips/${firstTripId}`, {
      method: "PUT",
      headers: { ...bearer(bobToken), "content-type": "application/json" },
      body: JSON.stringify({ destination: "Unauthorized change" }),
    });

    expect(response.status).toBe(404);
  });

  it("prevents a customer from creating a booking for another customer", async () => {
    const customerToken = await login("charlie@example.com");
    const bookings = await app.request("http://localhost/bookings", {
      headers: bearer(adminToken),
    });
    const anotherCustomersBooking = (await bookings.json())[1];

    const response = await app.request("http://localhost/bookings", {
      method: "POST",
      headers: { ...bearer(customerToken), "content-type": "application/json" },
      body: JSON.stringify({
        customerId: anotherCustomersBooking.customerId,
        tripId: firstTripId,
        bookingDate: new Date().toISOString(),
        travelers: 1,
        totalPrice: "100.00",
      }),
    });

    expect(response.status).toBe(405);
  });

  it("prevents an agent from adding an itinerary to another agent's trip", async () => {
    const response = await app.request("http://localhost/itineraries", {
      method: "POST",
      headers: { ...bearer(bobToken), "content-type": "application/json" },
      body: JSON.stringify({
        tripId: firstTripId,
        day: 99,
        activity: "Unauthorized itinerary entry",
      }),
    });

    expect(response.status).toBe(404);
  });

  it("restricts payment data to administrators", async () => {
    const customerToken = await login("charlie@example.com");
    const response = await app.request("http://localhost/payments", {
      headers: bearer(customerToken),
    });

    expect(response.status).toBe(403);
  });

  it("revokes refresh tokens on logout", async () => {
    const session = await loginWithRefreshToken("admin@acme.com");
    const logout = await app.request("http://localhost/logout", {
      method: "POST",
      headers: { ...bearer(session.accessToken), "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const refresh = await app.request("http://localhost/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const protectedRequest = await app.request("http://localhost/users", {
      headers: bearer(session.accessToken),
    });

    expect(logout.status).toBe(200);
    expect(refresh.status).toBe(401);
    expect(protectedRequest.status).toBe(401);
  });

  it("shares a single rotation across overlapping refreshes", async () => {
    const session = await loginWithRefreshToken("leila@example.com");
    const firstRefresh = await app.request("http://localhost/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const rotated = await firstRefresh.json();
    const reusedRefresh = await app.request("http://localhost/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const currentRefresh = await app.request("http://localhost/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: rotated.refreshToken }),
    });

    expect(firstRefresh.status).toBe(200);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(reusedRefresh.status).toBe(200);
    expect(await reusedRefresh.json()).toEqual(rotated);
    expect(currentRefresh.status).toBe(200);
  });

  it("rate-limits repeated failed login attempts", async () => {
    let response: Response | undefined;
    const email = `limit-${randomUUID()}@example.com`;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      response = await app.request("http://localhost/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
    }

    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("accepts a valid JWT for an agent's permitted API area", async () => {
    const response = await app.request("http://localhost/trips", {
      method: "POST",
      headers: { ...bearer(aliceToken), "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it("restricts checkout to authenticated customer profiles and validates its cart", async () => {
    const agentCheckout = await app.request("http://localhost/checkout", {
      method: "POST",
      headers: { ...bearer(aliceToken), "content-type": "application/json", "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ items: [{ tripId: firstTripId, travelers: 1 }], paymentMethod: "credit card" }),
    });
    const emptyCart = await app.request("http://localhost/checkout", {
      method: "POST",
      headers: { ...bearer(await login("charlie@example.com")), "content-type": "application/json", "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ items: [], paymentMethod: "credit card" }),
    });

    expect(agentCheckout.status).toBe(403);
    expect(emptyCart.status).toBe(400);
  });
});

describe("cache invalidation", () => {
  it("returns updated trip data after an admin mutation", async () => {
    const initial = await app.request(`http://localhost/trips/${firstTripId}`);
    const originalTrip = await initial.json();
    const updatedDestination = `${originalTrip.destination} (updated)`;

    const update = await app.request(`http://localhost/trips/${firstTripId}`, {
      method: "PUT",
      headers: { ...bearer(adminToken), "content-type": "application/json" },
      body: JSON.stringify({ destination: updatedDestination }),
    });
    expect(update.status).toBe(200);

    const refreshed = await app.request(`http://localhost/trips/${firstTripId}`);
    expect(refreshed.status).toBe(200);
    expect((await refreshed.json()).destination).toBe(updatedDestination);

    await app.request(`http://localhost/trips/${firstTripId}`, {
      method: "PUT",
      headers: { ...bearer(adminToken), "content-type": "application/json" },
      body: JSON.stringify({ destination: originalTrip.destination }),
    });
  });

  it("invalidates trip-scoped review cache after an admin update", async () => {
    const reviews = await app.request("http://localhost/reviews", {
      headers: bearer(adminToken),
    });
    const review = (await reviews.json())[0];
    const cached = await app.request(`http://localhost/reviews/${review.tripId}`);
    expect(cached.status).toBe(200);
    expect(await redis.exists(cacheKeys.reviews.byTripId(review.tripId))).toBe(1);
    expect((await cached.json())[0]).not.toHaveProperty("customerId");

    const updatedTitle = `${review.title} (updated)`;
    const update = await app.request(`http://localhost/reviews/${review.id}`, {
      method: "PUT",
      headers: { ...bearer(adminToken), "content-type": "application/json" },
      body: JSON.stringify({ title: updatedTitle }),
    });
    expect(update.status).toBe(200);

    const refreshed = await app.request(`http://localhost/reviews/${review.tripId}`);
    expect((await refreshed.json())[0].title).toBe(updatedTitle);

    await app.request(`http://localhost/reviews/${review.id}`, {
      method: "PUT",
      headers: { ...bearer(adminToken), "content-type": "application/json" },
      body: JSON.stringify({ title: review.title }),
    });
  });
});

const send = (path: string, method: string, body?: unknown, token?: string, headers?: Record<string, string>) =>
  app.request("http://localhost" + path, {
    method,
    headers: { ...(token ? bearer(token) : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

function registration() {
  const alias = randomUUID().slice(0, 12);
  return { firstName: "Remediation", lastName: "Fixture", username: alias, email: `${alias}@example.com`, password: "LocalFixture9!" };
}

describe("registration and session integrity", () => {
  it("restricts public registration to supported roles and provisions the profile before issuing a session", async () => {
    for (const role of ["customer", "agent"] as const) {
      const profile = role === "agent"
        ? { phone: "+12025550109", region: "West" }
        : { phone: `+1202${Date.now().toString().slice(-7)}`, streetAddress1: "123 Fixture St", city: "Portland", zip: "97035", dob: "1990-01-01" };
      const response = await send("/signup", "POST", { ...registration(), role, profile });
      expect(response.status).toBe(201);
      const session = await response.json();
      const me = await send("/me", "GET", undefined, session.accessToken);
      expect(me.status).toBe(200);
      expect(await me.json()).toMatchObject({ role, [`${role}Id`]: expect.any(Number) });
    }
    const disallowed = await send("/signup", "POST", { ...registration(), role: "admin", profile: {} });
    expect(disallowed.status).toBe(400);
  });

  it("keeps a failed profile insert from reserving the account identity", async () => {
    const user = registration();
    const profile = { phone: "+12125550111", streetAddress1: "123 Fixture St", city: "Portland", zip: "97035", dob: "1990-01-01" };
    const first = await send("/signup", "POST", { ...user, role: "customer", profile });
    expect(first.status).toBe(409);
    const changed = await send("/signup", "POST", {
      ...user, role: "customer", profile: { ...profile, phone: `+1312${Date.now().toString().slice(-7)}` },
    });
    expect(changed.status).toBe(201);
  });

  it("revokes the current browser session without signing out another device", async () => {
    const first = await loginWithRefreshToken("dave@example.com");
    const second = await loginWithRefreshToken("dave@example.com");
    expect((await send("/logout", "POST", undefined, first.accessToken)).status).toBe(200);
    expect((await send("/me", "GET", undefined, first.accessToken)).status).toBe(401);
    expect((await send("/me", "GET", undefined, second.accessToken)).status).toBe(200);
    expect((await send("/refresh", "POST", { refreshToken: second.refreshToken })).status).toBe(200);
  });

  it("invalidates old access and refresh credentials after a role change", async () => {
    const profile = { phone: "+12025550109", region: "West" };
    const newAccount = await send("/signup", "POST", { ...registration(), role: "agent", profile });
    const session = await newAccount.json();
    expect((await send(`/users/${session.userId}`, "PUT", { role: "customer" }, adminToken)).status).toBe(200);
    expect((await send("/me", "GET", undefined, session.accessToken)).status).toBe(401);
    expect((await send("/refresh", "POST", { refreshToken: session.refreshToken })).status).toBe(401);
  });

  it("recovers an incomplete account without granting access to admin profile routes", async () => {
    const credentials = registration();
    const created = await send("/signup", "POST", { ...credentials, role: "agent", profile: { phone: "+12025550119", region: "West" } });
    const session = await created.json();
    const me = await (await send("/me", "GET", undefined, session.accessToken)).json();
    expect((await send(`/agents/${me.agentId}`, "DELETE", undefined, adminToken)).status).toBe(200);
    expect(await (await send("/me", "GET", undefined, session.accessToken)).json()).not.toHaveProperty("agentId");
    expect((await send("/me/profile", "POST", { role: "agent", profile: { phone: "+12025550118", region: "West" } }, session.accessToken)).status).toBe(201);
    expect(await (await send("/me", "GET", undefined, session.accessToken)).json()).toHaveProperty("agentId");
  });
});

describe("order and inventory integrity", () => {
  const upcoming = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  async function addTrip(availableSeats: number) {
    const response = await send("/trips", "POST", {
      destination: `Test destination ${randomUUID().slice(0, 6)}`, origin: "Test origin",
      departureDate: upcoming, returnDate: null, type: "one-way", price: "0.11", availableSeats,
      images: ["https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg"],
    }, aliceToken);
    expect(response.status).toBe(201);
    return (await response.json()).id as number;
  }
  const place = (token: string, tripIds: number[], key = randomUUID()) =>
    send("/checkout", "POST", {
      items: tripIds.map(tripId => ({ tripId, travelers: 1 })),
      paymentMethod: "debit card",
    }, token, { "Idempotency-Key": key });
  const seats = async (id: number) => (await (await send(`/trips/${id}`, "GET")).json()).availableSeats;

  it("writes one booking and payment for simultaneous retries and releases inventory once without losing payment history", async () => {
    const id = await addTrip(2);
    const customer = await login("charlie@example.com");
    const other = await login("dave@example.com");
    const key = randomUUID();
    const responses = await Promise.all([place(customer, [id], key), place(customer, [id], key)]);
    expect(responses.map(response => response.status)).toEqual([201, 201]);
    const orders = await Promise.all(responses.map(response => response.json()));
    expect(orders[0]).toEqual(orders[1]);
    expect(orders[0].bookings[0].totalPrice).toBe("0.11");
    const { bookingId } = orders[0].bookings[0];
    expect(await seats(id)).toBe(1);
    expect((await place(customer, [id, await addTrip(1)], key)).status).toBe(409);
    expect((await send(`/bookings/${bookingId}`, "GET", undefined, other)).status).toBe(404);
    const visible = await (await send("/bookings", "GET", undefined, other)).json();
    expect(visible.some((booking: { id: number }) => booking.id === bookingId)).toBe(false);
    const cancellations = await Promise.all([
      send(`/bookings/${bookingId}`, "PUT", { status: "canceled" }, customer),
      send(`/bookings/${bookingId}`, "DELETE", undefined, customer),
    ]);
    expect(cancellations.map(result => result.status)).toEqual([200, 200]);
    expect(await seats(id)).toBe(2);
    const payments = await (await send("/payments", "GET", undefined, adminToken)).json();
    expect(payments.filter((payment: { bookingId: number }) => payment.bookingId === bookingId)).toHaveLength(1);
  });

  it("prevents overselling and rolls back all items in a failed order", async () => {
    const one = await addTrip(1);
    const empty = await addTrip(0);
    const charlie = await login("charlie@example.com");
    const dave = await login("dave@example.com");
    expect((await place(charlie, [one, empty])).status).toBe(409);
    expect(await seats(one)).toBe(1);
    const responses = await Promise.all([place(charlie, [one]), place(dave, [one])]);
    expect(responses.map(result => result.status).sort()).toEqual([201, 409]);
    expect(await seats(one)).toBe(0);
  });

  it("rejects a changed quote before writing an order or reserving inventory", async () => {
    const id = await addTrip(2);
    const customer = await login("charlie@example.com");
    const response = await send("/checkout", "POST", {
      items: [{ tripId: id, travelers: 1, expectedPrice: "0.10" }],
      paymentMethod: "net banking",
    }, customer, { "Idempotency-Key": randomUUID() });
    expect(response.status).toBe(409);
    expect(await seats(id)).toBe(2);
  });

  it("checks review eligibility and publishes at most one review per confirmed trip", async () => {
    const id = await addTrip(5);
    const customer = await login("charlie@example.com");
    const content = { tripId: id, rating: 5, title: "Fixture review", comment: "The booking was confirmed." };
    expect((await send("/reviews", "POST", content, customer)).status).toBe(403);
    expect((await place(customer, [id])).status).toBe(201);
    expect((await send("/reviews", "POST", content, customer)).status).toBe(201);
    expect((await send("/reviews", "POST", content, customer)).status).toBe(409);
    expect(await (await send(`/reviews/${id}`, "GET")).json()).toEqual([
      expect.not.objectContaining({ customerId: expect.anything() }),
    ]);
  });
});

describe("documented request boundaries", () => {
  it("publishes protected contracts and checkout retry requirements", async () => {
    const response = await send("/openapi", "GET");
    expect(response.status).toBe(200);
    const { paths } = await response.json();
    for (const [path, operation] of [["/me", "get"], ["/me/bookings", "get"], ["/checkout", "post"]]) {
      expect(paths[path][operation].security).toEqual([{ Bearer: [] }]);
    }
    expect(paths["/checkout"].post.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "idempotency-key", in: "header", required: true }),
    ]));
  });
});
