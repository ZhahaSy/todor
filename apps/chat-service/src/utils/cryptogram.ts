import * as crypto from 'crypto';

/**
 * Make Salt
 * */
export function makeSalt() {
  // 随机生成三个字节，转换为 base64 字符串
  return crypto.randomBytes(3).toString('base64');
}

/**
 * 加密 密码
 *
 * @param password 密码
 * @param salt 盐
 * @returns 加密后的密码
 */
export function encryptPassword(password: string, salt: string) {
  if (!password || !salt) {
    return '';
  }
  const tempSalt = Buffer.from(salt, 'base64');
  return crypto
    .pbkdf2Sync(password, Uint8Array.from(tempSalt), 10000, 16, 'sha1')
    .toString('base64');
}
