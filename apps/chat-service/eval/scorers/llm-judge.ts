/**
 * LLM-as-judge 评分器（用 DeepSeek）。
 *
 * 处理确定性断言覆盖不了的开放式维度：
 *  - quality：回复是否切题、是否真的回答了用户问题（按用例 rubric，打 1-5）
 *  - faithfulness：回复中的事实是否只来自工具返回数据，有没有编造（幻觉检查）
 *
 * 工程要点：
 *  - temperature=0 + 结构化输出（json），不解析自由文本
 *  - judge 与被测是同一家模型，存在"自我偏好"偏差，已在 README 注明为已知局限
 *  - judge 本身有噪声，故由 run.ts 多次采样取均值（见 sampleQuality）
 */

import { createChatModel } from '../runner';
import type { JudgeScore } from '../types';

/** 让 judge 只输出一个 JSON，手动解析（避免 withStructuredOutput 的 zod 深度推导问题） */
async function askJudgeJson(prompt: string): Promise<Record<string, unknown>> {
  const model = createChatModel(0);
  const res = await model.invoke([
    {
      role: 'system',
      content:
        '你是严格的评审。只输出一个 JSON 对象，不要任何额外文字、不要 markdown 代码块。',
    },
    { role: 'user', content: prompt },
  ]);
  const text =
    typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
  // 容错：剥掉可能的 ```json ``` 包裹
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`judge 未返回合法 JSON：${text.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

/** 质量评分：按 rubric 给 1-5 分 */
export async function judgeQuality(
  userInput: string,
  reply: string,
  rubric: string,
): Promise<JudgeScore> {
  const prompt = `用户问题：
${userInput}

AI 的回复：
${reply}

评分标准（rubric）：
${rubric}

请按 rubric 给这条回复打分。输出 JSON：
{"score": <1到5的整数>, "reason": "<一句话理由>"}
评分锚点：5=完全满足、切题且自然；3=基本回答但有瑕疵；1=答非所问或空洞。`;

  const obj = await askJudgeJson(prompt);
  const score = Math.max(1, Math.min(5, Number(obj.score) || 1));
  return {
    score,
    pass: score >= 4,
    reason: String(obj.reason ?? ''),
  };
}

/**
 * 深度/充分度评分：回复是否给出了「有信息增量」的内容。
 *
 * 这是为了量化「太浅/太短」专门加的维度，与 judgeQuality（测切题+自然）正交：
 * 一个简短切题的回复 quality 可能满分，但 depth 很低。
 *
 * 关键防坑：**充分 ≠ 啰嗦**。明确告知 judge 复述问题、套话、空泛建议、凑字数
 * 都不算信息增量、不加分，避免 judge 简单奖励长文本（否则改 prompt 放开长度后
 * 会出现「越啰嗦分越高」的假提升）。
 */
export async function judgeDepth(
  userInput: string,
  reply: string,
  rubric: string,
): Promise<JudgeScore> {
  const prompt = `用户问题：
${userInput}

AI 的回复：
${reply}

评分维度：回复的「深度/充分度」—— 是否给出了有用的信息增量。
本维度专门衡量回复够不够「实」，不衡量是否切题或语气（那是另一个维度）。

评分锚点（1-5 整数）：
- 5：给出了具体、可操作、有依据的内容（具体建议/关键权衡/必要细节/举例），读完真的有收获
- 4：基本充分，但还差一点关键细节或依据
- 3：正确但偏泛，多是「正确的废话」，信息增量有限
- 2：很浅，基本只是复述问题或给一两句套话
- 1：空洞，一句话打发、答非所问或纯敷衍

针对性 rubric（结合本题判断「充分」具体指什么）：
${rubric}

重要：**充分不等于啰嗦**。复述用户的问题、客套话、空泛的"要具体情况具体分析"、
为凑字数的重复展开，都不算信息增量，不加分；该简短就简短的题，简短而到位也可给高分。
判断的是「信息密度与有用性」，不是字数。

输出 JSON：{"score": <1到5的整数>, "reason": "<一句话理由，指出有/缺哪些有用信息>"}`;

  const obj = await askJudgeJson(prompt);
  const score = Math.max(1, Math.min(5, Number(obj.score) || 1));
  return {
    score,
    pass: score >= 4,
    reason: String(obj.reason ?? ''),
  };
}

/** 忠实度检查：回复里的事实是否都能在工具返回中找到依据 */
export async function judgeFaithfulness(
  userInput: string,
  reply: string,
  toolResults: string[],
): Promise<{ hallucinated: boolean; reason: string }> {
  const evidence = toolResults.length
    ? toolResults.join('\n---\n')
    : '（本次没有调用任何工具，回复应基于常识/对话，不应编造具体数据）';

  const prompt = `用户问题：
${userInput}

工具返回的事实数据（这是回复中具体数字/事实的唯一可信来源）：
${evidence}

AI 的回复：
${reply}

判断：回复里出现的具体事实（数字、天气、待办内容等）是否都能在上面的工具数据中找到依据？
如果回复编造了工具数据里没有的具体事实，算幻觉。纯寒暄/不含具体事实的回复不算幻觉。
输出 JSON：{"hallucinated": <true|false>, "reason": "<一句话理由>"}`;

  const obj = await askJudgeJson(prompt);
  return {
    hallucinated: obj.hallucinated === true,
    reason: String(obj.reason ?? ''),
  };
}
