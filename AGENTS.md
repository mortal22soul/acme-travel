# ACME agent notes

- Run package commands inside `acme_frontend/` or `acme_backend/`. They use separate lockfiles and pin pnpm 12.18.0.
- Frontend checks are `pnpm lint`, `pnpm test`, and `pnpm build`. Run `pnpm test:e2e` after building both packages and preparing the isolated backend database. The browser suite uses Chromium and Firefox.
- Backend checks are `pnpm typecheck`, `pnpm test`, and `pnpm build`. Tests use a migrated and seeded disposable database. `pnpm test:upgrade` additionally needs a separate, empty `UPGRADE_DATABASE_URL`.
- Local per-package environment files are `.env.local`. For the frontend set `API_URL` to the backend origin and `APP_ORIGIN` to the browser origin. Deployment accepts process environment variables.
- Backend API composition and middleware order live in `acme_backend/src/app.ts`. Resource routers register their Hono OpenAPI contracts there. Frontend browser requests go through `app/api/[...path]/route.ts`.
- Generate migrations from `acme_backend/src/db/schema/` with `pnpm db:generate` and apply them with `pnpm db:migrate`. The migration command checks legacy data before changing any records. Use `ACME_DEMO_SEED=1 pnpm seed` only on a disposable database.
- Read [deployment and upgrade notes](docs/deployment.md) when changing Compose, auth configuration, migrations, or a production rollout.
