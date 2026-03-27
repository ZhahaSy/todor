#!/usr/bin/env node
/**
 * 生产构建（tsc + tsc-alias）后，Node 无法解析「裸路径」如 src/foo，只能解析相对路径或 node_modules。
 * 内部代码请统一用 @/...（由 tsc-alias 转成相对路径）。
 *
 * 用法：在 apps/chat-service 目录下 pnpm run check:imports
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcDir = join(root, "src");

const patterns = [
  { re: /from\s+["']src\//g, msg: "使用 bare `src/...` import，请改为 `@/...`" },
  { re: /require\s*\(\s*["']src\//g, msg: "require('src/...')，请改为相对路径或 @/" },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (name.endsWith(".ts") && !name.endsWith(".spec.ts")) files.push(p);
  }
  return files;
}

const errors = [];
for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8");
  const rel = relative(root, file);
  for (const { re, msg } of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) errors.push(`${rel}: ${msg}`);
  }
}

if (errors.length) {
  console.error("[check-prod-imports] 发现问题：\n");
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("[check-prod-imports] OK（未发现 bare src/ 或 require('src/））");
