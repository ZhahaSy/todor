import { Injectable, Logger } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AiModelProvider } from '../ai/ai-model.provider';

/**
 * 记忆抽取器：读一句用户消息，判断里面有没有值得长期记住的、关于用户的事实，
 * 并输出结构化判断。**只判断，不写库**（无副作用）—— 这是"先验证再开自动写入闸"的前提。
 *
 * 设计：核心逻辑 extractWithModel(model, input) 接收 model 实例，使得生产侧（注入
 * AiModelProvider）和离线 eval 侧（直接传 createChatModel）能共用同一抽取逻辑。
 *
 * 见 docs/long-term-memory-design.md §3（评分=价值×确信）。
 */

/** User 实体里可被对话更新的字段（命中则 routeToUserField 填字段名，否则进 user_memory） */
const USER_FIELDS = ['job', 'address', 'work_address', 'schedule', 'hobby', 'age', 'gender'];

export interface ExtractedMemory {
  value: 'high' | 'medium' | 'low';
  confidence: 'stated' | 'inferred';
  category: 'health' | 'preference' | 'relationship' | 'goal' | 'profile_extra' | 'other';
  subject: string; // self / 关系人或宠物名
  temporality: 'permanent' | 'temporal';
  sensitivity: 'normal' | 'sensitive';
  content: string;
  source: string;
  routeToUserField: string | null;
  expiresHint?: string | null;
}

const EXTRACT_PROMPT = `你是一个"用户记忆抽取器"。读用户的一句话，判断里面有没有**值得长期记住的、关于用户本人或其重要关系人/宠物的事实**，并输出结构化 JSON。

判断规则（严格遵守）：
1. 只记"关于用户本人或其重要关系人/宠物"的稳定事实。**无关第三方一律不放进数组。**
   - "我朋友老王对海鲜过敏" → 老王是无关第三方，过敏的不是用户 → 输出 []（不记）。
   - "我爸对花生过敏" → 父亲是用户重要关系人 → 可记，subject="父亲"。
2. 假设句（"要是我…的话"）、情绪/时效性内容（"今天好累""刚吃了饭"）**一律不放进数组**。
   - "要是我对麸质过敏的话…" → 假设，用户并不过敏 → 输出 []。
   - "今天被领导骂了好烦" → 情绪 → 输出 []。
3. value（价值）：①关于用户 ②稳定（未来还成立）③未来用得上 —— 三者全中=high，中一两个=medium，全不中=low。
4. confidence：用户第一人称直接陈述=stated；任何需要推测的=inferred。**拿不准一律判 inferred。**
5. 用户当场改口（"我不喜欢X……啊不对，我是说Y"）只记最终成立的 Y，不记被否定的 X。
6. category: health/preference/relationship/goal/profile_extra/other。
7. subject: 用户本人填 "self"；关系人/宠物填名称（如"父亲""猫:咪"）。
8. temporality: 永久属性=permanent；有时限的状态（备考/减肥/手术）=temporal，并给 expiresHint 软线索。
9. sensitivity: 健康/财务/隐私=sensitive，否则 normal。
10. routeToUserField: 若该事实命中以下 User 字段语义则填字段名，否则 null。User 字段：${USER_FIELDS.join('、')}。
    （细粒度偏好如"喜欢喝美式"不算 hobby，应 routeToUserField=null 进 user_memory。）
11. **一句话可能包含多个事实**（如"我是程序员，喜欢爬山，对海鲜过敏"有3个），逐条拆开，每个事实一个对象。

只输出一个 JSON 数组，不要任何额外文字、不要 markdown。没有任何值得记的事实则输出 []。
数组每个元素：
{"value":"high|medium|low","confidence":"stated|inferred","category":"...","subject":"self|名称","temporality":"permanent|temporal","sensitivity":"normal|sensitive","content":"精炼的事实陈述","source":"用户原话","routeToUserField":null或字段名,"expiresHint":null或线索}
注意：数组里的每条都是"已判定该记"的事实；不该记的（无关第三方/假设/情绪）直接不放进数组。`;

@Injectable()
export class MemoryExtractorService {
  private readonly logger = new Logger(MemoryExtractorService.name);

  constructor(private readonly aiModelProvider: AiModelProvider) {}

  /** 生产入口：用注入的 model provider 抽取，返回 0~N 条该记的事实 */
  async extract(input: string): Promise<ExtractedMemory[]> {
    return extractWithModel(this.aiModelProvider.getModel(0), input);
  }
}

const FIELD_DEFAULTS = {
  value: 'medium' as const,
  confidence: 'inferred' as const,
  category: 'other' as const,
  subject: 'self',
  temporality: 'permanent' as const,
  sensitivity: 'normal' as const,
  routeToUserField: null,
  expiresHint: null,
};

/**
 * 核心抽取逻辑（与 service 解耦，eval 可直接传 model 调用）。
 * 输出该记的事实数组（一句话可能 0~N 条）。解析失败返回 []（保守：宁漏勿错）。
 */
export async function extractWithModel(
  model: BaseChatModel,
  input: string,
): Promise<ExtractedMemory[]> {
  try {
    const res = await model.invoke([
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: input },
    ]);
    const text =
      typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((o) => o && typeof o.content === 'string' && o.content.length > 0)
      .map((o) => ({
        ...FIELD_DEFAULTS,
        ...o,
        source: o.source ?? input,
      })) as ExtractedMemory[];
  } catch {
    return [];
  }
}
