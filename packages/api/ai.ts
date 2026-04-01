import request from "@client/request";

export const sendMessage = async (data: { input: string; mode?: string; context?: string; deepDiveSessionId?: string }): Promise<string> => {
    const res = await request.post<unknown, { output: string; intent: string; messageId?: string }>("/ai/message", data)
    return res.output
}

export interface SendMessageStreamPayload {
  input: string;
  mode?: string;
  context?: string;
  deepDiveSessionId?: string;
}

export interface SendMessageStreamDonePayload {
  output: string;
  intent: string;
  messageId?: number;
  data?: unknown;
}

export type SendMessageStreamHandlers = {
  onIntent?: (intent: string) => void;
  onToken?: (text: string) => void;
  onDone?: (payload: SendMessageStreamDonePayload) => void;
  onError?: (message: string) => void;
};

/** SSE：POST /api/ai/message/stream，与 Vite 代理一致使用同源相对路径 */
export async function sendMessageStream(
  body: SendMessageStreamPayload,
  handlers: SendMessageStreamHandlers,
  init?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch("/api/ai/message/stream", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: init?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `请求失败 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  const flushBlock = (block: string) => {
    const lines = block.split("\n");
    let eventName = "message";
    const dataParts: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
    }
    if (dataParts.length === 0) return;
    const raw = dataParts.join("\n");
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (eventName === "intent" && typeof data.intent === "string") {
      handlers.onIntent?.(data.intent);
    } else if (eventName === "token") {
      const d = data as Record<string, unknown>;
      const raw = d.t ?? d.text ?? d.delta;
      if (raw != null && String(raw) !== "") {
        handlers.onToken?.(String(raw));
      }
    } else if (eventName === "done") {
      handlers.onDone?.({
        output: String(data.output ?? ""),
        intent: String(data.intent ?? "chat"),
        messageId: typeof data.messageId === "number" ? data.messageId : undefined,
        data: data.data,
      });
    } else if (eventName === "error") {
      handlers.onError?.(String(data.message ?? "请求失败"));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\n\n/);
    buffer = chunks.pop() ?? "";
    for (const c of chunks) {
      if (c.trim()) flushBlock(c.replace(/\r/g, ""));
    }
  }
  if (buffer.trim()) flushBlock(buffer.replace(/\r/g, ""));
}

export const recognizeAudio = async (data: {
    audioData: string;
    format: string;
    dataLen: number;
    engineModelType?: string;
})=> {
    const res = await request.post("/ai/asr/recognize", data)
    return res
}