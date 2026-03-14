import request from "@client/request";

export const sendMessage = async (data: { input: string; mode?: string }) => {
    return await request.post("/ai/message", data)
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