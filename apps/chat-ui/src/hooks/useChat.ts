import { useState, useEffect } from 'react';
import localforage from 'localforage';

// 防抖时间配置（单位：毫秒）
const DEBOUNCE_TIME = 500;

export interface HistRecordItem {
    id: string;
    user: "local" | "ai";
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
    addMessage: (content: string, user: 'local' | 'ai') => Promise<boolean>;
}

/**
 * useChat
 * @param {string} chat_list_key 聊天列表键名
 * @returns {ReturnType} 返回值 
 * @description 使用 localforage 存储聊天记录，并提供添加聊天记录的方法，
 * 
*/
export const useChat = (chat_list_key: string): ReturnType => {
  const [messages, setMessages] = useState<HistRecordItem[]>([]);
  const [pendingSave, setPendingSave] = useState<HistRecordItem[]>([]);

  // 初始化加载本地数据
  useEffect(() => {
    localforage.getItem<HistRecordItem[]>(chat_list_key)
      .then(data => data && setMessages(data))
      .catch(console.error);
  }, [chat_list_key]);

  // 防抖保存机制
  useEffect(() => {
    if (pendingSave.length === 0) return;

    const timer = setTimeout(() => {
      localforage.setItem(chat_list_key, pendingSave)
        .catch(console.error);
      setPendingSave([]);
    }, DEBOUNCE_TIME);

    return () => clearTimeout(timer);
  }, [pendingSave, chat_list_key]);

  const addMessage = async (content: string, user: string): Promise<boolean> => {
    try {
      const newMessage: HistRecordItem = {
        id: Date.now().toString(),
        user: user as "local" | "ai",
        content,
        date: Date.now(),
      };

      // 先更新UI状态
      setMessages(prev => [...prev, newMessage]);
      
      // 异步更新待保存队列（不阻塞渲染）
      setPendingSave(prev => [...prev, newMessage]);
      
      return true;
    } catch (error) {
      console.error('Message add failed:', error);
      return false;
    }
  };

  return { messages, addMessage };
};