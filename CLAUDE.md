# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for an AI-powered chat application built with LangChain and DeepSeek. The repository contains three applications and several shared packages organized using pnpm workspaces.

**Package Manager**: pnpm 9.0.0 (required)
**Node Version**: >= 18

## Applications

- **chat-service** (`apps/chat-service`) - NestJS backend with LangChain AI integration
- **chat-ui** (`apps/chat-ui`) - React frontend with Vite, uses Ant Design
- **chat-ui-mobile** (`apps/chat-ui-mobile`) - Tauri-based desktop/mobile app

## Shared Packages

All packages are under `packages/` and use the `@client/*` namespace:

- **@client/api** - API endpoint definitions and request handlers
- **@client/entities** - Shared TypeScript interfaces for data models
- **@client/hooks** - React custom hooks (`useChat`, `useSendMessage`)
- **@client/request** - Axios instance with auth interceptors
- **@client/ui** - Reusable UI components (ChatList, SenderPanel, SignIn, etc.)
- **@client/utils** - Utility functions

## Common Commands

### Development

```bash
# Start all applications in parallel
pnpm start

# Start only the frontend (chat-ui)
pnpm start:c

# Start only the backend (chat-service)
pnpm start:s

# Start mobile app
pnpm start:cm
```

### Building and Testing

```bash
# Build all projects
pnpm build

# Lint all projects
pnpm lint

# Type check all projects
pnpm check-types

# Format code with Prettier
pnpm format
```

### Backend-Specific Commands (in apps/chat-service)

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Start in debug mode
pnpm start:debug

# Production build and start
pnpm build
pnpm start:prod
```

### Frontend-Specific Commands (in apps/chat-ui)

```bash
# Development server (port 5173)
pnpm start

# Production build
pnpm build

# Preview production build
pnpm preview
```

## Architecture

### Backend (chat-service) - NestJS + LangChain

**Entry Point**: `apps/chat-service/src/main.ts`

**Key Modules**:
- **AiModule** - Intent recognition and AI response routing
  - `AiService` classifies user input into intents (`chat`, `todo`, `reminder`)
  - Intent handlers process requests with LangChain (ChatIntentHandler, TodoIntentHandler)
  - Uses DeepSeek LLM via `@langchain/deepseek`
- **ChatHistoryModule** - Message persistence in SQLite
- **TodoModule** - Todo CRUD operations
- **AuthModule** - JWT-based authentication with Passport.js
- **UserModule** - User management
- **ScheduleModule** - Scheduled tasks with node-schedule (email reminders)
- **RedisModule** - Redis connection for chat memory

**AI Pipeline**:
1. User message received at `/api/ai/message`
2. `AiService` uses LLM to classify intent
3. Appropriate handler loads chat history from Redis
4. Handler builds prompt with context (user profile, chat history, current date)
5. LLM processes with structured output (Zod validation for todos)
6. Response saved to Redis memory and returned

**Database**: SQLite with TypeORM
- Location: `dbs/chat.db` (dev) or `/home/dbs/chat.db` (prod)
- Entities: User, ChatHistory, Todo

**Memory System**: Redis-backed chat history
- Custom `RedisChatMemory` class implements LangChain memory interface
- Supports memory scopes: `global` (shared) or `intent` (isolated)
- Configurable TTL (default 7 days) and window size (default 10 messages)
- Key format: `memory:{sessionId}:{memoryKey}`

**Response Format**: All endpoints return `{code, msg, data}`
- HTTP 401 triggers frontend redirect to login

### Frontend (chat-ui) - React + Vite

**Entry Point**: `apps/chat-ui/src/main.tsx`

**Routing** (React Router v7):
- `/chat` - Chat interface with AI
- `/todo` - Todo management
- `/setting` - Settings page
- `/login`, `/signin` - Authentication

**State Management**: Zustand
- `useUserStore` - Global user state and user list

**Key Pages**:
- **Chat Page** (`src/pages/chat`) - Uses `useChat()` and `useSendMessage()` hooks from `@client/hooks`
- **Todo Page** (`src/pages/todo`) - Todo CRUD with SearchForm and CardView
- **Setting Page** - Configuration interface

**Component Library**: Ant Design 5 with Less styling
- Custom theme in `src/style/theme.less`
- CSS Modules for component-specific styles

**API Communication**:
- All requests use `@client/request` axios instance
- Base URL: `/api/` (proxied to `http://localhost:3000` in dev)
- Auth: JWT in HTTP-only cookies via `withCredentials: true`
- Auto error handling: 401 → redirect to login, show error messages

**Development Server**: Vite on port 5173 with proxy to backend

## Important Patterns

### Adding New API Endpoints

1. Create endpoint in backend controller (`apps/chat-service/src/modules/*/`)
2. Add request function in `packages/api/src/` using shared axios instance
3. Use in frontend via `import { myFunction } from '@client/api'`

### Adding New UI Components

1. Create component in `packages/ui/src/`
2. Export from `packages/ui/index.ts`
3. Import in apps: `import { MyComponent } from '@client/ui'`

### Adding New Shared Hooks

1. Create hook in `packages/hooks/src/`
2. Export from `packages/hooks/index.ts`
3. Import in apps: `import { useMyHook } from '@client/hooks'`

### Adding New AI Intents

1. Create intent handler class extending `BaseIntentHandler` in `apps/chat-service/src/modules/ai/intent-handler/`
2. Implement `process()` method with LangChain logic
3. Register handler in `AiService.intentHandlers` map
4. Update intent classification in `AiService.recognizeIntent()`

### Memory Configuration for Intent Handlers

Intent handlers can configure memory scope:
- Set `memoryScope = 'global'` for cross-intent context sharing
- Set `memoryScope = 'intent'` for isolated per-intent memory
- Default is `'global'`

## Environment Variables

Backend requires `.env` file in `apps/chat-service/`:

```
DEEPSEEK_API_KEY=your_api_key
AI_MODEL=deepseek-chat
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
DB_TYPE=sqlite
DB_DATABASE=dbs/chat.db
```

## File Locations

**Backend Entry**: `apps/chat-service/src/main.ts` - Bootstrap with Swagger on port 3000
**Frontend Entry**: `apps/chat-ui/src/main.tsx` - React 18 rendering
**Router Config**: `apps/chat-ui/src/router/index.tsx` - Route definitions
**AI Core**: `apps/chat-service/src/modules/ai/ai.service.ts` - Intent recognition
**Memory Implementation**: `apps/chat-service/src/modules/ai/memory/redis-chat-memory.ts` - Redis chat history
**Shared Request**: `packages/request/index.ts` - Axios with interceptors
**Shared Hooks**: `packages/hooks/src/useChat.ts`, `packages/hooks/src/useSendMessage.ts`

## Path Aliases

Frontend uses `@` alias for `/src` directory in imports:
```typescript
import Component from '@/components/Component'
```

## TypeScript

All packages use TypeScript 5.x. Shared types in `@client/entities` prevent sync issues between frontend and backend.

## Monorepo Workflow

- Turbo handles build orchestration with automatic dependency resolution
- Changes to shared packages trigger dependent app rebuilds
- Build outputs are cached for `build` tasks
- `dev` and `start` tasks run without caching (persistent)
