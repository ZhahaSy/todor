import { useState, useEffect } from "react";
import { addChatHistory, getChatHistory } from "@client/api";

export interface HistRecordItem {
  role: "local" | "ai";
  content: string;
  date: string;
  todoId: string;
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
  addMessage: (message: HistRecordItem) => Promise<boolean>;
};

/**
 * useChat
 * @param {string} chat_list_key 聊天列表键名
 * @returns {ReturnType} 返回值
 * @description 使用 localforage 存储聊天记录，并提供添加聊天记录的方法，
 *
 */
export const useChat = (): ReturnType => {
  const [messages, setMessages] = useState<HistRecordItem[]>([]);

  const getMessages = async () => {
    try {
      const data = await getChatHistory();
      setMessages(data);  
      return data;
    } catch (error) {
      console.error("Failed to get messages:", error);
      return [];
    }
  }

  // 初始化加载本地数据
  useEffect(() => {
    getMessages();
  }, []);

  const updateMessage = async (newMessage: HistRecordItem) => {
    
    return await addChatHistory(newMessage)
  }

  const addMessage = async (
    {role, content, date, todoId}: HistRecordItem
  ): Promise<boolean> => {
    try {
      const newMessage: HistRecordItem = {
        role,
        content,
        date,
        todoId,
      };


      // 先更新UI状态
      setMessages((prev) => {
        const newDataList = [...prev, newMessage]
        return newDataList;
      });

      // 再更新后台数据
      updateMessage(newMessage)

      
      return true;
    } catch (error) {
      console.error("Message add failed:", error);
      return false;
    }
  };

  return { messages, addMessage };
};
