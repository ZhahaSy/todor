# 如何新增一个 Agent Tool

架构已统一为**单次流式 tool-calling agent**（`AgentChatService`）：模型在一次调用里自行决定调哪个工具，不再有"先识别意图再路由"。新增工具只需 **2 步**。

---

## 第一步：创建 Tool 文件

在 `src/modules/ai/tools/` 下新建文件。**不要** `extends StructuredTool`（会触发 zod 泛型深度溢出 TS2589）；统一用 `makeStructuredTool` helper 构造。

### 模式 A：纯函数工具（无需用户上下文）

```typescript
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { makeStructuredTool } from './make-structured-tool';

export function createMyTool(): DynamicStructuredTool {
  return makeStructuredTool({
    name: 'my_feature', // 下划线命名，Agent 用它决定调用
    description: '描述用途与触发场景，写清楚什么时候该调用。',
    schema: z.object({
      param1: z.string().describe('参数1含义'),
      param2: z.number().optional().describe('参数2含义（可选）'),
    }),
    func: async (input) => {
      try {
        return `✅ 操作成功：${input.param1}`;
      } catch (error) {
        return `操作失败：${error.message}`;
      }
    },
  });
}
```

### 模式 B：需要用户上下文 / DI 依赖的工具

把 Service 写成 `@Injectable()`，注入依赖，暴露 `bindUser(ctx)` 返回 per-request 工具。
**不要让模型自行提供 creator/email/location 等可信字段**，从 `UserToolContext` 注入（见 `database-query.tool.ts`、`create-reminder.tool.ts`、`weather-query.tool.ts`）。

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { UserToolContext } from './user-tool-context';
import { makeStructuredTool } from './make-structured-tool';

const schema = z.object({ keyword: z.string().optional().describe('关键词') });

@Injectable()
export class MyUserTool {
  constructor(private readonly someService: SomeService) {}

  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const creator = ctx.userInfo.name; // 闭包捕获，避免 mutate 单例（并发安全）
    return makeStructuredTool({
      name: 'my_user_feature',
      description: '...',
      schema,
      func: (input) => this.run(input, creator),
    });
  }

  private async run(input: z.infer<typeof schema>, creator: string): Promise<string> {
    // 业务逻辑，返回字符串作为工具结果
    return '...';
  }
}
```

**要点**：
- 一律用 `makeStructuredTool`（内部已规避 TS2589），不要加 `@ts-expect-error`。
- `func` 返回字符串，Agent 会把它作为上下文继续推理。
- 模式 B 的工具是单例 Service + per-request `bindUser`。

---

## 第二步：在 `AgentChatService` 注册

### 模式 A（纯函数工具）
在 `agent-chat.service.ts` 的 `buildTools()` 里 push：

```typescript
const tools: StructuredToolInterface[] = [
  // ...现有
  createMyTool(),
];
```

### 模式 B（DI 工具）
1. `ai.module.ts` 的 `providers` 加入 `MyUserTool`（依赖的 Module 加进 `imports`）。
2. `AgentChatService` 构造函数注入 `MyUserTool`，在 `buildTools()` 里 `this.myUserTool.bindUser(ctx)`。

> 用户自定义的 dynamic skills 由 `createDynamicSkillTool` 在 `buildTools()` 中按 userId 自动加载，无需手动注册。

---

## 当前工具

| 工具 | name | 构造方式 | 状态 |
|---|---|---|---|
| `WeatherQueryTool` | `weather_query` | 模式 B（注入 location） | ✅ |
| `DatabaseQueryTool` | `database_query` | 模式 B（注入 creator） | ✅ |
| `CreateReminderTool` | `create_reminder` | 模式 B（注入 creator/email） | ✅ |
| get_user_info | `get_user_info` | 模式 A（`createGetUserInfoTool`） | ✅ |
| dynamic skills | 用户自定义 | `createDynamicSkillTool`（按用户加载） | ✅ |
| `SendEmailTool` | `send_email` | —（待邮件功能改造，未注册） | ⏸ |

---

## 目录结构

```
src/modules/ai/
├── agent-chat.service.ts        ← 统一流式 tool-calling 循环 + 工具注册入口
├── ai.service.ts                ← 入口路由（deepdive 走 handler，其余走 agent）
├── ai.module.ts                 ← DI 注册
├── tools/
│   ├── HOW_TO_ADD_TOOL.md        ← 本文档
│   ├── make-structured-tool.ts   ← 统一工具构造 helper（规避 TS2589）
│   ├── user-tool-context.ts      ← bindUser 注入的用户上下文类型
│   ├── weather-query.tool.ts
│   ├── database-query.tool.ts
│   ├── create-reminder.tool.ts
│   ├── get-user-info.tool.ts
│   ├── dynamic-skill.tool.ts
│   └── send-email.tool.ts        ← 暂下线
└── intent-handlers/
    ├── base.intent-handler.ts
    └── deepdive.intent-handler.ts ← 深入模式（独立会话，不并入 agent）
```
