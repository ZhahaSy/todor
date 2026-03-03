# 如何新增一个 LangChain Tool

新增一个 Tool 需要改动 **3 个地方**，按顺序操作即可。

---

## 第一步：创建 Tool 文件

在 `src/modules/ai/tools/` 目录下新建文件，例如 `my-feature.tool.ts`。

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { SomeService } from '../../some/some.service'; // 按需注入依赖

@Injectable()
// @ts-expect-error: StructuredTool generic depth exceeds TS limit
export class MyFeatureTool extends StructuredTool {
  // 工具名称，Agent 会用这个名字决定调用哪个工具
  readonly name = 'my_feature';

  // 工具描述，Agent 根据这段描述判断何时调用，写清楚触发场景
  readonly description = '描述这个工具的用途，以及适合哪些用户输入场景。';

  // 入参 Schema（用 zod 定义），每个字段加 .describe() 帮助 Agent 理解含义
  readonly schema = z.object({
    param1: z.string().describe('参数1的含义'),
    param2: z.number().optional().describe('参数2的含义（可选）'),
  });

  constructor(private readonly someService: SomeService) {
    super();
  }

  // 实际执行逻辑，返回字符串给 Agent 作为工具调用结果
  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      // ... 业务逻辑
      return `✅ 操作成功：${input.param1}`;
    } catch (error) {
      return `操作失败：${error.message}`;
    }
  }
}
```

**注意事项**：
- 类名上方必须加 `// @ts-expect-error` 注释，否则 TypeScript 会报泛型深度溢出错误
- `name` 字段使用下划线命名（如 `send_email`、`create_reminder`）
- `_call` 方法返回值是字符串，Agent 会把这个字符串作为上下文继续推理

---

## 第二步：在 `ai.module.ts` 注册

文件路径：`src/modules/ai/ai.module.ts`

需要改动 **4 处**：

```typescript
// 1. 顶部 import
import { MyFeatureTool } from './tools/my-feature.tool';

// 2. 如果 Tool 依赖的 Service 来自其他 Module，在 imports 数组里加对应 Module
@Module({
  imports: [TodoModule, UserModule, ScheduleModule, RedisModule, MessageModule, SomeModule],

  // 3. providers 数组里加入 Tool 类
  providers: [
    ...
    MyFeatureTool,
  ],
})

// 4. 构造函数里注入 + 调用 registerTool
export class AiModule {
  constructor(
    aiService: AiService,
    ...
    myFeatureTool: MyFeatureTool,
  ) {
    ...
    (aiService as any).registerTool(myFeatureTool);
  }
}
```

---

## 第三步：更新意图识别提示词（按需）

如果新工具对应一种新的用户意图，需要在 `ai.service.ts` 的意图识别提示词里补充说明。

文件路径：`src/modules/ai/ai.service.ts`，找到 `intentRecognitionChain` 的构建处：

```typescript
'意图类型包括但不限于：\n' +
'1. todo: 用户需要创建待办事项\n' +
'2. chat: 用户只是想聊天\n' +
// ... 在这里追加新意图
'7. my_intent: 用户需要使用新功能\n' +
```

同时，在 `process()` 方法的 `toolIntents` 数组里加入新意图（让它走 Agent 路径）：

```typescript
// ai.service.ts process() 方法
const toolIntents = ['query', 'email', 'agent', 'my_intent'];
```

---

## 当前已注册的 Tools

| Tool 类 | name | 触发意图 | 状态 |
|---|---|---|---|
| `DatabaseQueryTool` | `database_query` | `query` | ✅ 已启用 |
| `CreateReminderTool` | `create_reminder` | `reminder` / `todo` | ✅ 已启用 |
| `WeatherQueryTool` | `weather_query` | `weather` | ✅ 已启用 |
| `SendEmailTool` | `send_email` | `email` | ⏸ 暂时下线（待改造） |

---

## 目录结构参考

```
src/modules/ai/
├── tools/
│   ├── HOW_TO_ADD_TOOL.md       ← 本文档
│   ├── base.tool.ts             ← 抽象基类（可选继承）
│   ├── database-query.tool.ts
│   ├── send-email.tool.ts
│   └── create-reminder.tool.ts
├── intent-handlers/             ← 非 Tool 路径的意图处理器
├── ai.module.ts                 ← Tool 注册入口
└── ai.service.ts                ← 意图识别 + 路由逻辑
```
