/**
 * Agent 运行的结构化事件 / trace。
 *
 * 设计取舍：本项目的 agent 是**手写**的流式 tool-calling 循环（见 agent-chat.service.ts），
 * 工具不是经由 LangChain 的 AgentExecutor / RunnableSequence 调用，而是循环里直接 `tool.invoke()`。
 * 因此 LangChain 原生的 `callbacks`（handleToolStart/End）抓不到这些工具调用 —— 那套回调只在
 * runnable 链路内触发。
 *
 * 既然循环本身就持有每一步的全部信息（调了哪个工具、入参、返回、耗时、第几轮），最准确、
 * 最低成本的做法就是由循环直接 emit 这些事件、并在结束时收敛成一份 RunTrace。
 * 这份 trace 同时服务两个目的：
 *  1. 生产可观测性（可经 SSE 推前端做"正在查天气…"之类的工具调用可视化）
 *  2. 离线 eval（断言"该调的工具调了没、参数对不对"，见 eval/）
 */

/** agent 流式产出的事件 */
export type AgentStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      result: string;
      ok: boolean;
      ms: number;
    };

/** 一次工具调用的完整记录 */
export interface ToolCallRecord {
  name: string;
  args: unknown;
  result: string;
  /** 工具是否成功执行（执行抛错或工具不存在为 false） */
  ok: boolean;
  /** 执行耗时（毫秒） */
  ms: number;
}

/** 一次 agent 运行的完整 trace，由 stream() 在结束时 return */
export interface RunTrace {
  /** 最终面向用户的回复全文 */
  finalText: string;
  /** 本次运行按发生顺序记录的所有工具调用 */
  toolCalls: ToolCallRecord[];
  /** 循环实际迭代轮数 */
  iterations: number;
  /** 整个运行的墙钟耗时（毫秒） */
  totalMs: number;
}
