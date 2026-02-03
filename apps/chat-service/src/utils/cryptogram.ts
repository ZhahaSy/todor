import * as argon2 from 'argon2';

/**
 * 加密密码
 * 使用 Argon2id 算法，推荐的密码哈希算法
 *
 * @param password 明文密码
 * @returns 加密后的密码哈希（包含盐值）
 */
export async function encryptPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  return await argon2.hash(password, {
    type: argon2.argon2id, // 使用 Argon2id 变体（推荐）
    memoryCost: 2 ** 16, // 64MB 内存成本
    timeCost: 3, // 迭代次数
    parallelism: 1, // 并行度
  });
}

/**
 * 验证密码
 *
 * @param password 明文密码
 * @param hash 存储的密码哈希
 * @returns 密码是否匹配
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // 如果哈希格式不正确，返回 false
    return false;
  }
}

/**
 * @deprecated 旧的 makeSalt 函数已废弃，Argon2 自动处理盐值生成
 * 保留此函数仅为向后兼容，建议迁移到新的 encryptPassword
 */
export function makeSalt(): string {
  throw new Error(
    'makeSalt() is deprecated. Use encryptPassword() instead, which handles salt automatically.',
  );
}
