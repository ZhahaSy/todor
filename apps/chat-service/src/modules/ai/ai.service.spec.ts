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
