import request from "@client/request";

export const getChatHistory = async (params?: { limit?: number; offset?: number; sessionId?: string }) => {
  const data = await request.get("/chat-history", { params });
  return data as { list: unknown[]; total: number };
};
export const addChatHistory = async (data: {
  content: string;
  role: "ai" | "local";
  date: string;
  sessionId?: string;
  title?: string;
}) => {
  const res = await request.post("/chat-history", data);
  return res;
};

export interface DeepDiveSession {
  sessionId: string;
  title: string;
  lastDate: string;
}

export const getDeepDiveSessions = async (): Promise<DeepDiveSession[]> => {
  const data = await request.get("/chat-history/sessions");
  return data as unknown as DeepDiveSession[];
};

/** 深入模式「追加」文本（存数据库） */
export const getDeepDiveExtraContext = async (
  sessionId: string
): Promise<{ extraContext: string }> => {
  const data = await request.get("/chat-history/deep-dive/extra", {
    params: { sessionId },
  });
  return data as { extraContext: string };
};

export const upsertDeepDiveExtraContext = async (
  sessionId: string,
  extraContext: string
): Promise<void> => {
  await request.put("/chat-history/deep-dive/extra", {
    sessionId,
    extraContext: extraContext ?? "",
  });
};

/** 删除整个深入会话（消息、追加文本、Redis 记忆） */
export const deleteDeepDiveSession = async (sessionId: string): Promise<void> => {
  await request.delete("/chat-history/deep-dive/session", {
    params: { sessionId },
  });
};
