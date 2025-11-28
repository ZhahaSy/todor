import request from "@client/request";

export const getChatHistory = async () => {
  const data = await request.get("/chat-history");
  return data;
};
export const addChatHistory = async (data: {
  content: string;
  role: "ai" | "local";
  date: string;
}) => {
  const res = await request.post("/chat-history", data);
  return res;
};
