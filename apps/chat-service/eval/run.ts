/**
 * Eval 入口：遍历用例 × k 次运行 → 确定性评分 + LLM-judge → 汇总报告。
 *
 * 用法（在 apps/chat-service 下）：
 *   pnpm eval                  跑全部用例，每条 2 次
 *   pnpm eval --runs=3         每条跑 3 次（pass@k）
 *   pnpm eval --case=weather-01  只跑某条用例
 *   pnpm eval --no-judge       跳过 LLM-judge（只看确定性断言，省额度/更快）
 *
 * 非确定性应对：工具选择/参数维度跑 k 次报通过次数（pass@k）；judge 多次采样取均值。
 */

import * as fs from 'fs';
import * as path from 'path';
import { runCase } from './runner';
import { scoreToolChoice } from './scorers/tool-choice';
import { scoreArgs } from './scorers/args';
import { judgeQuality, judgeDepth, judgeFaithfulness } from './scorers/llm-judge';
import { printReport, saveReport, type RunMeta } from './report';
import type {
  EvalCase,
  CaseRunResult,
  CaseReport,
} from './types';

interface Cli {
  runs: number;
  caseId?: string;
  judge: boolean;
  qualitySamples: number;
}

function parseCli(argv: string[]): Cli {
  const cli: Cli = { runs: 2, judge: true, qualitySamples: 2 };
  for (const arg of argv) {
    if (arg.startsWith('--runs=')) cli.runs = Number(arg.split('=')[1]) || 2;
    else if (arg.startsWith('--case=')) cli.caseId = arg.split('=')[1];
    else if (arg === '--no-judge') cli.judge = false;
    else if (arg.startsWith('--quality-samples='))
      cli.qualitySamples = Number(arg.split('=')[1]) || 2;
  }
  return cli;
}

function loadCases(): EvalCase[] {
  const file = path.join(__dirname, 'cases', 'agent.cases.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as EvalCase[];
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** 跑一条用例一次：执行 agent + 确定性评分 +（可选）judge */
async function runOnce(c: EvalCase, cli: Cli): Promise<CaseRunResult> {
  const trace = await runCase(c);

  const tc = scoreToolChoice(trace, c.expect);
  const ar = scoreArgs(trace, c.expect);

  let quality: CaseRunResult['quality'] = null;
  if (cli.judge && c.expect.rubric) {
    const samples: { score: number; reason: string }[] = [];
    let passes = 0;
    for (let i = 0; i < cli.qualitySamples; i++) {
      try {
        const j = await judgeQuality(c.input, trace.finalText, c.expect.rubric);
        samples.push({ score: j.score, reason: j.reason });
        if (j.pass) passes++;
      } catch (e) {
        // 单次 judge 解析/调用失败不应中断整个 eval —— 跳过这次采样
        console.warn(
          `    ⚠️ judge(quality) 失败，跳过本次采样：${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    quality = samples.length
      ? {
          mean: Number(mean(samples.map((s) => s.score)).toFixed(2)),
          passRate: passes / samples.length,
          samples,
        }
      : null;
  }

  let depth: CaseRunResult['depth'] = null;
  if (cli.judge && c.expect.expectDepth && c.expect.rubric) {
    const samples: { score: number; reason: string }[] = [];
    let passes = 0;
    for (let i = 0; i < cli.qualitySamples; i++) {
      try {
        const j = await judgeDepth(c.input, trace.finalText, c.expect.rubric);
        samples.push({ score: j.score, reason: j.reason });
        if (j.pass) passes++;
      } catch (e) {
        console.warn(
          `    ⚠️ judge(depth) 失败，跳过本次采样：${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    depth = samples.length
      ? {
          mean: Number(mean(samples.map((s) => s.score)).toFixed(2)),
          passRate: passes / samples.length,
          samples,
        }
      : null;
  }

  let faithfulness: CaseRunResult['faithfulness'] = null;
  if (cli.judge && c.expect.checkFaithfulness) {
    try {
      const toolResults = trace.toolCalls.map((t) => t.result);
      faithfulness = await judgeFaithfulness(
        c.input,
        trace.finalText,
        toolResults,
      );
    } catch (e) {
      console.warn(
        `    ⚠️ judge(faithfulness) 失败，跳过：${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    finalText: trace.finalText,
    toolCalls: trace.toolCalls.map((t) => ({
      name: t.name,
      args: t.args,
      result: t.result,
    })),
    iterations: trace.iterations,
    totalMs: trace.totalMs,
    deterministic: {
      toolChoicePass: tc.pass,
      toolChoiceReason: tc.reason,
      argsPass: ar.pass,
      argsReason: ar.reason,
    },
    quality,
    depth,
    faithfulness,
  };
}

/** 跑一条用例 k 次并汇总 */
async function runCaseKTimes(c: EvalCase, cli: Cli): Promise<CaseReport> {
  const details: CaseRunResult[] = [];
  for (let i = 0; i < cli.runs; i++) {
    process.stdout.write(`  [${c.id}] run ${i + 1}/${cli.runs}...`);
    const r = await runOnce(c, cli);
    details.push(r);
    process.stdout.write(
      ` tool:${r.deterministic.toolChoicePass ? '✓' : '✗'} args:${r.deterministic.argsPass ? '✓' : '✗'}\n`,
    );
    // 失败时附上实际参数与原因，便于判断是模型错还是断言太严
    if (!r.deterministic.argsPass) {
      console.log(`      ↳ ${r.deterministic.argsReason}`);
      console.log(`      ↳ 实际 toolCalls: ${JSON.stringify(r.toolCalls)}`);
    }
  }

  const qualityMeans = details
    .map((d) => d.quality?.mean)
    .filter((x): x is number => x != null);

  const depthMeans = details
    .map((d) => d.depth?.mean)
    .filter((x): x is number => x != null);

  return {
    id: c.id,
    desc: c.desc,
    runs: cli.runs,
    toolChoicePassCount: details.filter((d) => d.deterministic.toolChoicePass)
      .length,
    argsPassCount: details.filter((d) => d.deterministic.argsPass).length,
    qualityMean: qualityMeans.length ? Number(mean(qualityMeans).toFixed(2)) : null,
    depthMean: depthMeans.length ? Number(mean(depthMeans).toFixed(2)) : null,
    hallucinationCount: details.filter((d) => d.faithfulness?.hallucinated)
      .length,
    avgIterations: Number(mean(details.map((d) => d.iterations)).toFixed(2)),
    avgLatencyMs: Math.round(mean(details.map((d) => d.totalMs))),
    details,
  };
}

async function main() {
  const cli = parseCli(process.argv.slice(2));
  let cases = loadCases();
  if (cli.caseId) cases = cases.filter((c) => c.id === cli.caseId);
  if (cases.length === 0) {
    console.error('没有匹配的用例');
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  console.log(
    `\n开始评估：${cases.length} 条用例 × ${cli.runs} 次${cli.judge ? '（含 LLM-judge）' : '（跳过 judge）'}\n`,
  );

  const reports: CaseReport[] = [];
  for (const c of cases) {
    reports.push(await runCaseKTimes(c, cli));
  }

  const meta: RunMeta = {
    model: process.env.AI_MODEL || 'deepseek-chat',
    runsPerCase: cli.runs,
    startedAt,
  };
  printReport(reports, meta);
  const file = saveReport(reports, meta);
  console.log(`报告已保存：${file}\n`);
}

main().catch((e) => {
  console.error('eval 运行失败：', e);
  process.exit(1);
});
