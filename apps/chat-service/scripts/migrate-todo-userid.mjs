#!/usr/bin/env node
/**
 * 一次性数据迁移：把 todo 的归属从 creator（用户名）回填到 userId（权威归属）。
 *
 * 背景：todo 历史用 creator=用户名 做归属，存在用户改名后脱钩、且与鉴权口径不一的问题。
 * 现已改为按 userId 鉴权。本脚本把存量 todo 的 userId 按 creator→user.name 映射回填。
 *
 * 特性：
 *  - 幂等：只回填 userId 为空的行，可重复运行。
 *  - 映射不到的（creator 为 null、或对应用户已删除/改名）保持 userId=null，并打印出来。
 *
 * 用法（在 apps/chat-service 目录下）：
 *   node scripts/migrate-todo-userid.mjs            # 用默认/环境变量里的 DB 路径
 *   DB_DATABASE=/path/to/chat.db node scripts/migrate-todo-userid.mjs
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();

const appRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dbPath =
  process.env.DB_DATABASE ||
  (existsSync(join(appRoot, 'dbs/chat.db'))
    ? join(appRoot, 'dbs/chat.db')
    : join(appRoot, 'chat.db'));

console.log(`[migrate] 使用数据库: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    }),
  );
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
  );

async function main() {
  // 确保 userId 列存在（app 以 synchronize:true 启动后会自动建；这里兜底以便独立运行）
  const cols = await all(`PRAGMA table_info(todo)`);
  if (!cols.some((c) => c.name === 'userId')) {
    console.log('[migrate] todo.userId 列不存在，先添加');
    await run(`ALTER TABLE todo ADD COLUMN userId varchar`);
  }

  // 迁移前快照
  const before = await all(
    `SELECT
       SUM(CASE WHEN userId IS NULL OR userId = '' THEN 1 ELSE 0 END) AS missing,
       COUNT(*) AS total
     FROM todo`,
  );
  console.log(`[migrate] 迁移前：共 ${before[0].total} 条，缺 userId ${before[0].missing} 条`);

  // 按 creator=user.name 回填 userId（仅缺失的行）
  const res = await run(
    `UPDATE todo
       SET userId = (SELECT u.id FROM user u WHERE u.name = todo.creator)
     WHERE (userId IS NULL OR userId = '')
       AND creator IS NOT NULL
       AND EXISTS (SELECT 1 FROM user u WHERE u.name = todo.creator)`,
  );
  console.log(`[migrate] 已回填 ${res.changes} 条`);

  // 仍映射不到的行（creator 为空，或对应用户不存在）
  const orphans = await all(
    `SELECT creator, COUNT(*) AS n
       FROM todo
      WHERE (userId IS NULL OR userId = '')
      GROUP BY creator`,
  );
  if (orphans.length > 0) {
    console.log('[migrate] 以下 todo 仍无法归属（userId 保持为空，需人工确认）：');
    for (const o of orphans) {
      console.log(`  creator=${JSON.stringify(o.creator)} → ${o.n} 条`);
    }
  } else {
    console.log('[migrate] 所有 todo 均已成功归属 ✅');
  }
}

main()
  .then(() => db.close())
  .catch((err) => {
    console.error('[migrate] 失败：', err);
    db.close();
    process.exit(1);
  });
