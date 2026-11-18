# Database

Drizzle definitions live in `schema/`. Generate migrations with `pnpm db:generate` and apply them through `pnpm db:migrate`. The migration runner checks legacy data before changing the schema.

PostgreSQL is authoritative for orders, inventory and payment history. Redis stores revocable sessions and rate limits, and caches trip review pages. The demo seed requires `ACME_DEMO_SEED=1` and a non-production environment.
