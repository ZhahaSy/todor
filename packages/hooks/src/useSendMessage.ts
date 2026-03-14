import { sendMessage } from "@client/api";
import { useState } from "react";

export const useSendMessage = (
  addMessage: (content: string, type: string) => void
) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (value: string, mode: string = "chat") => {
    setLoading(true); // 立即显示加载状态

    if (loading) return;

    try {
      // 先添加用户消息
      await addMessage(value, "local");

      // 发送消息到服务器
      const answer = await sendMessage({ input: value, mode });

      // 添加AI回复
      await addMessage(answer as unknown as string, "ai");
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
}
