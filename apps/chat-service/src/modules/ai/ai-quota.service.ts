import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

/**
 * AI 调用配额：限制单个用户每自然日可发起的 AI 对话次数。
 *
 * 目的：开放注册后，任何用户都能无限刷 AI 对话，每条都消耗 DeepSeek 账户余额。
 * 这里用 Redis 按「用户 + 当日」计数，超额拒绝，把单用户对成本的影响封顶。
 *
 * 配额值「动态」可调：全局上限存在 Redis（key=ai:quota:limit），运行时通过管理员接口
 * 修改即时生效、无需重启；Redis 里没有该值时回落到环境变量 AI_DAILY_QUOTA（默认 100）。
 * 值为 0 表示不限制。
 *
 * 白名单用户（ADMIN_USER_IDS / AI_QUOTA_WHITELIST 里的用户 id）不计入配额、永不拦截。
 *
 * Redis 不可用时一律「放行」而非「拦截」—— 配额是成本护栏，不应因缓存故障阻断核心功能。
 */
@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);
  /** 环境变量提供的默认上限，仅当 Redis 未设置全局值时使用 */
  private readonly defaultQuota: number;
  /** 不限量的用户 id 集合（管理员 + 显式白名单） */
  private readonly whitelist: Set<string>;

  /** 全局上限在 Redis 中的存储 key（与按日计数 key 区分开） */
  private static readonly LIMIT_KEY = 'ai:quota:limit';

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.defaultQuota = Number(
      this.configService.get<string>('AI_DAILY_QUOTA') ?? '100',
    );

    const ids = [
      this.configService.get<string>('ADMIN_USER_IDS') ?? '',
      this.configService.get<string>('AI_QUOTA_WHITELIST') ?? '',
    ]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.whitelist = new Set(ids);
  }

  /** 北京时间当日的 key 段（YYYY-MM-DD），用于按自然日重置 */
  private dayStamp(): string {
    // 用东八区日期切分，避免 UTC 与用户实际日期错位
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    return now.toISOString().slice(0, 10);
  }

  private counterKey(userId: string): string {
    return `ai:quota:${userId}:${this.dayStamp()}`;
  }

  isWhitelisted(userId: string): boolean {
    return this.whitelist.has(userId);
  }

  /**
   * 读取当前生效的全局每日上限：优先 Redis，其次环境变量默认值。
   * Redis 故障时回落到默认值。
   */
  async getLimit(): Promise<number> {
    try {
      const raw = await this.redisService.get(AiQuotaService.LIMIT_KEY);
      if (raw !== null && raw !== '') {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) {
          return n;
        }
      }
    } catch (err) {
      this.logger.warn(
        `读取全局配额失败，回落默认值：${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return this.defaultQuota;
  }

  /**
   * 设置全局每日上限（管理员接口调用）。立即对后续请求生效。
   * @param limit >=0 的整数，0 表示不限制
   */
  async setLimit(limit: number): Promise<number> {
    const n = Math.floor(limit);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('配额必须是 >= 0 的整数');
    }
    await this.redisService.set(AiQuotaService.LIMIT_KEY, String(n));
    this.logger.log(`全局每日 AI 配额已更新为 ${n}`);
    return n;
  }

  /**
   * 消费一次配额。返回是否允许本次调用。
   * 仅在允许时才会真正 +1，超额不累加（避免 key 无限增长）。
   * 白名单用户与「不限制（limit<=0）」直接放行、不计数。
   */
  async consume(
    userId: string,
  ): Promise<{ allowed: boolean; used: number; limit: number }> {
    if (this.isWhitelisted(userId)) {
      return { allowed: true, used: 0, limit: 0 };
    }

    const limit = await this.getLimit();
    // 未配置或 <=0 视为不限制
    if (!limit || limit <= 0) {
      return { allowed: true, used: 0, limit: 0 };
    }

    const key = this.counterKey(userId);
    try {
      const client = this.redisService.getClient();
      const used = await client.incr(key);
      if (used === 1) {
        // 首次写入时设置过期：48h 覆盖跨日，到期自动清理
        await client.expire(key, 48 * 60 * 60);
      }
      if (used > limit) {
        // 超额：回退本次自增，使计数停在 limit，避免 key 数值无限膨胀
        await client.decr(key);
        return { allowed: false, used: limit, limit };
      }
      return { allowed: true, used, limit };
    } catch (err) {
      // Redis 故障时放行，但记录告警
      this.logger.warn(
        `AI 配额检查失败，本次放行（userId=${userId}）：${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { allowed: true, used: 0, limit };
    }
  }

  /** 查询某用户当日已用次数（管理接口/调试用），不消费配额 */
  async getUsage(
    userId: string,
  ): Promise<{ used: number; limit: number; whitelisted: boolean }> {
    const whitelisted = this.isWhitelisted(userId);
    const limit = await this.getLimit();
    let used = 0;
    try {
      const raw = await this.redisService.get(this.counterKey(userId));
      used = raw ? Number(raw) : 0;
    } catch {
      used = 0;
    }
    return { used, limit, whitelisted };
  }
}
