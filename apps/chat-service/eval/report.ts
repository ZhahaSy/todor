/**
 * 报告汇总：控制台打印 + 落 JSON（便于改 prompt 前后对比）。
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CaseReport } from './types';

export interface RunMeta {
  model: string;
  runsPerCase: number;
  startedAt: string;
}

function pct(n: number, d: number): string {
  if (d === 0) return 'N/A';
  return `${Math.round((n / d) * 100)}%`;
}

export function printReport(reports: CaseReport[], meta: RunMeta): void {
  const totalCases = reports.length;
  const runs = meta.runsPerCase;

  const toolChoiceTotal = reports.reduce((a, r) => a + r.toolChoicePassCount, 0);
  const argsTotal = reports.reduce((a, r) => a + r.argsPassCount, 0);
  const denom = totalCases * runs;

  const qualityScores = reports
    .map((r) => r.qualityMean)
    .filter((x): x is number => x !== null);
  const qualityAvg = qualityScores.length
    ? (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(2)
    : 'N/A';

  const depthScores = reports
    .map((r) => r.depthMean)
    .filter((x): x is number => x !== null);
  const depthAvg = depthScores.length
    ? (depthScores.reduce((a, b) => a + b, 0) / depthScores.length).toFixed(2)
    : 'N/A';

  const hallucinations = reports.reduce((a, r) => a + r.hallucinationCount, 0);
  const avgIter = (
    reports.reduce((a, r) => a + r.avgIterations, 0) / totalCases
  ).toFixed(2);
  const avgLatency = Math.round(
    reports.reduce((a, r) => a + r.avgLatencyMs, 0) / totalCases,
  );

  console.log('\n' + '='.repeat(56));
  console.log(`  Agent Eval Report`);
  console.log('='.repeat(56));
  console.log(`  model: ${meta.model} | cases: ${totalCases} | runs/case: ${runs}`);
  console.log(`  started: ${meta.startedAt}`);
  console.log('-'.repeat(56));
  console.log(`  工具选择正确率:   ${toolChoiceTotal}/${denom}  (${pct(toolChoiceTotal, denom)})`);
  console.log(`  参数正确率:       ${argsTotal}/${denom}  (${pct(argsTotal, denom)})`);
  console.log(`  回复质量(judge):  ${qualityAvg}${qualityAvg !== 'N/A' ? '/5' : ''}`);
  console.log(`  深度/充分度:      ${depthAvg}${depthAvg !== 'N/A' ? '/5' : ''}`);
  console.log(`  幻觉次数:         ${hallucinations}`);
  console.log(`  平均迭代轮数:     ${avgIter}`);
  console.log(`  平均延迟:         ${avgLatency}ms`);

  // 失败明细
  const failed = reports.filter(
    (r) =>
      r.toolChoicePassCount < runs ||
      r.argsPassCount < runs ||
      r.hallucinationCount > 0,
  );
  if (failed.length) {
    console.log('-'.repeat(56));
    console.log('  ❌ 有失败的用例：');
    for (const r of failed) {
      const flags: string[] = [];
      if (r.toolChoicePassCount < runs)
        flags.push(`工具选择 ${r.toolChoicePassCount}/${runs}`);
      if (r.argsPassCount < runs) flags.push(`参数 ${r.argsPassCount}/${runs}`);
      if (r.hallucinationCount > 0) flags.push(`幻觉 ${r.hallucinationCount}次`);
      console.log(`    [${r.id}] ${r.desc}`);
      console.log(`        ${flags.join(' | ')}`);
      // 取一个失败样本的理由
      const sample = r.details.find(
        (d) => !d.deterministic.toolChoicePass || !d.deterministic.argsPass,
      );
      if (sample) {
        if (!sample.deterministic.toolChoicePass)
          console.log(`        ↳ ${sample.deterministic.toolChoiceReason}`);
        if (!sample.deterministic.argsPass)
          console.log(`        ↳ ${sample.deterministic.argsReason}`);
      }
    }
  } else {
    console.log('-'.repeat(56));
    console.log('  ✅ 全部用例通过');
  }
  console.log('='.repeat(56) + '\n');
}

export function saveReport(reports: CaseReport[], meta: RunMeta): string {
  const dir = path.join(__dirname, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const safeStamp = meta.startedAt.replace(/[:.]/g, '-');
  const file = path.join(dir, `${safeStamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ meta, reports }, null, 2), 'utf-8');
  return file;
}
