import { AiService, ProcessedResult } from './ai.service';

/**
 * 验证后端统一持久化：流式回复完成后写入 user + ai 两条 ChatHistory。
 * 修复了过去 AI 回复仅靠前端 onDone 写库、断流即丢失的问题。
 */
describe('AiService.handlePostProcess persistence', () => {
  let created: any[];
  let chatHistoryService: any;
  let service: AiService;

  beforeEach(() => {
    created = [];
    chatHistoryService = {
      create: jest.fn(async (dto: any) => {
        created.push(dto);
        return dto;
      }),
      // 默认无历史 → 首条
      findAll: jest.fn(async () => ({ list: [], total: 0 })),
    };
    service = new AiService(
      {} as any, // configService
      {} as any, // agentChatService
      {} as any, // deepDiveIntentHandler
      chatHistoryService,
      {} as any, // memoryExtractor
      {} as any, // memoryService
    );
  });

  const agentResult: ProcessedResult = { output: 'AI 回复', intent: 'agent' };

  it('主对话：以用户名为 sessionId 落库 user + ai 两条', async () => {
    await service.handlePostProcess(
      agentResult,
      '你好',
      'user-1',
      'a@b.com',
      'Tom',
    );

    expect(chatHistoryService.create).toHaveBeenCalledTimes(2);
    const [userMsg, aiMsg] = created;
    expect(userMsg).toMatchObject({
      content: '你好',
      role: 'local',
      sessionId: 'Tom',
      userId: 'user-1',
    });
    expect(aiMsg).toMatchObject({
      content: 'AI 回复',
      role: 'ai',
      sessionId: 'Tom',
      userId: 'user-1',
    });
    // 主对话不带 title
    expect(userMsg.title).toBeUndefined();
  });

  it('deepdive：以无前缀会话 id 落库，首条带 title', async () => {
    const ddResult: ProcessedResult = { output: '深入回复', intent: 'deepdive' };
    await service.handlePostProcess(
      ddResult,
      '深入讨论一下 Redis 锁的实现细节',
      'user-1',
      'a@b.com',
      'Tom',
      'sess-abc',
    );

    expect(chatHistoryService.create).toHaveBeenCalledTimes(2);
    const [userMsg, aiMsg] = created;
    // 关键：sessionId 必须是无 deepdive: 前缀的裸 id（与前端 loadSession 读路径一致）
    expect(userMsg.sessionId).toBe('sess-abc');
    expect(aiMsg.sessionId).toBe('sess-abc');
    expect(userMsg.title).toBe('深入讨论一下 Redis 锁的实现细节'.slice(0, 30));
  });

  it('deepdive 非首条：不再生成 title', async () => {
    chatHistoryService.findAll = jest.fn(async () => ({
      list: [{}],
      total: 2,
    }));
    const ddResult: ProcessedResult = { output: '继续', intent: 'deepdive' };
    await service.handlePostProcess(
      ddResult,
      '第二轮提问',
      'user-1',
      'a@b.com',
      'Tom',
      'sess-abc',
    );
    const [userMsg] = created;
    expect(userMsg.title).toBeUndefined();
  });
});

/**
 * 验证 autoExtractMemory 的 confidence 驱动写入：
 * stated 才存，inferred / routeToUserField 命中 / 抽取失败都不写库。
 */
describe('AiService.autoExtractMemory（confidence 驱动）', () => {
  let stored: any[];
  let memoryService: any;
  const buildService = (extractResult: any) => {
    stored = [];
    memoryService = {
      create: jest.fn(async (m: any) => stored.push(m)),
      hasSimilarActive: jest.fn(async () => false),
    };
    const extractor = {
      extract: jest.fn(async () =>
        extractResult instanceof Error
          ? Promise.reject(extractResult)
          : extractResult,
      ),
    };
    return new AiService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      extractor as any,
      memoryService as any,
    );
  };

  const fact = (over: any) => ({
    value: 'high',
    confidence: 'stated',
    category: 'health',
    subject: 'self',
    temporality: 'permanent',
    sensitivity: 'normal',
    content: '对花生过敏',
    source: 'x',
    routeToUserField: null,
    ...over,
  });

  it('stated：写入 user_memory', async () => {
    const svc = buildService([fact({})]);
    await svc.autoExtractMemory('我对花生过敏', 'u1');
    expect(stored).toHaveLength(1);
    expect(stored[0].content).toBe('对花生过敏');
    expect(stored[0].userId).toBe('u1');
  });

  it('inferred：跳过不写（留二次确认）', async () => {
    const svc = buildService([fact({ confidence: 'inferred' })]);
    await svc.autoExtractMemory('他好像不爱加班', 'u1');
    expect(stored).toHaveLength(0);
  });

  it('routeToUserField 命中：本期跳过', async () => {
    const svc = buildService([fact({ routeToUserField: 'job' })]);
    await svc.autoExtractMemory('我是程序员', 'u1');
    expect(stored).toHaveLength(0);
  });

  it('空数组：不写', async () => {
    const svc = buildService([]);
    await svc.autoExtractMemory('今天好累', 'u1');
    expect(stored).toHaveLength(0);
  });

  it('多事实：只写 stated 的那条', async () => {
    const svc = buildService([
      fact({ content: 'A', confidence: 'stated' }),
      fact({ content: 'B', confidence: 'inferred' }),
    ]);
    await svc.autoExtractMemory('...', 'u1');
    expect(stored.map((s) => s.content)).toEqual(['A']);
  });

  it('抽取器抛错：不崩、不写', async () => {
    const svc = buildService(new Error('boom'));
    await expect(svc.autoExtractMemory('x', 'u1')).resolves.toBeUndefined();
    expect(stored).toHaveLength(0);
  });

  it('已有相似记忆：跳过不重复写（防双写）', async () => {
    const svc = buildService([fact({})]);
    memoryService.hasSimilarActive = jest.fn(async () => true);
    await svc.autoExtractMemory('我对花生过敏', 'u1');
    expect(stored).toHaveLength(0);
  });
});
