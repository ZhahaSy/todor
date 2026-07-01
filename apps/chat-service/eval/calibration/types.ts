/**
 * 校准（calibration）相关类型。
 *
 * 校准的目的：量化 LLM-judge 有多可信。做法是把现有报告里的真实样本"冻结"成一批不变的
 * 考卷，由人给出金标准（gold），再让 judge 反复判这批固定样本，比对人机一致率。
 *
 * 关键：校准只重跑 judge，绝不重跑 agent —— agent 非确定，重跑样本就变了，校准就失去对照。
 */

/** 冻结的校准样本（一条 = 一次 agent 运行的产物，作为 judge 的"考卷"） */
export interface CalibrationSample {
  /** 全局唯一 id，如 weather-01#0 */
  id: string;
  caseId: string;
  /** 用户输入 */
  input: string;
  /** AI 最终回复 */
  finalText: string;
  /** 该次运行工具返回的数据（faithfulness 判断的依据） */
  toolData: string[];
  /** 用例的 rubric（quality 维度需要） */
  rubric?: string;
  /** 该样本参与哪些维度的校准 */
  dimensions: Array<'faithfulness' | 'quality'>;
}

/** 人工金标准（先由助手预标，再由人复核） */
export interface GoldLabel {
  id: string;
  faithfulness?: { hallucinated: boolean; reason: string };
  quality?: { score: number; reason: string };
  /** 是否已被人复核确认；预标为 false，人改完置 true */
  humanVerified: boolean;
}
