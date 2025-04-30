import { useState, useEffect } from "react";
import localforage from "localforage";

export interface HistRecordItem {
  id: string;
  role: "local" | "ai";
  content: string;
  date: number;
}
export type ReturnType = {
  /**
   * 聊天记录
   * @type {HistRecordItem[]}
   */
  messages: HistRecordItem[];
  /**
   * 添加聊天记录
   * @param {string} content 聊天内容
   * @returns {Promise<boolean>} 是否成功
   */
  addMessage: (content: string, user: "local" | "ai") => Promise<boolean>;
};

/**
 * useChat
 * @param {string} chat_list_key 聊天列表键名
 * @returns {ReturnType} 返回值
 * @description 使用 localforage 存储聊天记录，并提供添加聊天记录的方法，
 *
 */
export const useChat = (chat_list_key: string): ReturnType => {
  const [messages, setMessages] = useState<HistRecordItem[]>([]);

  // 初始化加载本地数据
  useEffect(() => {
    localforage
      .getItem<HistRecordItem[]>(chat_list_key)
      .then((data) => data && setMessages(data))
      .catch(console.error);
  }, [chat_list_key]);

  const updateMessage = (newMessage: HistRecordItem[]) => {
    console.log(messages, "updateMessage");
    
    localforage.setItem(chat_list_key, newMessage).catch(console.error);
  }

  const addMessage = async (
    content: string,
    user: string
  ): Promise<boolean> => {
    try {
      const newMessage: HistRecordItem = {
        id: Date.now().toString(),
        role: user as "local" | "ai",
        content,
        date: Date.now(),
      };


      // 先更新UI状态
      setMessages((prev) => {
        const newDataList = [...prev, newMessage]
        updateMessage(newDataList)
        return newDataList;
      });

      
      return true;
    } catch (error) {
      console.error("Message add failed:", error);
      return false;
    }
  };

  return { messages, addMessage };
};
