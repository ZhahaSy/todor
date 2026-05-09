import { sendMessageStream, addChatHistory } from "@client/api";
import { useState } from "react";

import { HistRecordItem } from "./useChat";

export type UseSendMessageDeps = {
  addMessage: (
    message: HistRecordItem,
    options?: { skipPersist?: boolean }
  ) => Promise<boolean>;
  appendToLastAiContent: (delta: string) => void;
  replaceLastAiContent: (full: string) => void;
};

export const useSendMessage = ({
  addMessage,
  appendToLastAiContent,
  replaceLastAiContent,
}: UseSendMessageDeps) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (
    value: string,
    mode: string = "chat",
    context?: string,
    deepDiveSessionId?: string
  ) => {
    if (loading) return;
    setLoading(true);

    try {
      await addMessage({
        role: "local",
        content: value,
        date: new Date().toISOString(),
        todoId: "",
      });

      const aiDate = new Date().toISOString();
      await addMessage(
        { role: "ai", content: "", date: aiDate, todoId: "" },
        { skipPersist: true }
      );

      await sendMessageStream(
        { input: value, mode, context, deepDiveSessionId },
        {
          onToken: (t) => appendToLastAiContent(t),
          onDone: ({ output }) => {
            replaceLastAiContent(output);
            void addChatHistory({
              content: output,
              role: "ai",
              date: aiDate,
            });
          },
          onError: (msg) => {
            console.error("stream:", msg);
            replaceLastAiContent("⚠️ 消息发送失败，请重试");
          },
        }
      );
    } catch (error) {
      console.error("Message send failed:", error);
      replaceLastAiContent("⚠️ 消息发送失败，请重试");
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
