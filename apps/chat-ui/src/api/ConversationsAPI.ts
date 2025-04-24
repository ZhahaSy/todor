import localforage from "localforage";
import { nanoid } from "nanoid";

const CHAT_HIST_KEY = "chatHistory";

export interface HistRecordItem {
  id: string;
  user: "local" | "ai";
  content: string;
  date: number;
}

/**
 * addChatRecord
 *
 */
export const addChatRecord = async (histRecordItem: Omit<HistRecordItem, 'id'>) => {
  const id = nanoid();
  const mergedItem = { ...histRecordItem, id };
  const chatHistory: HistRecordItem[] | null =
    await localforage.getItem(CHAT_HIST_KEY);
  if (!chatHistory) {
    localforage.setItem(CHAT_HIST_KEY, [mergedItem]);
  } else {
    localforage.setItem(CHAT_HIST_KEY, [...chatHistory, mergedItem]);
  }
  return "success";
};

export const getChatRecord: () => Promise<HistRecordItem[]> = async () => {
  return await localforage.getItem(CHAT_HIST_KEY) || [];
};
