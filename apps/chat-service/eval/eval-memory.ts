/**
 * 抽取器 eval 入口：用金标准用例验证 MemoryExtractor 的分类准确率。
 *
 * 用法（apps/chat-service 下）：
 *   pnpm eval:memory              全部用例，每条 2 次
 *   pnpm eval:memory --runs=3     pass@k
 *   pnpm eval:memory --case=mem-allergy-self
 *
 * 这是"先验证再开自动写入闸"的关键一步：只有抽取器准确率达标，第二步才接自动写入。
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createChatModel } from './runner';
import { extractWithModel } from '../src/modules/memory/memory-extractor.service';
import { scoreExtraction, type MemoryCase } from './scorers/extraction';

interface Cli {
  runs: number;
  caseId?: string;
}
function parseCli(argv: string[]): Cli {
  const cli: Cli = { runs: 2 };
  for (const a of argv) {
    if (a.startsWith('--runs=')) cli.runs = Number(a.split('=')[1]) || 2;
    else if (a.startsWith('--case=')) cli.caseId = a.split('=')[1];
  }
  return cli;
}

function loadCases(): MemoryCase[] {
  const file = path.join(__dirname, 'cases', 'memory-extract.cases.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as MemoryCase[];
}

const pct = (n: number, d: number) => (d === 0 ? 'N/A' : `${Math.round((n / d) * 100)}%`);

async function main() {
  const cli = parseCli(process.argv.slice(2));
  let cases = loadCases();
  if (cli.caseId) cases = cases.filter((c) => c.id === cli.caseId);
  if (cases.length === 0) {
    console.error('没有匹配的用例');
    process.exit(1);
  }

  const model = createChatModel(0);
  console.log(`\n抽取器评估：${cases.length} 条用例 × ${cli.runs} 次\n`);

  // 累计计数
  let srTotal = 0,
    srPass = 0,
    cntTotal = 0,
    cntPass = 0;
  const fieldAgg: Record<string, { total: number; pass: number }> = {};
  const failLines: string[] = [];

  for (const c of cases) {
    for (let i = 0; i < cli.runs; i++) {
      const out = await extractWithModel(model, c.input);
      const s = scoreExtraction(out, c);
      if (s.skipped) continue;

      srTotal++;
      if (s.shouldRememberPass) srPass++;
      cntTotal++;
      if (s.countPass) cntPass++;

      for (const [k, v] of Object.entries(s.fieldScores)) {
        fieldAgg[k] = fieldAgg[k] ?? { total: 0, pass: 0 };
        fieldAgg[k].total++;
        if (v) fieldAgg[k].pass++;
      }

      const ok =
        s.shouldRememberPass &&
        s.countPass &&
        Object.values(s.fieldScores).every(Boolean);
      process.stdout.write(`  [${c.id}] ${ok ? '✓' : '✗'} ${ok ? '' : s.detail}\n`);
      if (!ok) failLines.push(`[${c.id}] ${s.detail}`);
    }
  }

  console.log('\n' + '='.repeat(52));
  console.log('  抽取器准确率报告');
  console.log('='.repeat(52));
  console.log(`  该记/不记判定: ${srPass}/${srTotal}  (${pct(srPass, srTotal)})  ← 命门`);
  console.log(`  多事实条数: ${cntPass}/${cntTotal}  (${pct(cntPass, cntTotal)})`);
  for (const [k, v] of Object.entries(fieldAgg)) {
    console.log(`  ${k}: ${v.pass}/${v.total}  (${pct(v.pass, v.total)})`);
  }
  console.log('='.repeat(52));
  if (failLines.length) {
    console.log('失败明细：');
    failLines.forEach((l) => console.log('  ' + l));
  }
  console.log('');
}

main().catch((e) => {
  console.error('eval:memory 失败：', e);
  process.exit(1);
});
