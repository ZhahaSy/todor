# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager & Tooling

- **pnpm** (v9+) is the package manager — always use `pnpm`, never `npm` or `yarn`
- **Turbo** orchestrates builds across the monorepo
- Node.js >=18 required

## Common Commands

### Root-level (run from repo root)
```bash
pnpm build                        # Build all packages/apps
pnpm start                        # Start all apps in parallel
pnpm start:c                      # Start chat-ui (web) + dependencies
pnpm start:s                      # Start chat-service (backend) + dependencies
pnpm start:cm                     # Start chat-ui-mobile + dependencies
pnpm lint                         # Lint all packages
pnpm format                       # Prettier format all .ts/.tsx/.md files
pnpm check-types                  # TypeScript type-check all packages
```

### Filter a single app/package
```bash
pnpm --filter chat-service <script>
pnpm --filter chat-ui <script>
pnpm --filter @client/ui <script>
```

### chat-service specific
```bash
pnpm --filter chat-service start:dev   # Watch mode (NestJS)
pnpm --filter chat-service test        # Jest tests
pnpm --filter chat-service test:e2e    # E2E tests
```

### chat-ui-mobile (Tauri)
```bash
pnpm --filter chat-ui-mobile tauri dev    # Run Tauri desktop app
pnpm --filter chat-ui-mobile tauri build  # Build Tauri desktop app
```

## Repository Structure

```
apps/
  chat-service/     NestJS backend — AI chat API, SQLite, JWT auth
  chat-ui/          React SPA (Vite) — web desktop UI
  chat-ui-mobile/   React + Tauri — cross-platform desktop app
packages/
  api/              API client functions (wraps HTTP calls per domain)
  entities/         TypeScript data models/interfaces
  hooks/            Shared React hooks (useChat, useSendMessage)
  request/          Axios instance with auth interceptors (baseURL: /api/)
  ui/               Shared React components (SenderPanel, ChatList, LoginPage)
  utils/            Utility functions (cookie helpers)
```

## Architecture Overview

### Backend (`apps/chat-service`)
- **NestJS** modular architecture with modules: `ai`, `chat-history`, `todo`, `user`, `auth`
- **TypeORM** + SQLite (`chat.db` in app root); `synchronize: true` in dev auto-migrates schema
- **LangChain** (`@langchain/deepseek`) handles LLM calls via the `ai` module
- **JWT** authentication via Passport; cookies used for session
- Swagger docs available at runtime

### Frontend (`apps/chat-ui`, `apps/chat-ui-mobile`)
- **React** + **Vite** + **TypeScript**
- **Ant Design** (antd) as the component library; `@ant-design/x` for AI chat components
- **React Router v7** for navigation (pages: Chat, Todo, Settings)
- **Zustand** for global state (web app only)
- Internal packages imported via workspace aliases (e.g., `@client/api`, `@client/ui`)

### Shared Package Conventions
- Internal dependencies use `workspace:*` protocol
- `@client/request` handles all HTTP: sets `baseURL: /api/`, includes credentials, handles 401 → redirect to login
- `@client/api` exposes domain-specific functions (`ai`, `chat-history`, `todo`, `user`) built on `@client/request`
- `@client/ui` and `@client/hooks` are consumed by both `chat-ui` and `chat-ui-mobile`

### Turbo Pipeline
- `build`, `lint`, `check-types` are cached and run with upstream dependency ordering (`^build`)
- `dev`/`start` tasks are persistent (not cached), run in parallel across apps
