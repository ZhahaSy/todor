import { sendMessage } from "@client/api";
import { useState } from "react";

import { HistRecordItem } from "./useChat";

export const useSendMessage = (
  addMessage: (message: HistRecordItem) => Promise<boolean>
) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (value: string, mode: string = "chat") => {
    setLoading(true);

    if (loading) return;

    try {
      await addMessage({ role: "local", content: value, date: new Date().toISOString(), todoId: "" });

      const answer = await sendMessage({ input: value, mode });

      await addMessage({ role: "ai", content: answer, date: new Date().toISOString(), todoId: "" });
    } catch (error) {
      console.error("Message send failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log("cancel");
    // TODO: 取消发送消息 暂时不做
    // 取消发送消息的逻辑
  };

  return {
    handleSubmit,
    handleCancel,
    handleRetry,
    loading,
  };
}
