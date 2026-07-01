import { ForbiddenException } from '@nestjs/common';
import { MemoryService } from './memory.service';

/**
 * MemoryService 单测：归属鉴权 + 路 C 召回去重 + 显式删除。
 * 内存版 repository 桩（仿 todo.service.spec 范式）。
 */
describe('MemoryService', () => {
  let rows: any[];
  let repo: any;
  let service: MemoryService;

  beforeEach(() => {
    rows = [];
    repo = {
      create: (dto: any) => ({ id: `m${rows.length + 1}`, ...dto }),
      save: async (m: any) => {
        const idx = rows.findIndex((r) => r.id === m.id);
        if (idx >= 0) rows[idx] = m;
        else rows.push(m);
        return m;
      },
      find: jest.fn(async ({ where }: any) =>
        rows.filter(
          (r) =>
            (where.userId === undefined || r.userId === where.userId) &&
            (where.status === undefined || r.status === where.status),
        ),
      ),
      findOne: jest.fn(async ({ where }: any) =>
        rows.find((r) => r.id === where.id) ?? null,
      ),
      // 链式 query builder 桩：累积过滤条件，getMany 返回排序后的结果
      createQueryBuilder: () => {
        let filtered = [...rows];
        const qb: any = {
          where: (_c: string, p: any) => {
            filtered = filtered.filter((r) => r.userId === p.userId);
            return qb;
          },
          andWhere: (clause: string, p: any) => {
            if (clause.includes('status')) {
              filtered = filtered.filter((r) => r.status === p.status);
            } else if (clause.includes('category')) {
              filtered = filtered.filter((r) => r.category === p.category);
            } else if (clause.includes('LIKE')) {
              const kw = p.kw.replace(/%/g, '');
              filtered = filtered.filter((r) => r.content.includes(kw));
            }
            return qb;
          },
          orderBy: () => {
            filtered.sort((a, b) => b.createdAt - a.createdAt);
            return qb;
          },
          getMany: async () => filtered,
        };
        return qb;
      },
    };
    service = new MemoryService(repo);
  });

  it('create：写入一条 active 记忆，默认值正确', async () => {
    const m = await service.create({
      userId: 'alice',
      content: '对花生过敏',
      category: 'health',
    });
    expect(m.status).toBe('active');
    expect(m.subject).toBe('self');
    expect(m.confidence).toBe('stated');
    expect(rows).toHaveLength(1);
  });

  it('recall：只返回本人的、active 的记忆', async () => {
    rows = [
      { id: 'm1', userId: 'alice', content: 'A1', category: 'health', subject: 'self', status: 'active', createdAt: 1 },
      { id: 'm2', userId: 'bob', content: 'B1', category: 'health', subject: 'self', status: 'active', createdAt: 2 },
      { id: 'm3', userId: 'alice', content: 'A2已删', category: 'goal', subject: 'self', status: 'deleted', createdAt: 3 },
    ];
    const res = await service.recall({ userId: 'alice' });
    expect(res.map((r) => r.id)).toEqual(['m1']); // 不含 bob 的、不含已删的
  });

  it('recall：同类多事实全部返回（不再误当新旧版本去重）', async () => {
    rows = [
      { id: 'peanut', userId: 'alice', content: '对花生过敏', category: 'health', subject: 'self', status: 'active', createdAt: 100 },
      { id: 'shrimp', userId: 'alice', content: '对海鲜过敏', category: 'health', subject: 'self', status: 'active', createdAt: 200 },
    ];
    const res = await service.recall({ userId: 'alice' });
    expect(res).toHaveLength(2); // 两个并存过敏都召回，不漏
    expect(res.map((r) => r.id).sort()).toEqual(['peanut', 'shrimp']);
  });

  it('softDeleteByKeyword：按关键词标记本人记忆为 deleted', async () => {
    rows = [
      { id: 'm1', userId: 'alice', content: '对花生过敏', status: 'active' },
      { id: 'm2', userId: 'alice', content: '喜欢爬山', status: 'active' },
    ];
    const count = await service.softDeleteByKeyword('alice', '花生');
    expect(count).toBe(1);
    expect(rows.find((r) => r.id === 'm1').status).toBe('deleted');
    expect(rows.find((r) => r.id === 'm2').status).toBe('active');
  });

  it('softDeleteById：非属主删除抛 ForbiddenException', async () => {
    rows = [{ id: 'm1', userId: 'alice', content: 'x', status: 'active' }];
    await expect(service.softDeleteById('m1', 'bob')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(rows[0].status).toBe('active'); // 未被改动
  });
});
