# ACME Travel frontend

This Next.js application serves destination information, account forms, and simulated checkout. It uses server rendering for public trip information and a same-origin proxy for browser API requests.

Use Node.js 22 and the pinned pnpm version. Copy `.env.example` to `.env.local`. Set `API_URL` to the running backend and `APP_ORIGIN` to the browser origin.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3001`. Run `pnpm lint`, `pnpm test`, and `pnpm build` for package verification. With both packages built and an isolated migrated and seeded backend, `pnpm test:e2e` runs Chromium and Firefox journeys. Install the test browsers with `pnpm exec playwright install chromium firefox`.

The UI targets current Chromium and Firefox and Safari 16.4 or newer. Production serves a nonce-based CSP and uses an HTTPS ingress. See [deployment and upgrade notes](../docs/deployment.md) for local Compose, auth, and data migration.
