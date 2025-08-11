import request from "@client/request";

export const sendMessage = async (data: {input: string}) => {
    return await request.post("/ai/message", data)
}