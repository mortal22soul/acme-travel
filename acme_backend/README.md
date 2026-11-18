# ACME Travel API

The Node.js API uses Hono, Drizzle, PostgreSQL and Redis. It provides registration and independent sessions, a public trip catalog, itinerary management, verified reviews, and a simulated booking and payment flow.

Use Node.js 22 and the pinned pnpm version. Copy `.env.example` to `.env.local` for direct local development, or inject the environment variables at deployment. Start PostgreSQL and Redis before preparing the database.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

The API defaults to port 3000. OpenAPI is at `/openapi`, Swagger at `/docs`, and dependency readiness at `/health/ready`.

Run `pnpm typecheck` and `pnpm build`. Run `pnpm test` against a migrated disposable database with `ACME_DEMO_SEED=1 pnpm seed` fixtures. Use a separate empty database for `pnpm test:upgrade` and pass its DSN as `UPGRADE_DATABASE_URL`.

See [deployment and upgrade notes](../docs/deployment.md) for the full-stack setup, the migration preflight, and API behavior changes.
