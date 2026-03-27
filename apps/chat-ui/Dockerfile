FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/chat-ui/package.json apps/chat-ui/package.json
COPY packages packages

RUN pnpm install --frozen-lockfile

COPY apps/chat-ui apps/chat-ui

RUN pnpm --filter chat-ui build

FROM nginx:1.27-alpine AS runner

COPY apps/chat-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/chat-ui/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
