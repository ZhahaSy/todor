import { DataSource } from 'typeorm';
import { UserMemory } from './entities/user-memory.entity';
import { MemoryService } from './memory.service';

/**
 * 真实 SQLite 持久化集成测试（区别于 memory.service.spec 的内存桩单测）。
 *
 * 存在意义：曾有一个 bug 只有真库能暴露 —— createdAt 用 @CreateDateColumn 时在 SQLite 下
 * 存成秒级 datetime 字符串，同秒创建的两条无法排序，导致路C"取最新"失效。单测用数字
 * createdAt 掩盖了它。这里用真 SQLite + 毫秒时间戳守住这条回归。
 */
describe('MemoryService 真实持久化（SQLite 集成）', () => {
  let ds: DataSource;
  let svc: MemoryService;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [UserMemory],
      synchronize: true,
    });
    await ds.initialize();
    svc = new MemoryService(ds.getRepository(UserMemory) as any);
  });
  afterAll(async () => {
    await ds.destroy();
  });

  it('存→查：写库后能召回，且按 userId 隔离他人', async () => {
    await svc.create({ userId: 'alice', content: '对花生过敏', category: 'health' });
    await svc.create({ userId: 'bob', content: 'bob的秘密', category: 'health' });
    const r = await svc.recall({ userId: 'alice' });
    expect(r).toHaveLength(1);
    expect(r[0].content).toBe('对花生过敏');
  });

  it('同类多事实：召回全部返回（不漏），按时间倒序', async () => {
    await svc.create({ userId: 'carol', content: '对花生过敏', category: 'health', subject: 'self' });
    await new Promise((res) => setTimeout(res, 5));
    await svc.create({ userId: 'carol', content: '对海鲜过敏', category: 'health', subject: 'self' });
    const r = await svc.recall({ userId: 'carol', category: 'health' });
    expect(r).toHaveLength(2); // 两个过敏都召回，不被误当新旧版本
    expect(r[0].content).toBe('对海鲜过敏'); // 最新在前
  });

  it('删→查：显式删除后召回不再出现', async () => {
    await svc.create({ userId: 'dave', content: '对海鲜过敏', category: 'health' });
    expect(await svc.recall({ userId: 'dave' })).toHaveLength(1);
    expect(await svc.softDeleteByKeyword('dave', '海鲜')).toBe(1);
    expect(await svc.recall({ userId: 'dave' })).toHaveLength(0);
  });

  it('hasSimilarActive：包含关系判重复（防双写），不同事实不误判', async () => {
    await svc.create({ userId: 'eve', content: '用户对花生过敏', category: 'health', subject: 'self' });
    // 措辞略不同但实质相同 → 判重复
    expect(await svc.hasSimilarActive('eve', 'self', '对花生过敏')).toBe(true);
    // 同 subject 但不同事实 → 不误判
    expect(await svc.hasSimilarActive('eve', 'self', '对海鲜过敏')).toBe(false);
    // 不同 subject → 不误判
    expect(await svc.hasSimilarActive('eve', '父亲', '对花生过敏')).toBe(false);
  });
});
