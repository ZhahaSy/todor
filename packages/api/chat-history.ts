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
