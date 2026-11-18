# Routes

`src/app.ts` mounts the Hono resource routers and publishes their OpenAPI contracts. Define request bodies and response shapes in the resource route file, and use `c.req.valid()` in its handler.

The authentication middleware checks a live session and current account privileges. Resource handlers enforce role and record ownership. Checkout owns booking creation and payment writes. Booking cancellation releases capacity and preserves associated records.
