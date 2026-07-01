/**
 * 确定性评分器：工具选择正确性。
 *
 * 直接对比 RunTrace 里实际调用的工具集合与用例期望（shouldCall / shouldNotCall），
 * 零模型成本、完全可复现。这是 eval 里最该优先做扎实的一层 —— 大多数 agent 回归问题
 * （该调工具时纯聊天、闲聊时乱调工具）都能被它抓住。
 */

import type { RunTrace } from '../../src/modules/ai/agent-events';
import type { EvalCase } from '../types';

export function scoreToolChoice(
  trace: RunTrace,
  expect: EvalCase['expect'],
): { pass: boolean; reason: string } {
  const calledNames = new Set(trace.toolCalls.map((c) => c.name));
  const shouldCall = expect.tools?.shouldCall ?? [];
  const shouldNotCall = expect.tools?.shouldNotCall ?? [];

  const missing = shouldCall.filter((n) => !calledNames.has(n));
  const forbidden = shouldNotCall.filter((n) => calledNames.has(n));

  if (missing.length === 0 && forbidden.length === 0) {
    const called = [...calledNames];
    return {
      pass: true,
      reason: called.length ? `调用了 [${called.join(', ')}]` : '未调用任何工具（符合预期）',
    };
  }

  const parts: string[] = [];
  if (missing.length) parts.push(`缺少应调用的工具 [${missing.join(', ')}]`);
  if (forbidden.length)
    parts.push(`错误调用了禁止的工具 [${forbidden.join(', ')}]`);
  parts.push(`实际调用 [${[...calledNames].join(', ') || '无'}]`);
  return { pass: false, reason: parts.join('；') };
}
