/**
 * Eval 用的工具桩。
 *
 * 真实工具会打外部天气 API、写 SQLite、排程邮件 —— eval 里必须隔离这些副作用，否则
 * 既不可复现（天气每次不同）、又有破坏性（真发邮件 / 真写库）。
 *
 * 桩只做两件事：① 返回固定的确定性结果，让最终回复可复现；② 形状与真实工具一致
 * （bindUser(ctx) → { name, invoke }），可直接注入 AgentChatService 构造器。
 *
 * 注意：「工具被调了没、入参对不对」不靠桩记账，而是从 agent 自报的 RunTrace 读 ——
 * 这正是 agent-events 改造的价值，桩只管隔离副作用。
 */

import { makeStructuredTool } from '../src/modules/ai/tools/make-structured-tool';
import { reminderSchema } from '../src/modules/ai/tools/create-reminder.tool';
import { z } from 'zod';

const noopSchema = z.object({}).passthrough();

function stubTool(name: string, description: string, result: string) {
  return {
    bindUser: () =>
      makeStructuredTool({
        name,
        description,
        schema: noopSchema,
        func: async () => result,
      }),
  };
}

/**
 * 带真实 schema 的桩：仅隔离副作用（func 返回固定结果），但**沿用生产同款的字段定义与
 * describe**。用于 create_reminder 这类「参数正确性」是评估重点的工具 —— 若桩用空 schema，
 * 模型拿不到字段引导会乱传，eval 就测不出真实工具 schema 描述的好坏（实测会凭空夸大 bug）。
 */
function stubToolWithSchema(
  name: string,
  description: string,
  schema: Parameters<typeof makeStructuredTool>[0]['schema'],
  result: string,
) {
  return {
    bindUser: () =>
      makeStructuredTool({ name, description, schema, func: async () => result }),
  };
}

/** 天气桩：固定返回北京晴 25°C，不打 open-meteo */
export const weatherToolMock = stubTool(
  'weather_query',
  '查询实时天气信息。适合用户问"今天天气怎么样""现在几度""要带伞吗"等场景。',
  '📍 北京 当前天气\n🌡️ 气温：25°C（体感 26°C）\n🌤️ 天气：晴天\n💧 湿度：40%\n🌬️ 风速：10 km/h\n🌧️ 降水量：0 mm',
);

/** 待办查询桩：固定返回两条待办，不读 DB */
export const databaseQueryToolMock = stubTool(
  'database_query',
  '查询用户的待办事项列表。适合用户问"我有什么待办""今天要做什么"等场景。',
  '你有 2 条待办：\n1. 写周报（工作，高优先级，今天 18:00）\n2. 买菜（生活，低优先级，今天 20:00）',
);

/** 建待办桩：用生产同款 schema（带字段引导），只隔离写库/排程副作用 */
export const createReminderToolMock = stubToolWithSchema(
  'create_reminder',
  '创建一个待办事项并安排邮件提醒。适合用户说"提醒我...""帮我记录...""设置提醒..."等场景。',
  reminderSchema,
  '✅ 待办已创建并设置提醒（eval 桩，未真正写库）',
);

/** 记忆工具桩（save/recall/delete）：隔离 DB，只验证 agent 的工具选择 */
export const saveMemoryToolMock = stubTool(
  'save_memory',
  '记住一条关于用户的长期事实。仅在用户明确要求记住时调用，如"记一下我对花生过敏"。一次性事件请用 create_reminder。',
  '✅ 已记住（eval 桩）',
);

export const recallMemoryToolMock = stubTool(
  'recall_memory',
  '查询关于用户的长期记忆（过敏、偏好、目标、关系等）。回答需用到用户个人事实、或用户问"你记得我…吗"时调用。',
  '查到 1 条相关记忆：\n- 对花生过敏（health）',
);

export const deleteMemoryToolMock = stubTool(
  'delete_memory',
  '删除/遗忘关于用户的某条长期记忆。用户明确要求"别记…了""忘掉我的…"时调用。',
  '✅ 已忘记 1 条相关记忆（eval 桩）',
);
