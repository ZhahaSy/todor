import { DynamicStructuredTool } from '@langchain/core/tools';
import type { z } from 'zod';

/**
 * 用 zod schema 构造 DynamicStructuredTool 的统一入口。
 *
 * 直接 `new DynamicStructuredTool({ schema: zodObject, ... })` 会触发
 * TS2589（类型实例化过深）—— LangChain 把 zod schema 展开成工具签名时泛型深度超限。
 * 这里把构造器收窄为宽松签名再调用，规避深层推导，结果仍是运行时正确的 DynamicStructuredTool。
 * 所有需要动态/用户态 schema 的工具都应走这个 helper，避免在各处重复 @ts 抑制。
 */
const NarrowedCtor = DynamicStructuredTool as unknown as new (cfg: {
  name: string;
  description: string;
  schema: unknown;
  func: (input: Record<string, any>) => Promise<string>;
}) => DynamicStructuredTool;

export function makeStructuredTool(cfg: {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  func: (input: any) => Promise<string>;
}): DynamicStructuredTool {
  return new NarrowedCtor(cfg);
}
