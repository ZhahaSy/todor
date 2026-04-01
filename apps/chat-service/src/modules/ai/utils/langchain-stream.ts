import type { BaseMessageChunk } from '@langchain/core/messages';

/** 从 LangChain 流式 chunk 中取出可展示的文本增量 */
export function extractTokenText(chunk: unknown): string {
  if (chunk == null || typeof chunk !== 'object') return '';
  const c = chunk as BaseMessageChunk & { text?: string; delta?: string };
  if (typeof c.text === 'string' && c.text.length > 0) return c.text;
  if (typeof c.delta === 'string' && c.delta.length > 0) return c.delta;

  const content = c.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  return '';
}
