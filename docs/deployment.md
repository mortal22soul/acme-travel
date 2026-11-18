# ACME deployment and upgrade

## Run the stack locally

Copy the root `.env.example` to `.env`. Match the PostgreSQL user, password and database in `DATABASE_URL` to the variables used to provision PostgreSQL. URL-encode any reserved characters in credentials. Set two distinct random JWT secrets of at least 32 characters.

Run `docker compose up --build`. Compose starts PostgreSQL and Redis on its private network, runs the migrations, waits for backend readiness, then starts the frontend. The default browser origin is `http://localhost:3001`. The loopback API is at `http://localhost:3000`, with Swagger at `/docs`, OpenAPI at `/openapi` and readiness at `/health/ready`. Set `APP_ORIGIN` to the exact browser origin if you change the frontend port or use a reverse proxy.

To load sample records, use a disposable development or test database and run `ACME_DEMO_SEED=1 pnpm seed` from `acme_backend/`. The seed clears all application tables and refuses production mode.

## Upgrade an existing deployment

1. Take and verify a backup. Rehearse the migration on a copy of the database while the application writers are stopped.
2. Run `pnpm db:migrate`. Its preflight reports aggregate counts of ambiguous legacy records, including duplicate profiles and reviews, case-insensitive email collisions, invalid dates, and amounts that cannot convert to the new decimal format. The preflight does not change affected records. Resolve conflicts with the data owner before rerunning so bookings and payments keep their original relationships.
3. Before enabling public traffic, review every account with the administrator role against the authorized roster. The previous public signup accepted privileged roles, so a database role alone cannot establish provenance. Inventory suspect accounts and their activity before changing roles. Use a trusted database operator to revoke their authority, rotate deployment JWT secrets, and review relevant access and audit logs. New JWTs use a different claim format, so previously issued tokens cannot authorize requests after the upgrade.
4. Start the backend and frontend with the new process environment. Verify readiness and use a normal account to check sign-in, booking history and logout. The upgrade keeps booking and payment history. A one-way trip’s legacy return date is cleared because it does not represent a return leg. Trip and birth dates are civil dates.
5. Existing profile-less customers and agents can sign in and complete their profile from **My account**. Existing browser carts can be imported explicitly into the signed-in cart.

## Ingress and session configuration

Use an HTTPS ingress for deployment and supply `APP_ORIGIN=https://your-host`. Keep PostgreSQL, Redis and the direct API private. The Next.js server connects to the API through `API_URL` and keeps session credentials in host-only HttpOnly cookies. Set `TRUST_PROXY=true` and `TRUSTED_CLIENT_IP_HEADER` only when the trusted ingress overwrites the configured single-address header. Without that setup, the API applies the address threshold to its connection peer.

The frontend enforces a per-response nonce CSP. To observe the policy during a deployment rehearsal, start it with `CSP_REPORT_ONLY=1`. Inspect browser policy reports and validate that only approved frontend requests load before enforcing. HSTS is served in production mode.

## API behavior changes

- Public signup creates a user and the appropriate profile together. Registration accepts customer or agent accounts.
- `POST /checkout` requires a UUID `Idempotency-Key`. Retry an uncertain order with the same key and identical request body. A matching committed request returns the original receipt. The cart sends the displayed prices so checkout can reject a stale quote.
- The bookings collection is scoped to the customer. A booking cancellation releases seats once and preserves its payment record. Payment records are created as part of checkout.
- Trip prices and mock payments use two decimal USD places. Trip departure and return use `YYYY-MM-DD` with UTC as the bookability boundary. The public catalog lists future trips, and older trip detail links remain available.
- Public review responses exclude customer IDs. New reviews require a confirmed booking and each customer may publish one review per trip.

## Verification

For package checks, run the scripts in each subproject. For the browser suite, migrate and seed a disposable backend using its normal ports, build both packages, then run `pnpm test:e2e` from the frontend. Run `pnpm test:upgrade` in the backend with an independent empty `UPGRADE_DATABASE_URL` to exercise the original schema and forward migration.
