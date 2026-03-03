import { sendMessage } from "@client/api";
import { useState } from "react";

import dayjs from "dayjs";
import { HistRecordItem } from "./useChat";

const getLocation = (): Promise<{ lat: number; lon: number } | undefined> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(undefined), // 用户拒绝或超时，静默降级到 IP 定位
      { timeout: 3000 }
    );
  });
};

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
    setLoading(true);

    if (loading) return;

    try {
      const ctime = dayjs().format("YYYY-MM-DD HH:mm:ss");

      // 先添加用户消息
      await addMessage({
        content: value,
        role: "local",
        date: ctime,
        todoId: '',
      });

      // 尝试获取用户精确位置（失败不影响发送，降级到 IP 定位）
      const location = await getLocation();

      console.log(location);
      // 发送消息到服务器
      const { output, messageId: todoMessageId } = await sendMessage({ input: value, location });

      // 添加AI回复
      await addMessage({
        content: output as unknown as string,
        role: "ai",
        date: ctime,
        todoId: todoMessageId,
      });
    } catch (error) {
      console.error("Message send failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log("cancel");
    // TODO: 取消发送消息 暂时不做
  };

  return {
    handleSubmit,
    handleCancel,
    handleRetry,
    loading,
  };
};
