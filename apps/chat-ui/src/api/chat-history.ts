import request from "../request";

export const getChatHistory = async () => {
  const data = await request.get("/chat-history");
  return data;
};
export const addChatHistory = async (data: {
  content: string;
  role: "ai" | "local";
}) => {
  const res = await request.post("/chat-history", data);
  return res;
};
