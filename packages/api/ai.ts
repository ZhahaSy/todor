import request from "@client/request";

export const sendMessage = async (data: {
  input: string;
  location?: { lat: number; lon: number };
}) => {
    return await request.post("/ai/message", data)
}