/**
 * 抽取器评分（确定性，不调模型）：对比抽取器输出 vs 金标准的各字段。
 *
 * 与 agent eval 的"工具选择"不同 —— 这里评的是分类准确率。
 * 最关键的是 shouldRemember（该不该记），判错它=误存垃圾或漏记事实，直接影响幻觉。
 */

import type { ExtractedMemory } from '../../src/modules/memory/memory-extractor.service';

/** 金标准用例（memory-extract.cases.json 的一条） */
export interface MemoryCase {
  id: string;
  input: string;
  desc: string;
  expect: {
    op: 'write' | 'none' | 'delete';
    memories: Array<{
      shouldRemember?: boolean;
      value?: string;
      confidence?: string;
      category?: string;
      subject?: string;
      route?: string;
    }>;
  };
}

export interface ExtractionScore {
  /** delete 类用例不归抽取器评（属 agent 工具选择），标记跳过 */
  skipped: boolean;
  /** 该记/不记判对（none→空数组；write→至少抽出一条） */
  shouldRememberPass: boolean;
  /** 多事实：是否抽出了期望条数 */
  countPass: boolean;
  /** 仅 write 且匹配上某条时比字段 */
  fieldScores: {
    value?: boolean;
    confidence?: boolean;
    category?: boolean;
    route?: boolean;
  };
  detail: string;
}

const routeField = (route?: string): string | null =>
  route && route.startsWith('User.') ? route.slice(5) : null;

export function scoreExtraction(
  out: ExtractedMemory[],
  c: MemoryCase,
): ExtractionScore {
  // delete 意图不归抽取器（第一期已由 agent 工具选择 eval 覆盖）
  if (c.expect.op === 'delete') {
    return {
      skipped: true,
      shouldRememberPass: true,
      countPass: true,
      fieldScores: {},
      detail: '跳过(delete归工具选择)',
    };
  }

  const expectRemember = c.expect.op === 'write';

  // 反例(op=none)：抽取器应输出空数组
  if (!expectRemember) {
    const pass = out.length === 0;
    return {
      skipped: false,
      shouldRememberPass: pass,
      countPass: pass,
      fieldScores: {},
      detail: pass
        ? '✓ 正确判为不记（空数组）'
        : `✗ 误抽出 ${out.length} 条：${out.map((o) => o.content).join('、')}`,
    };
  }

  // 正例：至少抽出一条
  const shouldRememberPass = out.length >= 1;
  const expectCount = c.expect.memories.length;
  const countPass = out.length >= expectCount;
  const fails: string[] = [];
  if (!shouldRememberPass) fails.push('✗ 漏记(应记却抽出0条)');
  if (shouldRememberPass && !countPass) {
    fails.push(`条数:期望${expectCount}实际${out.length}`);
  }

  // 逐条金标准找最佳匹配（按 content 关键词或 category 对齐），比字段
  const fieldScores: ExtractionScore['fieldScores'] = {};
  if (shouldRememberPass) {
    // 简化：对金标准首条 vs 抽取首条比字段（单事实用例足够；多事实主要看 countPass）
    const gold = c.expect.memories[0] ?? {};
    const o = out[0];
    if (gold.value !== undefined) {
      fieldScores.value = o.value === gold.value;
      if (!fieldScores.value) fails.push(`value:期望${gold.value}实际${o.value}`);
    }
    if (gold.confidence !== undefined) {
      fieldScores.confidence = o.confidence === gold.confidence;
      if (!fieldScores.confidence) fails.push(`confidence:期望${gold.confidence}实际${o.confidence}`);
    }
    if (gold.category !== undefined) {
      fieldScores.category = o.category === gold.category;
      if (!fieldScores.category) fails.push(`category:期望${gold.category}实际${o.category}`);
    }
    if (gold.route !== undefined) {
      const expectField = routeField(gold.route);
      fieldScores.route = (o.routeToUserField ?? null) === expectField;
      if (!fieldScores.route) fails.push(`route:期望${gold.route}实际${o.routeToUserField ?? 'user_memory'}`);
    }
  }

  return {
    skipped: false,
    shouldRememberPass,
    countPass,
    fieldScores,
    detail: fails.length === 0 ? '✓ 全对' : fails.join('；'),
  };
}
