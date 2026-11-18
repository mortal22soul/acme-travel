FROM node:22-alpine AS base
WORKDIR /app
RUN npm install --global pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM builder AS migrate
USER node
CMD ["pnpm", "db:migrate"]

FROM base AS production-deps
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
