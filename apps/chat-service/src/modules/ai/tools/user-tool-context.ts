import type { User } from '../../user/entities/user.entity';

/**
 * 每次请求构造工具时注入的用户上下文。
 * 工具不再让模型自行提供 creator/email，也不再 mutate 单例（避免高并发串号），
 * 统一由这里的可信值注入。
 */
export interface UserToolContext {
  userInfo: User;
  location?: { lat: number; lon: number };
}
