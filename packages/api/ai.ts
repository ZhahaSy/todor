import request from "@client/request";

export const sendMessage = async (data: { input: string; mode?: string }): Promise<string> => {
    const res = await request.post<unknown, { output: string; intent: string; messageId?: string }>("/ai/message", data)
    return res.output
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