# AI 服务增强方案

## 📋 目录

1. [当前架构分析](#当前架构分析)
2. [增强目标](#增强目标)
3. [架构升级方案](#架构升级方案)
4. [新功能集成方案](#新功能集成方案)
5. [实施路线图](#实施路线图)

---

## 当前架构分析

### 现有能力清单

#### ✅ 已实现功能
- **意图识别系统** - 基于 LangChain + DeepSeek 的意图分类
- **插件化架构** - `IntentHandler` 接口 + 注册机制
- **上下文记忆** - Redis 存储的对话历史（支持全局/意图隔离）
- **结构化输出** - Zod schema 约束 AI 输出格式
- **基础意图**:
  - `todo` - 待办事项提取
  - `chat` - 自然对话

#### 🏗️ 架构优势
1. **高扩展性** - 新增意图仅需实现 `IntentHandler` 接口
2. **解耦设计** - 意图识别 → 路由 → 处理，职责明确
3. **状态管理** - Redis 记忆层支持跨意图上下文访问
4. **模型复用** - `AiModelProvider` 单例模式优化性能

#### ⚠️ 当前限制
1. **功能单一** - 仅支持待办和聊天
2. **无外部集成** - 无法访问第三方服务（日历、邮件、文档等）
3. **缺少工具调用** - AI 无法主动执行操作（查询数据库、调用 API）
4. **静态意图** - 意图类型硬编码，无法动态扩展
5. **无插件生态** - 用户无法自定义扩展

---

## 增强目标

### 核心价值主张
> **从"对话助手"升级为"AI 操作系统"**
> 用户通过自然语言，让 AI 调用任意服务和工具完成复杂任务

### 功能矩阵

| 类别 | 现状 | 目标 |
|------|------|------|
| **基础能力** | 待办 + 聊天 | 支持 20+ 工具调用 |
| **集成方式** | 硬编码 | 插件化 + 动态加载 |
| **服务连接** | 无 | 对接主流 SaaS (Slack、Gmail、Calendar) |
| **数据访问** | 仅待办表 | 支持多数据源查询（数据库、API、文件） |
| **用户扩展** | 不支持 | 用户自定义工具和 Webhook |
| **复杂任务** | 单步操作 | 多步推理 + 工具链编排 |

---

## 架构升级方案

### 1. LangChain Tools 集成 ⭐⭐⭐⭐⭐

#### 核心概念
LangChain 的 **Tool Calling** 允许 AI 模型主动调用预定义的函数。

#### 实现方案

**新建 `src/modules/ai/tools/` 目录**

```typescript
// tools/base.tool.ts
import { Tool } from '@langchain/core/tools';
import { z } from 'zod';

export abstract class BaseTool extends Tool {
  // 工具需要的权限
  abstract requiredPermissions: string[];

  // 工具分类（用于 UI 展示和搜索）
  abstract category: 'data' | 'communication' | 'automation' | 'productivity';

  // 工具状态（允许动态启用/禁用）
  protected enabled = true;

  // 速率限制配置
  protected rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };

  async call(input: string): Promise<string> {
    if (!this.enabled) {
      throw new Error(`工具 ${this.name} 已被禁用`);
    }

    // 检查权限
    await this.checkPermissions();

    // 速率限制检查
    await this.checkRateLimit();

    return this._call(input);
  }

  protected abstract _call(input: string): Promise<string>;
  protected abstract checkPermissions(): Promise<void>;
  protected abstract checkRateLimit(): Promise<void>;
}
```

**示例工具实现**

```typescript
// tools/database-query.tool.ts
import { z } from 'zod';
import { BaseTool } from './base.tool';

export class DatabaseQueryTool extends BaseTool {
  name = 'database_query';
  description = '查询待办事项数据库，支持按条件筛选';
  category = 'data' as const;
  requiredPermissions = ['database:read'];

  schema = z.object({
    type: z.enum(['all', 'today', 'urgent', 'by_status']).optional(),
    status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  });

  constructor(private todoService: TodoService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    const params = JSON.parse(input);

    if (params.type === 'today') {
      const todos = await this.todoService.getTodayTodos();
      return JSON.stringify(todos);
    }

    if (params.type === 'urgent') {
      const todos = await this.todoService.getUrgentTodos();
      return JSON.stringify(todos);
    }

    // ... 其他查询逻辑
  }

  protected async checkPermissions(): Promise<void> {
    // 权限检查逻辑
  }

  protected async checkRateLimit(): Promise<void> {
    // 速率限制逻辑
  }
}
```

```typescript
// tools/send-email.tool.ts
export class SendEmailTool extends BaseTool {
  name = 'send_email';
  description = '发送邮件给指定收件人';
  category = 'communication' as const;
  requiredPermissions = ['email:send'];

  schema = z.object({
    to: z.string().email(),
    subject: z.string(),
    content: z.string(),
  });

  constructor(private emailService: EmailService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    const { to, subject, content } = JSON.parse(input);
    await this.emailService.sendMail(to, subject, content);
    return `邮件已成功发送到 ${to}`;
  }

  protected async checkPermissions(): Promise<void> {
    // 检查用户是否有发送邮件权限
  }

  protected async checkRateLimit(): Promise<void> {
    // 防止邮件轰炸
  }
}
```

**改造 AI Service**

```typescript
// ai.service.ts
@Injectable()
export class AiService {
  private tools: Map<string, BaseTool> = new Map();

  registerTool(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  async processWithTools(inputData: InputData): Promise<ProcessedResult> {
    const model = this.aiModelProvider.getModel(0.7);

    // 将工具绑定到模型
    const modelWithTools = model.bindTools(Array.from(this.tools.values()));

    const response = await modelWithTools.invoke(inputData.input);

    // 如果 AI 决定调用工具
    if (response.tool_calls && response.tool_calls.length > 0) {
      const results = [];

      for (const toolCall of response.tool_calls) {
        const tool = this.tools.get(toolCall.name);
        if (tool) {
          const result = await tool.call(JSON.stringify(toolCall.args));
          results.push(result);
        }
      }

      // 将工具执行结果反馈给 AI，生成最终回复
      const finalResponse = await model.invoke({
        input: inputData.input,
        toolResults: results,
      });

      return {
        output: finalResponse.content,
        intent: 'tool_call',
        data: { toolCalls: response.tool_calls, results },
      };
    }

    // 无工具调用，直接返回 AI 回复
    return {
      output: response.content,
      intent: 'chat',
    };
  }
}
```

#### 推荐优先实现的工具

| 工具名称 | 功能 | 优先级 |
|----------|------|--------|
| `database_query` | 查询待办、聊天历史 | P0 ⭐⭐⭐⭐⭐ |
| `send_email` | 发送邮件 | P0 ⭐⭐⭐⭐⭐ |
| `create_reminder` | 设置提醒 | P0 ⭐⭐⭐⭐⭐ |
| `web_search` | 网页搜索（接入 SerpAPI） | P1 ⭐⭐⭐⭐ |
| `get_weather` | 查询天气 | P1 ⭐⭐⭐⭐ |
| `calendar_event` | 日历事件管理 | P1 ⭐⭐⭐⭐ |
| `file_read` | 读取用户文件 | P2 ⭐⭐⭐ |
| `code_execute` | 执行代码片段（沙箱） | P2 ⭐⭐⭐ |

---

### 2. 插件系统 ⭐⭐⭐⭐

#### 目标
允许用户和开发者动态加载自定义工具，无需修改核心代码。

#### 架构设计

```typescript
// plugins/plugin.interface.ts
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  requiredPermissions: string[];
  dependencies?: string[];
}

export interface Plugin {
  metadata: PluginMetadata;
  onLoad(context: PluginContext): Promise<void>;
  onUnload(): Promise<void>;
  getTools(): BaseTool[];
}

export interface PluginContext {
  logger: Logger;
  config: ConfigService;
  database: DataSource;
  redis: Redis;
}
```

```typescript
// plugins/plugin-loader.service.ts
@Injectable()
export class PluginLoaderService {
  private loadedPlugins: Map<string, Plugin> = new Map();

  async loadPlugin(pluginPath: string): Promise<void> {
    // 动态导入插件模块
    const pluginModule = await import(pluginPath);
    const plugin: Plugin = new pluginModule.default();

    // 验证插件元数据
    this.validatePlugin(plugin);

    // 初始化插件
    await plugin.onLoad({
      logger: this.logger,
      config: this.config,
      database: this.dataSource,
      redis: this.redis,
    });

    // 注册插件提供的工具
    const tools = plugin.getTools();
    for (const tool of tools) {
      this.aiService.registerTool(tool);
    }

    this.loadedPlugins.set(plugin.metadata.id, plugin);
    this.logger.log(`✅ 插件已加载: ${plugin.metadata.name}`);
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (plugin) {
      await plugin.onUnload();
      // 移除工具注册
      this.loadedPlugins.delete(pluginId);
      this.logger.log(`🗑️ 插件已卸载: ${plugin.metadata.name}`);
    }
  }

  listPlugins(): PluginMetadata[] {
    return Array.from(this.loadedPlugins.values()).map(p => p.metadata);
  }
}
```

**插件示例：Slack 集成**

```typescript
// plugins/slack-plugin/index.ts
import { Plugin, PluginMetadata, PluginContext } from '../plugin.interface';
import { SlackTool } from './slack.tool';

export default class SlackPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: 'slack-integration',
    name: 'Slack 集成',
    version: '1.0.0',
    author: 'Todor Team',
    description: '发送消息到 Slack 频道',
    requiredPermissions: ['network:http'],
  };

  private slackTool: SlackTool;

  async onLoad(context: PluginContext): Promise<void> {
    const slackToken = context.config.get('SLACK_BOT_TOKEN');
    this.slackTool = new SlackTool(slackToken);
    context.logger.log('Slack 插件已初始化');
  }

  async onUnload(): Promise<void> {
    // 清理资源
  }

  getTools(): BaseTool[] {
    return [this.slackTool];
  }
}
```

---

### 3. 第三方服务集成 ⭐⭐⭐⭐

#### 推荐集成服务

**生产力工具**
- **Google Calendar** - 日历事件管理
- **Notion** - 笔记和文档管理
- **Trello** - 项目看板

**通信工具**
- **Slack** - 团队消息
- **Gmail API** - 邮件管理
- **Microsoft Teams** - 企业通信

**数据服务**
- **OpenWeatherMap** - 天气数据
- **Google Maps API** - 地图和位置服务
- **NewsAPI** - 新闻聚合

#### 实现示例：Google Calendar

```typescript
// integrations/google-calendar.service.ts
import { google } from 'googleapis';

@Injectable()
export class GoogleCalendarService {
  private calendar;

  constructor(private config: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.get('GOOGLE_CREDENTIALS_PATH'),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createEvent(summary: string, start: Date, end: Date): Promise<string> {
    const event = {
      summary,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data.id;
  }

  async listEvents(timeMin: Date, timeMax: Date): Promise<any[]> {
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  }
}
```

```typescript
// tools/calendar.tool.ts
export class CalendarTool extends BaseTool {
  name = 'manage_calendar';
  description = '管理 Google 日历事件（创建、查询、更新、删除）';
  category = 'productivity' as const;
  requiredPermissions = ['calendar:read', 'calendar:write'];

  schema = z.object({
    action: z.enum(['create', 'list', 'update', 'delete']),
    summary: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    eventId: z.string().optional(),
  });

  constructor(private calendarService: GoogleCalendarService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    const params = JSON.parse(input);

    switch (params.action) {
      case 'create':
        const eventId = await this.calendarService.createEvent(
          params.summary,
          new Date(params.start),
          new Date(params.end),
        );
        return `日历事件已创建，ID: ${eventId}`;

      case 'list':
        const events = await this.calendarService.listEvents(
          new Date(params.start),
          new Date(params.end),
        );
        return JSON.stringify(events);

      // ... 其他操作
    }
  }
}
```

---

### 4. 多模型支持 ⭐⭐⭐

#### 目标
支持切换不同的 LLM 模型，针对不同场景优化。

#### 实现方案

```typescript
// ai-model.provider.ts (增强版)
export enum ModelType {
  DEEPSEEK = 'deepseek',
  GPT4 = 'gpt-4',
  CLAUDE = 'claude-3',
  LLAMA = 'llama-3',
}

@Injectable()
export class AiModelProvider {
  private models: Map<ModelType, any> = new Map();

  constructor(private config: ConfigService) {
    this.initializeModels();
  }

  private initializeModels(): void {
    // DeepSeek (默认)
    this.models.set(ModelType.DEEPSEEK, new ChatDeepSeek({
      apiKey: this.config.get('DEEPSEEK_API_KEY'),
    }));

    // OpenAI GPT-4 (高质量推理)
    if (this.config.get('OPENAI_API_KEY')) {
      this.models.set(ModelType.GPT4, new ChatOpenAI({
        apiKey: this.config.get('OPENAI_API_KEY'),
        modelName: 'gpt-4-turbo',
      }));
    }

    // Anthropic Claude (长文本分析)
    if (this.config.get('ANTHROPIC_API_KEY')) {
      this.models.set(ModelType.CLAUDE, new ChatAnthropic({
        apiKey: this.config.get('ANTHROPIC_API_KEY'),
        modelName: 'claude-3-sonnet',
      }));
    }
  }

  getModel(
    type: ModelType = ModelType.DEEPSEEK,
    temperature?: number,
  ): any {
    const model = this.models.get(type);
    if (!model) {
      throw new Error(`模型 ${type} 未配置`);
    }

    if (temperature !== undefined) {
      return model.bind({ temperature });
    }

    return model;
  }

  // 智能选择模型
  selectBestModel(task: 'chat' | 'coding' | 'analysis' | 'translation'): any {
    switch (task) {
      case 'coding':
        return this.getModel(ModelType.DEEPSEEK); // DeepSeek 擅长代码
      case 'analysis':
        return this.getModel(ModelType.CLAUDE); // Claude 擅长长文本
      case 'chat':
        return this.getModel(ModelType.GPT4); // GPT-4 对话质量高
      default:
        return this.getModel(ModelType.DEEPSEEK);
    }
  }
}
```

---

### 5. RAG (检索增强生成) ⭐⭐⭐

#### 目标
让 AI 能够访问外部知识库（用户文档、公司知识库、历史对话等）。

#### 实现方案

```typescript
// rag/vector-store.service.ts
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class VectorStoreService {
  private vectorStore: PineconeStore;

  async initialize(): Promise<void> {
    const pinecone = new Pinecone({
      apiKey: this.config.get('PINECONE_API_KEY'),
    });

    const index = pinecone.Index(this.config.get('PINECONE_INDEX'));

    this.vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex: index },
    );
  }

  async addDocuments(documents: string[]): Promise<void> {
    await this.vectorStore.addDocuments(
      documents.map(text => ({ pageContent: text, metadata: {} })),
    );
  }

  async search(query: string, k: number = 5): Promise<string[]> {
    const results = await this.vectorStore.similaritySearch(query, k);
    return results.map(doc => doc.pageContent);
  }
}
```

```typescript
// tools/knowledge-search.tool.ts
export class KnowledgeSearchTool extends BaseTool {
  name = 'search_knowledge';
  description = '搜索用户的知识库和历史文档';
  category = 'data' as const;
  requiredPermissions = ['knowledge:read'];

  schema = z.object({
    query: z.string(),
    limit: z.number().optional().default(5),
  });

  constructor(private vectorStore: VectorStoreService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    const { query, limit } = JSON.parse(input);
    const results = await this.vectorStore.search(query, limit);
    return JSON.stringify(results);
  }
}
```

---

### 6. 多步任务编排 (Agent Executor) ⭐⭐⭐⭐

#### 目标
允许 AI 将复杂任务分解为多步骤，依次调用多个工具。

#### 实现方案

```typescript
// ai.service.ts (增强版)
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';

@Injectable()
export class AiService {
  async executeComplexTask(inputData: InputData): Promise<ProcessedResult> {
    const model = this.aiModelProvider.getModel(0.7);
    const tools = Array.from(this.tools.values());

    // 创建 Agent
    const agent = await createToolCallingAgent({
      llm: model,
      tools,
      prompt: this.buildAgentPrompt(),
    });

    // 创建 Executor
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 10, // 最多执行 10 步
      verbose: true,
    });

    // 执行任务
    const result = await executor.invoke({
      input: inputData.input,
    });

    return {
      output: result.output,
      intent: 'complex_task',
      data: {
        steps: result.intermediateSteps,
        toolsUsed: result.toolsUsed,
      },
    };
  }

  private buildAgentPrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      ['system', `你是 Todor AI 助手。你可以使用以下工具完成用户任务：

可用工具：
{tools}

思考步骤：
1. 理解用户需求
2. 确定需要调用哪些工具
3. 按顺序执行工具调用
4. 总结结果并回复用户

如果任务需要多个步骤，请逐步完成。`],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
  }
}
```

**示例场景**：
```
用户："帮我安排明天下午 3 点的会议，并通过邮件通知 alice@example.com"

AI 执行流程：
1. 调用 calendar.tool → 创建日历事件 (返回 eventId)
2. 调用 send_email.tool → 发送邮件 (参数: to=alice@example.com, 内容包含会议详情)
3. 返回结果："✅ 已安排会议并发送邮件通知"
```

---

## 新功能集成方案

### Phase 1: 基础工具集 (2 周)

#### 目标
实现核心工具调用能力，支持数据库查询和基础操作。

#### 任务清单
- [ ] 实现 `BaseTool` 抽象类
- [ ] 实现 `database_query` 工具
- [ ] 实现 `send_email` 工具
- [ ] 实现 `create_reminder` 工具
- [ ] 修改 `AiService` 支持工具绑定
- [ ] 添加工具调用日志和监控

#### 代码文件
```
src/modules/ai/
├── tools/
│   ├── base.tool.ts
│   ├── database-query.tool.ts
│   ├── send-email.tool.ts
│   └── create-reminder.tool.ts
├── ai.service.ts (修改)
└── ai.module.ts (注册工具)
```

---

### Phase 2: 外部集成 (3 周)

#### 目标
接入主流第三方服务 API。

#### 任务清单
- [ ] 实现 Google Calendar 集成
- [ ] 实现 Slack 集成
- [ ] 实现天气查询 (OpenWeatherMap)
- [ ] 实现网页搜索 (SerpAPI)
- [ ] 添加 OAuth 认证流程

#### 代码文件
```
src/modules/integrations/
├── google-calendar/
│   ├── google-calendar.service.ts
│   └── google-calendar.module.ts
├── slack/
│   ├── slack.service.ts
│   └── slack.module.ts
└── weather/
    ├── weather.service.ts
    └── weather.module.ts

src/modules/ai/tools/
├── calendar.tool.ts
├── slack.tool.ts
├── weather.tool.ts
└── web-search.tool.ts
```

---

### Phase 3: 插件系统 (3 周)

#### 目标
支持动态加载用户自定义插件。

#### 任务清单
- [ ] 设计插件接口
- [ ] 实现 `PluginLoaderService`
- [ ] 实现插件沙箱环境
- [ ] 实现插件权限管理
- [ ] 创建插件市场 API
- [ ] 编写插件开发文档

#### 代码文件
```
src/modules/plugins/
├── plugin.interface.ts
├── plugin-loader.service.ts
├── plugin-registry.service.ts
├── plugin-sandbox.service.ts
└── plugins-market.controller.ts

plugins/
├── example-plugin/
│   ├── package.json
│   ├── index.ts
│   └── README.md
└── slack-plugin/
    └── ... (参考上文)
```

---

### Phase 4: RAG 和多模型 (2 周)

#### 目标
增强 AI 知识能力和模型选择灵活性。

#### 任务清单
- [ ] 集成向量数据库 (Pinecone 或 Qdrant)
- [ ] 实现文档嵌入和检索
- [ ] 支持 GPT-4、Claude 等多模型
- [ ] 实现智能模型路由
- [ ] 添加知识库管理 API

#### 代码文件
```
src/modules/ai/
├── rag/
│   ├── vector-store.service.ts
│   ├── embeddings.service.ts
│   └── document-loader.service.ts
├── ai-model.provider.ts (增强)
└── tools/
    └── knowledge-search.tool.ts

src/modules/knowledge/
├── knowledge.controller.ts
├── knowledge.service.ts
└── entities/
    └── document.entity.ts
```

---

### Phase 5: 多步任务编排 (2 周)

#### 目标
支持 AI 自主规划和执行复杂任务。

#### 任务清单
- [ ] 集成 LangChain Agent Executor
- [ ] 实现任务分解和执行
- [ ] 添加执行步骤可视化
- [ ] 实现错误恢复机制
- [ ] 添加任务执行日志

#### 代码文件
```
src/modules/ai/
├── ai.service.ts (增强)
├── agents/
│   ├── agent-executor.service.ts
│   ├── task-planner.service.ts
│   └── execution-logger.service.ts
└── tools/
    └── ... (所有工具)
```

---

## 实施路线图

### 总体时间线：12 周 (3 个月)

```
Week 1-2:   Phase 1 - 基础工具集
Week 3-5:   Phase 2 - 外部集成
Week 6-8:   Phase 3 - 插件系统
Week 9-10:  Phase 4 - RAG 和多模型
Week 11-12: Phase 5 - 多步任务编排
```

### 里程碑

#### Milestone 1: MVP 工具调用 (Week 2)
- ✅ AI 能调用数据库查询、发送邮件、设置提醒
- ✅ 工具调用日志完善
- 📊 **KPI**: 支持 3 个基础工具

#### Milestone 2: 第三方集成 (Week 5)
- ✅ 对接 Google Calendar、Slack、天气 API
- ✅ OAuth 认证流程完善
- 📊 **KPI**: 支持 7+ 工具，集成 3+ 第三方服务

#### Milestone 3: 插件生态 (Week 8)
- ✅ 用户可自定义插件
- ✅ 插件市场上线
- 📊 **KPI**: 提供 5+ 官方插件，支持用户上传

#### Milestone 4: 智能增强 (Week 10)
- ✅ RAG 知识库搜索
- ✅ 多模型智能路由
- 📊 **KPI**: 支持 3+ LLM 模型，知识库检索准确率 > 80%

#### Milestone 5: 任务编排 (Week 12)
- ✅ 复杂多步任务自动执行
- ✅ 执行步骤可视化
- 📊 **KPI**: 支持 5+ 步骤的任务链，成功率 > 90%

---

## 技术栈补充

### 新增依赖

```json
{
  "dependencies": {
    // LangChain 生态
    "@langchain/core": "^0.2.0",
    "@langchain/openai": "^0.2.0",
    "@langchain/anthropic": "^0.2.0",
    "@langchain/community": "^0.2.0",
    "langchain": "^0.2.0",

    // 向量数据库
    "@pinecone-database/pinecone": "^3.0.0",
    "qdrant-client": "^1.10.0",

    // 外部服务 SDK
    "googleapis": "^140.0.0",
    "@slack/web-api": "^7.0.0",
    "openweathermap-ts": "^1.2.7",
    "serpapi": "^2.1.0",

    // 工具和插件
    "vm2": "^3.9.19", // 沙箱执行
    "ajv": "^8.12.0", // JSON Schema 验证
    "express-rate-limit": "^7.2.0"
  }
}
```

---

## 监控和性能

### 关键指标

| 指标 | 目标 | 监控方式 |
|------|------|----------|
| 工具调用成功率 | > 95% | 日志统计 |
| 平均响应时间 | < 2s | APM 监控 |
| 插件加载时间 | < 500ms | 性能分析 |
| 知识库检索准确率 | > 80% | 人工抽查 |
| Agent 任务完成率 | > 90% | 执行日志 |

### 日志增强

```typescript
// 工具调用日志
logger.log({
  event: 'tool_call',
  toolName: 'send_email',
  userId: user.id,
  input: { to: 'alice@example.com' },
  duration: 150,
  success: true,
});

// Agent 执行日志
logger.log({
  event: 'agent_execution',
  userId: user.id,
  task: '安排会议并发送邮件',
  steps: [
    { tool: 'calendar', result: 'success', duration: 120 },
    { tool: 'send_email', result: 'success', duration: 80 },
  ],
  totalDuration: 200,
  success: true,
});
```

---

## 安全考虑

### 权限管理

```typescript
// entities/user-permission.entity.ts
@Entity()
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  permission: string; // 例如: 'email:send', 'database:write'

  @Column({ type: 'json', nullable: true })
  constraints: Record<string, any>; // 例如: { maxEmailsPerDay: 100 }
}
```

### 速率限制

```typescript
// tools/base.tool.ts (增强)
protected async checkRateLimit(): Promise<void> {
  if (!this.rateLimit) return;

  const key = `ratelimit:${this.name}:${this.userId}`;
  const count = await this.redis.incr(key);

  if (count === 1) {
    await this.redis.expire(key, this.rateLimit.windowMs / 1000);
  }

  if (count > this.rateLimit.maxCalls) {
    throw new Error(`速率限制：${this.name} 每 ${this.rateLimit.windowMs}ms 最多调用 ${this.rateLimit.maxCalls} 次`);
  }
}
```

### 数据隐私

- 敏感数据加密存储
- 工具调用审计日志
- 用户授权管理（OAuth Consent）

---

## 用户体验增强

### 前端 UI 改进

#### 工具调用可视化

```typescript
// 前端显示工具调用过程
{
  message: "帮我安排明天下午3点的会议",
  toolCalls: [
    {
      tool: "calendar",
      status: "loading",
      description: "正在创建日历事件..."
    },
    {
      tool: "send_email",
      status: "pending",
      description: "等待发送邮件"
    }
  ]
}
```

#### 插件市场 UI

```
+----------------------------------+
| 插件市场                         |
+----------------------------------+
| 🔍 搜索插件...                   |
+----------------------------------+
| [官方]                           |
| 📅 Google Calendar               |
| 💬 Slack 集成                    |
| 🌤️ 天气查询                      |
+----------------------------------+
| [社区]                           |
| 📝 Notion 同步                   |
| 🗓️ Trello 看板                   |
| 📊 数据分析助手                   |
+----------------------------------+
```

---

## 成功案例预测

### 用户场景 1：智能日程管理

**用户输入**:
> "帮我安排本周五下午 2 点和 Alice 开会讨论 Q2 计划，会议时长 1 小时，并提前 15 分钟提醒我"

**AI 执行**:
1. 调用 `calendar.tool` 创建事件
2. 调用 `send_email.tool` 通知 Alice
3. 调用 `create_reminder.tool` 设置提醒

**输出**:
> "✅ 已完成：
> - 📅 会议已创建：2026-02-07 14:00-15:00
> - 📧 邮件已发送到 alice@example.com
> - ⏰ 提醒已设置：13:45"

---

### 用户场景 2：知识库查询

**用户输入**:
> "我之前记录的关于 Redis 分布式锁的笔记在哪？"

**AI 执行**:
1. 调用 `knowledge_search.tool` 搜索向量数据库
2. 返回相关文档片段

**输出**:
> "找到以下笔记：
> 📝 《Redis 分布式锁最佳实践》(2026-01-15)
> - 使用 SET NX EX 命令
> - 注意锁超时处理
> - 推荐使用 Redlock 算法
> [查看完整笔记]"

---

### 用户场景 3：复杂任务编排

**用户输入**:
> "总结我本周的待办完成情况，生成周报并发送给我的邮箱"

**AI 执行**:
1. 调用 `database_query.tool` 查询本周待办
2. 分析数据生成周报
3. 调用 `send_email.tool` 发送邮件

**输出**:
> "📊 本周总结：
> - 已完成：12 项
> - 进行中：3 项
> - 完成率：80%
>
> 详细周报已发送到 your@email.com"

---

## 总结

### 核心优势

1. **架构优雅** - 基于现有 IntentHandler 无缝扩展
2. **高度可扩展** - 插件系统支持无限功能
3. **用户友好** - 自然语言即可调用所有工具
4. **生态丰富** - 对接主流 SaaS 服务
5. **智能编排** - AI 自主规划多步任务

### 竞争壁垒

- ✅ **对话式 UI** - 比传统 GUI 更高效
- ✅ **上下文记忆** - 跨意图理解用户需求
- ✅ **工具生态** - 20+ 工具开箱即用
- ✅ **插件市场** - 社区驱动持续增长

### 下一步行动

1. ✅ **审查本方案** - 确认技术可行性
2. 📝 **启动 Phase 1** - 实现基础工具集
3. 🚀 **迭代发布** - 每 2 周发布一个 Phase
4. 📣 **用户测试** - 收集反馈持续优化

---

**文档版本**: v1.0
**最后更新**: 2026-02-03
**负责人**: Todor Team
