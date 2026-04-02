FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/chat-service/package.json apps/chat-service/package.json

RUN pnpm install --filter chat-service... --frozen-lockfile

COPY apps/chat-service apps/chat-service

RUN pnpm --filter chat-service build

FROM node:20-bookworm-slim AS runner

WORKDIR /app/apps/chat-service

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/chat-service/node_modules ./node_modules
COPY --from=builder /app/apps/chat-service/package.json ./package.json
COPY --from=builder /app/apps/chat-service/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
