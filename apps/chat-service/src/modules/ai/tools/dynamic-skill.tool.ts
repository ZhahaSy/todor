import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { Skill } from '../../skill/entities/skill.entity';
import { makeStructuredTool } from './make-structured-tool';

type JsonSchemaType = 'string' | 'number' | 'boolean';

interface JsonSchemaProperty {
  type: JsonSchemaType;
  description?: string;
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * 将 JSON Schema 转换为 Zod schema
 * 支持 string / number / boolean 类型字段
 */
function jsonSchemaToZod(jsonSchema: JsonSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set(jsonSchema.required ?? []);
  const properties = jsonSchema.properties ?? {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;

    switch (prop.type) {
      case 'number':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      default:
        field = z.string();
    }

    if (prop.description) {
      field = field.describe(prop.description);
    }

    if (!required.has(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return z.object(shape);
}

/**
 * 工厂函数：根据 Skill 记录生成 DynamicStructuredTool 实例。
 * 用 DynamicStructuredTool（而非 extends StructuredTool）避免 zod 泛型深度溢出（TS2589/TS2740）。
 */
export function createDynamicSkillTool(skill: Skill): DynamicStructuredTool {
  const logger = new Logger(`DynamicSkillTool:${skill.name}`);

  let parsedSchema: JsonSchema = {};
  try {
    parsedSchema = JSON.parse(skill.inputSchema || '{}') as JsonSchema;
  } catch {
    logger.warn(`inputSchema 解析失败，使用空 schema`);
  }

  const zodSchema = jsonSchemaToZod(parsedSchema);

  const callWebhook = async (
    input: Record<string, any>,
  ): Promise<string> => {
    let config: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      timeout?: number;
    };

    try {
      config = JSON.parse(skill.config) as typeof config;
    } catch {
      return `skill config 解析失败`;
    }

    try {
      const method = (config.method ?? 'POST').toUpperCase();

      // 替换 URL 中的路径参数 {param}，并从 body 中移除已替换的字段
      let url = config.url;
      const bodyInput = { ...input };
      for (const [key, val] of Object.entries(input)) {
        const placeholder = `{${key}}`;
        if (url.includes(placeholder)) {
          url = url.split(placeholder).join(encodeURIComponent(String(val)));
          delete bodyInput[key];
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout ?? 10000);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...config.headers },
          body: method !== 'GET' ? JSON.stringify(bodyInput) : undefined,
          signal: controller.signal,
        });
        const data = await res.json();
        return JSON.stringify(data);
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      logger.error(`webhook 调用失败: ${err.message}`);
      return `调用失败：${err.message}`;
    }
  };

  // DynamicStructuredTool + 动态 zod schema 会触发 TS2589，统一走 makeStructuredTool 规避。
  return makeStructuredTool({
    name: skill.name,
    description: skill.description,
    schema: zodSchema,
    func: async (input: Record<string, any>): Promise<string> => {
      logger.log(`调用 skill: ${skill.name}, input=${JSON.stringify(input)}`);
      switch (skill.executionType) {
        case 'flow':
          return 'flow execution not yet supported';
        case 'single':
        default:
          return callWebhook(input);
      }
    },
  });
}
