/**
 * 评分器离线自检（不打模型）。
 *
 * 确定性评分器是整个 eval 体系最该可靠的部分 —— 它决定"工具选对没、参数对不对"的判定。
 * 这里用构造的假 RunTrace 验证其逻辑，零模型成本。
 *
 * 跑：pnpm eval:selftest
 */

import { scoreToolChoice } from './scorers/tool-choice';
import { scoreArgs } from './scorers/args';
import type { RunTrace } from '../src/modules/ai/agent-events';
import type { EvalCase } from './types';

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}  ${detail}`);
  }
}

function trace(toolCalls: { name: string; args?: unknown }[]): RunTrace {
  return {
    finalText: '（略）',
    toolCalls: toolCalls.map((c) => ({
      name: c.name,
      args: c.args ?? {},
      result: '',
      ok: true,
      ms: 1,
    })),
    iterations: 1,
    totalMs: 1,
  };
}

function ymdOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

console.log('\n=== 评分器离线自检 ===\n');

// --- tool-choice ---
console.log('tool-choice:');
{
  const e: EvalCase['expect'] = { tools: { shouldCall: ['weather_query'] } };
  assert(
    'shouldCall 命中 → pass',
    scoreToolChoice(trace([{ name: 'weather_query' }]), e).pass,
  );
  assert(
    'shouldCall 未命中 → fail',
    !scoreToolChoice(trace([]), e).pass,
  );
}
{
  const e: EvalCase['expect'] = {
    tools: { shouldNotCall: ['create_reminder'] },
  };
  assert(
    'shouldNotCall 未触发 → pass',
    scoreToolChoice(trace([{ name: 'weather_query' }]), e).pass,
  );
  assert(
    'shouldNotCall 被触发 → fail',
    !scoreToolChoice(trace([{ name: 'create_reminder' }]), e).pass,
  );
}
{
  const e: EvalCase['expect'] = {
    tools: { shouldNotCall: ['weather_query', 'create_reminder'] },
  };
  assert('闲聊不调任何工具 → pass', scoreToolChoice(trace([]), e).pass);
}

// --- args ---
console.log('args:');
{
  const e: EvalCase['expect'] = {
    tools: { args: { weather_query: { city: { kind: 'contains', value: '上海' } } } },
  };
  assert(
    'contains 命中 → pass',
    scoreArgs(trace([{ name: 'weather_query', args: { city: '上海市' } }]), e)
      .pass,
  );
  assert(
    'contains 未命中 → fail',
    !scoreArgs(trace([{ name: 'weather_query', args: { city: '北京' } }]), e)
      .pass,
  );
  assert(
    '工具没调到 → fail（无法断言参数）',
    !scoreArgs(trace([]), e).pass,
  );
}
{
  const e: EvalCase['expect'] = {
    tools: {
      args: {
        create_reminder: { todoTime: { kind: 'dateOffsetDays', offsetDays: 1 } },
      },
    },
  };
  assert(
    'dateOffsetDays 明天 → pass',
    scoreArgs(
      trace([
        { name: 'create_reminder', args: { todoTime: `${ymdOffset(1)} 09:00` } },
      ]),
      e,
    ).pass,
  );
  assert(
    'dateOffsetDays 日期错 → fail',
    !scoreArgs(
      trace([
        { name: 'create_reminder', args: { todoTime: `${ymdOffset(3)} 09:00` } },
      ]),
      e,
    ).pass,
  );
}
{
  const e: EvalCase['expect'] = {
    tools: {
      args: { create_reminder: { type: { kind: 'oneOf', values: ['work'] } } },
    },
  };
  assert(
    'oneOf 命中 → pass',
    scoreArgs(trace([{ name: 'create_reminder', args: { type: 'work' } }]), e)
      .pass,
  );
  assert(
    'oneOf 未命中 → fail',
    !scoreArgs(trace([{ name: 'create_reminder', args: { type: 'life' } }]), e)
      .pass,
  );
}

console.log(`\n结果：${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
