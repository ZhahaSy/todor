import { ForbiddenException } from '@nestjs/common';
import { TodoService } from './todo.service';

/**
 * 验证 todo 归属鉴权（IDOR 修复）：
 * 按 userId 过滤/校验，非属主无法 查/改/删 他人待办。
 */
describe('TodoService ownership (IDOR)', () => {
  // 内存版 repository 桩
  let rows: any[];
  let repo: any;
  let service: TodoService;

  beforeEach(() => {
    rows = [
      { id: 't1', userId: 'alice', isDeleted: false, status: 'active', title: 'A的待办' },
      { id: 't2', userId: 'bob', isDeleted: false, status: 'active', title: 'B的待办' },
    ];
    repo = {
      create: (dto: any) => dto,
      save: async (dto: any) => dto,
      find: jest.fn(async ({ where }: any) =>
        rows.filter(
          (r) =>
            (where.userId === undefined || r.userId === where.userId) &&
            r.isDeleted === false,
        ),
      ),
      findOne: jest.fn(async ({ where }: any) =>
        rows.find(
          (r) =>
            r.id === where.id &&
            (where.userId === undefined || r.userId === where.userId) &&
            (where.isDeleted === undefined || r.isDeleted === where.isDeleted),
        ) ?? null,
      ),
      update: jest.fn(async (id: string, patch: any) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, patch);
        return { affected: row ? 1 : 0 };
      }),
    };
    service = new TodoService(repo);
  });

  it('getTodoList 只返回本人待办', async () => {
    const list = await service.getTodoList({ userId: 'alice' });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('t1');
  });

  it('getTodoById 查他人待办返回 null', async () => {
    expect(await service.getTodoById('t2', 'alice')).toBeNull();
    expect(await service.getTodoById('t1', 'alice')).not.toBeNull();
  });

  it('updateTodoById 改他人待办抛 Forbidden', async () => {
    await expect(
      service.updateTodoById('t2', 'alice', { title: '篡改' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // B 的待办未被改动
    expect(rows.find((r) => r.id === 't2').title).toBe('B的待办');
  });

  it('updateTodoById 改本人待办成功，且不能篡改归属字段', async () => {
    await service.updateTodoById('t1', 'alice', {
      title: '新标题',
      userId: 'bob', // 试图改归属
      id: 'hack',
    } as any);
    const t1 = rows.find((r) => r.id === 't1');
    expect(t1.title).toBe('新标题');
    expect(t1.userId).toBe('alice'); // 归属未被篡改
  });

  it('deleteTodoById 删他人待办抛 Forbidden', async () => {
    await expect(
      service.deleteTodoById('t2', 'alice'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rows.find((r) => r.id === 't2').isDeleted).toBe(false);
  });

  it('deleteTodoById 删本人待办成功（软删）', async () => {
    await service.deleteTodoById('t1', 'alice');
    expect(rows.find((r) => r.id === 't1').isDeleted).toBe(true);
  });
});
