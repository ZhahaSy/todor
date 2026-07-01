/**
 * Eval runner：构造一个"生产同构但副作用隔离"的 AgentChatService 并跑一条用例。
 *
 * - 模型：真 DeepSeek（复用生产同款 ChatOpenAI 配置）。agent 的工具选择决策必须是真的，
 *   否则 eval 失去意义。
 * - Redis：内存桩（覆盖 RedisChatMemory 用到的 4 个方法），每条用例独立、互不串记忆。
 * - Skill：空（eval 只评内置工具）。
 * - 工具：mock 桩（隔离天气 API / DB / 邮件副作用，见 mocks.ts）。
 *
 * 工具调用从 agent 自报的 RunTrace 读，不靠桩记账。
 */

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { AgentChatService } from '../src/modules/ai/agent-chat.service';
import type { InputData } from '../src/modules/ai/ai.service';
import type { RunTrace } from '../src/modules/ai/agent-events';
import {
  weatherToolMock,
  databaseQueryToolMock,
  createReminderToolMock,
  saveMemoryToolMock,
  recallMemoryToolMock,
  deleteMemoryToolMock,
} from './mocks';
import type { EvalCase } from './types';

/** 生产同款的模型配置（与 ai-model.provider 保持一致） */
function createChatModel(temperature: number): ChatOpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置（eval 需要真实模型）');
  const model = process.env.AI_MODEL || 'deepseek-chat';
  const baseURL =
    process.env.DEEPSEEK_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.deepseek.com';
  const timeout = Number(process.env.AI_REQUEST_TIMEOUT_MS || '60000');
  return new ChatOpenAI({
    apiKey,
    model,
    temperature,
    timeout,
    configuration: { baseURL },
  });
}

/** 仅暴露 getModel，形状匹配 AiModelProvider 被 agent 使用的部分 */
function makeModelProvider(temperature: number) {
  const instance = createChatModel(temperature);
  return { getModel: () => instance } as any;
}

/** 内存 Redis 桩（与 agent-chat.service.spec 同款），每个实例独立 store */
function makeRedisService() {
  const store: Record<string, string[]> = {};
  const client = {
    lrange: async (key: string, start: number, end: number) => {
      const list = store[key] ?? [];
      const len = list.length;
      const s = start < 0 ? Math.max(len + start, 0) : start;
      const e = end < 0 ? len + end : end;
      return list.slice(s, e + 1);
    },
    rpush: async (key: string, val: string) => {
      store[key] = store[key] ?? [];
      store[key].push(val);
      return store[key].length;
    },
    expire: async () => 1,
    ltrim: async () => 'OK',
  };
  return { getClient: () => client } as any;
}

const skillServiceStub = { findEnabled: async () => [] } as any;

const DEFAULT_USER = {
  id: 'eval-user',
  name: '小明',
  email: 'eval@example.com',
  age: 28,
  gender: 'male',
  hobby: '跑步',
};

/** 把一条用例跑一次，返回 RunTrace */
export async function runCase(
  evalCase: EvalCase,
  temperature = 0.7,
): Promise<RunTrace> {
  const svc = new AgentChatService(
    makeModelProvider(temperature),
    makeRedisService(),
    skillServiceStub,
    weatherToolMock as any,
    databaseQueryToolMock as any,
    createReminderToolMock as any,
    saveMemoryToolMock as any,
    recallMemoryToolMock as any,
    deleteMemoryToolMock as any,
  );

  const inputData: InputData = {
    input: evalCase.input,
    userInfo: { ...DEFAULT_USER, ...(evalCase.context?.user ?? {}) } as any,
    userId: DEFAULT_USER.id,
    location: evalCase.context?.location,
  };

  const gen = svc.stream(inputData);
  let step = await gen.next();
  while (!step.done) {
    step = await gen.next();
  }
  return step.value;
}

export { createChatModel };
