import request from "@client/request";

export const getChatHistory = async (params?: { limit?: number; offset?: number }) => {
  const data = await request.get("/chat-history", { params });
  return data as { list: unknown[]; total: number };
};
export const addChatHistory = async (data: {
  content: string;
  role: "ai" | "local";
  date: string;
}) => {
  const res = await request.post("/chat-history", data);
  return res;
};
