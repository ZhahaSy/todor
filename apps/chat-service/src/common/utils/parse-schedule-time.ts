/**
 * 解析待办 / 邮件提醒时间。
 *
 * - `YYYY-MM-DD HH:mm` / `YYYY-MM-DDTHH:mm` / 可选秒：按**进程本地时区**的墙钟时间理解。
 *   生产环境若用户在国内，请把容器或主机的 `TZ` 设为 `Asia/Shanghai`（或与用户一致的时区），
 *   否则「用户说的 9 点」与「服务器认为的 9 点」会对不齐，表现为提早或推迟发送。
 * - 其它字符串交给原生 `Date` 解析（推荐完整 ISO 8601）。
 */
export function parseScheduleAt(input: string | Date): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new RangeError('Invalid Date');
    }
    return input;
  }

  const s = input.trim();
  const m =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const h = Number(m[4]);
    const mi = Number(m[5]);
    const sec = m[6] != null ? Number(m[6]) : 0;
    return new Date(y, mo - 1, d, h, mi, sec, 0);
  }

  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    throw new RangeError(`无法解析提醒时间: ${input}`);
  }
  return new Date(t);
}
