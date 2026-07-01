/**
 * 确定性评分器：工具入参正确性。
 *
 * 对指定工具的关键入参逐个用 matcher 断言。支持模糊匹配（contains / oneOf / dateOffsetDays），
 * 因为很多参数（如自然语言时间解析出的 todoTime）不宜要求精确字符串相等。
 */

import type { RunTrace } from '../../src/modules/ai/agent-events';
import type { EvalCase, ArgMatcher } from '../types';

/** 取某工具第一次调用的入参（同名多次调用只看首次，够用） */
function firstArgsOf(trace: RunTrace, toolName: string): Record<string, unknown> | null {
  const call = trace.toolCalls.find((c) => c.name === toolName);
  if (!call) return null;
  return (call.args as Record<string, unknown>) ?? {};
}

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function matchOne(
  actual: unknown,
  matcher: ArgMatcher,
): { ok: boolean; detail: string } {
  switch (matcher.kind) {
    case 'equals':
      return {
        ok: actual === matcher.value,
        detail: `期望 = ${JSON.stringify(matcher.value)}，实际 ${JSON.stringify(actual)}`,
      };
    case 'contains': {
      const s = String(actual ?? '');
      return {
        ok: s.includes(matcher.value),
        detail: `期望包含 "${matcher.value}"，实际 "${s}"`,
      };
    }
    case 'oneOf':
      return {
        ok: matcher.values.includes(actual),
        detail: `期望 ∈ ${JSON.stringify(matcher.values)}，实际 ${JSON.stringify(actual)}`,
      };
    case 'dateOffsetDays': {
      const expected = new Date();
      expected.setDate(expected.getDate() + matcher.offsetDays);
      const expectedYmd = ymd(expected);
      const actualStr = String(actual ?? '');
      return {
        ok: actualStr.startsWith(expectedYmd),
        detail: `期望日期 ${expectedYmd}（今天 +${matcher.offsetDays}），实际 "${actualStr}"`,
      };
    }
    default:
      return { ok: false, detail: '未知 matcher' };
  }
}

export function scoreArgs(
  trace: RunTrace,
  expect: EvalCase['expect'],
): { pass: boolean; reason: string } {
  const argSpec = expect.tools?.args;
  if (!argSpec || Object.keys(argSpec).length === 0) {
    return { pass: true, reason: '无参数断言' };
  }

  const failures: string[] = [];
  for (const [toolName, params] of Object.entries(argSpec)) {
    const actualArgs = firstArgsOf(trace, toolName);
    if (actualArgs === null) {
      failures.push(`工具 ${toolName} 未被调用，无法断言参数`);
      continue;
    }
    for (const [paramName, matcher] of Object.entries(params)) {
      const { ok, detail } = matchOne(actualArgs[paramName], matcher);
      if (!ok) failures.push(`${toolName}.${paramName}: ${detail}`);
    }
  }

  return failures.length === 0
    ? { pass: true, reason: '参数全部符合' }
    : { pass: false, reason: failures.join('；') };
}
