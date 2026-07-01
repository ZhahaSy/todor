/**
 * Agent Eval 体系的类型定义。
 *
 * 评估分两类：
 *  - 确定性断言（tool-choice / args）：直接对比 agent 自报的 RunTrace.toolCalls，零成本、可复现。
 *  - LLM-as-judge（quality / faithfulness）：开放式文本质量，用 DeepSeek 按 rubric 打分。
 *
 * 数据与代码分离：用例写在 cases/agent.cases.json，改用例不动代码。
 */

/** 模糊参数匹配器：用于"时间约等""字符串包含"等不宜精确相等的断言 */
export type ArgMatcher =
  | { kind: 'equals'; value: unknown }
  | { kind: 'contains'; value: string }
  | { kind: 'oneOf'; values: unknown[] }
  /** 期望值是一个相对今天的日期（offsetDays=1 即明天），只比对到「天」 */
  | { kind: 'dateOffsetDays'; offsetDays: number };

/** 单条评估用例 */
export interface EvalCase {
  id: string;
  /** 简短说明这条用例在测什么 */
  desc: string;
  input: string;
  /** 可选：模拟的位置 / 用户档案覆盖 */
  context?: {
    location?: { lat: number; lon: number };
    user?: Partial<{
      name: string;
      email: string;
      age: number;
      gender: string;
      hobby: string;
    }>;
  };
  expect: {
    /** 工具层硬断言 */
    tools?: {
      shouldCall?: string[];
      shouldNotCall?: string[];
      /** 对某个工具的关键入参断言：{ 工具名: { 参数名: matcher } } */
      args?: Record<string, Record<string, ArgMatcher>>;
    };
    /** 喂给 LLM-judge 的评分标准；省略则跳过质量评分 */
    rubric?: string;
    /**
     * 是否额外评「深度/充分度」维度（用 judgeDepth，复用 rubric 作为针对性标准）。
     * 专门用于开放问答类用例——量化「太浅/太短」。需要 rubric 才生效。
     */
    expectDepth?: boolean;
    /** 是否检查幻觉（回复是否只基于工具返回数据） */
    checkFaithfulness?: boolean;
  };
}

/** 确定性评分结果 */
export interface DeterministicScore {
  toolChoicePass: boolean;
  toolChoiceReason: string;
  argsPass: boolean;
  argsReason: string;
}

/** LLM-judge 评分结果（单次） */
export interface JudgeScore {
  /** 1-5 */
  score: number;
  pass: boolean;
  reason: string;
}

/** 单条用例单次运行的完整结果 */
export interface CaseRunResult {
  finalText: string;
  toolCalls: { name: string; args: unknown; result: string }[];
  iterations: number;
  totalMs: number;
  deterministic: DeterministicScore;
  /** 质量评分（多次采样的均值 + 每次采样明细），无 rubric 时为 null */
  quality: {
    mean: number;
    passRate: number;
    /** 每次采样的分数与理由，便于校准/追溯 judge 判断 */
    samples: { score: number; reason: string }[];
  } | null;
  /** 深度/充分度评分（多次采样），未开启 expectDepth 时为 null */
  depth: {
    mean: number;
    passRate: number;
    samples: { score: number; reason: string }[];
  } | null;
  /** 幻觉检查（多次采样），未开启时为 null */
  faithfulness: { hallucinated: boolean; reason: string } | null;
}

/** 一条用例跑 k 次后的汇总 */
export interface CaseReport {
  id: string;
  desc: string;
  runs: number;
  /** k 次里工具选择通过的次数 */
  toolChoicePassCount: number;
  argsPassCount: number;
  qualityMean: number | null;
  /** depth 维度多次运行的均分（无 expectDepth 的用例为 null） */
  depthMean: number | null;
  hallucinationCount: number;
  avgIterations: number;
  avgLatencyMs: number;
  /** 每次运行的明细，用于排查 */
  details: CaseRunResult[];
}
