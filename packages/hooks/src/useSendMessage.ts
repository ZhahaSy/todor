import { sendMessage } from "@client/api";
import { useState } from "react";

import dayjs from "dayjs";
import { HistRecordItem } from "./useChat";

export const useSendMessage = (
  addMessage: (message: HistRecordItem) => void
) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (value: string) => {
    setLoading(true); // 立即显示加载状态

    if (loading) return;
    

    try {

      const ctime = dayjs().format("YYYY-MM-DD");
      // 先添加用户消息
      await addMessage({
        content: value,
        role: "local",
        date: ctime,
        id: '',
      });

      // 发送消息到服务器
      const { output, messageId: aiMessageId } = await sendMessage({ input: value });

      // 添加AI回复
      await addMessage({
        content: output as unknown as string,
        role: "ai",
        date: ctime,
        id: aiMessageId,
      });
    } catch (error) {
      console.error("Message send failed:", error);
    } finally {
      setLoading(false); // 无论成功失败都关闭加载状态
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
};
