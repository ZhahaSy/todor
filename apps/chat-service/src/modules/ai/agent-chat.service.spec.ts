import { AIMessageChunk } from '@langchain/core/messages';
import { AgentChatService } from './agent-chat.service';
import type { InputData } from './ai.service';

/**
 * AgentChatService 的流式工具循环测试。
 * 只 mock model 与 Redis，真实跑循环：累积 chunk → 检测 tool_calls → 执行工具 → 再流式。
 */
describe('AgentChatService', () => {
  // 内存版 Redis（覆盖 RedisChatMemory 用到的方法）
  const store: Record<string, string[]> = {};
  const fakeRedisClient = {
    lrange: async (key: string, start: number, end: number) => {
      const list = store[key] ?? [];
      const len = list.length;
      const s = start < 0 ? Math.max(len + start, 0) : start;
      const e = end < 0 ? len + end : end;
      return list.slice(s, e + 1);
    },
    rpush: async (key: string, val: string) => {
      store[key] = store[key] ?? [];
      store[key].push(val);
      return store[key].length;
    },
    expire: async () => 1,
    ltrim: async () => 'OK',
  };
  const redisService = { getClient: () => fakeRedisClient } as any;
  const skillService = { findEnabled: async () => [] } as any;

  // 工具桩：bindUser 返回带可断言 name 的简单工具
  const makeToolStub = (name: string, result: string) => ({
    bindUser: () => ({
      name,
      invoke: jest.fn(async () => result),
    }),
  });

  const inputData: InputData = {
    input: '今天北京天气怎么样',
    userInfo: {
      id: 'u1',
      name: 'Tom',
      email: 'tom@example.com',
      age: 30,
      gender: 'male',
      hobby: 'coding',
    } as any,
  };

  // 把字符串切成单字 chunk，模拟 token 流
  async function* textChunks(text: string) {
    for (const ch of [...text]) {
      yield new AIMessageChunk({ content: ch });
    }
  }
  async function* toolCallChunk(name: string, args: object) {
    yield new AIMessageChunk({
      content: '',
      tool_call_chunks: [
        { name, args: JSON.stringify(args), id: 'call_1', index: 0 },
      ],
    });
  }

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  function buildService(modelStream: (msgs: any) => AsyncGenerator<any>) {
    const fakeModel = {
      bindTools: () => fakeModel,
      stream: (msgs: any) => modelStream(msgs),
    };
    const aiModelProvider = { getModel: () => fakeModel } as any;
    const weather = makeToolStub('weather_query', '📍 北京 晴 25°C');
    const db = makeToolStub('database_query', '无待办');
    const reminder = makeToolStub('create_reminder', '✅ 待办已创建');
    const saveMem = makeToolStub('save_memory', '✅ 已记住');
    const recallMem = makeToolStub('recall_memory', '查到 1 条记忆');
    const deleteMem = makeToolStub('delete_memory', '✅ 已忘记');
    return new AgentChatService(
      aiModelProvider,
      redisService,
      skillService,
      weather as any,
      db as any,
      reminder as any,
      saveMem as any,
      recallMem as any,
      deleteMem as any,
    );
  }

  async function drain(gen: AsyncGenerator<any, any>) {
    const tokens: string[] = [];
    const toolCalls: { name: string; args: unknown }[] = [];
    let step = await gen.next();
    while (!step.done) {
      const ev = step.value;
      if (ev.type === 'token') tokens.push(ev.text);
      else if (ev.type === 'tool_call')
        toolCalls.push({ name: ev.name, args: ev.args });
      step = await gen.next();
    }
    // return 值是 RunTrace
    const trace = step.value;
    return { tokens, toolCalls, trace, final: trace.finalText as string };
  }

  it('纯聊天：模型不调工具，第一轮直接流式输出', async () => {
    const svc = buildService(() => textChunks('你好呀'));
    const { tokens, final } = await drain(svc.stream(inputData));
    expect(tokens.join('')).toBe('你好呀');
    expect(final).toBe('你好呀');
    // 已写入全局记忆（human + ai 两条）
    expect(store['memory:user:u1:global:history']?.length).toBe(2);
  });

  it('调一次工具后，把结果喂回并流式输出最终回复', async () => {
    let round = 0;
    const svc = buildService(() => {
      round += 1;
      return round === 1
        ? toolCallChunk('weather_query', { city: '北京' })
        : textChunks('北京今天晴，25度');
    });
    const { tokens, final } = await drain(svc.stream(inputData));
    expect(round).toBe(2); // 第一轮工具，第二轮文本
    expect(final).toBe('北京今天晴，25度');
    expect(tokens.join('')).toBe('北京今天晴，25度');
  });

  it('工具执行结果会进入第二轮的消息上下文', async () => {
    const seenMessages: any[][] = [];
    let round = 0;
    const svc = buildService((msgs: any) => {
      seenMessages.push(msgs);
      round += 1;
      return round === 1
        ? toolCallChunk('weather_query', { city: '北京' })
        : textChunks('好的');
    });
    await drain(svc.stream(inputData));

    // 第二轮的消息里应包含工具返回内容
    const secondRound = seenMessages[1];
    const hasToolResult = secondRound.some(
      (m: any) =>
        typeof m?.content === 'string' && m.content.includes('北京 晴 25°C'),
    );
    expect(hasToolResult).toBe(true);
  });

  it('RunTrace 记录工具调用：名称、入参、成功标记、迭代轮数', async () => {
    let round = 0;
    const svc = buildService(() => {
      round += 1;
      return round === 1
        ? toolCallChunk('weather_query', { city: '北京' })
        : textChunks('晴');
    });
    const { toolCalls, trace } = await drain(svc.stream(inputData));

    // 事件流里捕获到一次工具调用
    expect(toolCalls).toEqual([
      { name: 'weather_query', args: { city: '北京' } },
    ]);
    // RunTrace 里完整记录了该次调用
    expect(trace.toolCalls).toHaveLength(1);
    expect(trace.toolCalls[0]).toMatchObject({
      name: 'weather_query',
      args: { city: '北京' },
      ok: true,
    });
    expect(trace.toolCalls[0].result).toContain('北京 晴 25°C');
    // 两轮：第一轮工具，第二轮文本
    expect(trace.iterations).toBe(2);
    expect(typeof trace.totalMs).toBe('number');
  });
});
