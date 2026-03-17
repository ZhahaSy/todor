import { useState, useCallback, useRef } from "react";
import { addChatHistory, getChatHistory, sendMessage } from "@client/api";
import type { ChatHistory } from "@client/entities";

export interface UseDeepDiveChatReturn {
  messages: ChatHistory[];
  loading: boolean;
  sessionId: string;
  loadSession: (sid: string) => Promise<void>;
  startNewSession: (context: string) => string;
  submit: (value: string, context: string, sid: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export const useDeepDiveChat = (): UseDeepDiveChatReturn => {
  const [messages, setMessages] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const abortRef = useRef(false);

  const loadSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    setMessages([]);
    try {
      const res = await getChatHistory({ sessionId: sid, limit: 50, offset: 0 });
      const { list } = res as { list: ChatHistory[]; total: number };
      setMessages(list as ChatHistory[]);
    } catch (e) {
      console.error("load deep dive session failed", e);
    }
  }, []);

  const startNewSession = useCallback((context: string): string => {
    void context; // context is managed by the caller
    const sid = crypto.randomUUID();
    setSessionId(sid);
    setMessages([]);
    return sid;
  }, []);

  const submit = useCallback(
    async (value: string, context: string, sid: string) => {
      if (loading) return;
      abortRef.current = false;
      setLoading(true);

      const isFirstMessage = messages.length === 0;
      const title = isFirstMessage ? value.slice(0, 30) : undefined;

      const userMsg: ChatHistory = {
        role: "local",
        content: value,
        date: new Date().toISOString(),
        todoId: "",
      };
      setMessages((prev) => [...prev, userMsg]);

      // 持久化用户消息
      addChatHistory({
        content: value,
        role: "local",
        date: userMsg.date!,
        sessionId: sid,
        title,
      }).catch(console.error);

      try {
        const answer = await sendMessage({
          input: value,
          mode: "deepdive",
          context,
          deepDiveSessionId: sid,
        });

        if (abortRef.current) return;

        const aiMsg: ChatHistory = {
          role: "ai",
          content: answer,
          date: new Date().toISOString(),
          todoId: "",
        };
        setMessages((prev) => [...prev, aiMsg]);

        // 持久化 AI 消息
        addChatHistory({
          content: answer,
          role: "ai",
          date: aiMsg.date!,
          sessionId: sid,
        }).catch(console.error);
      } catch (e) {
        if (!abortRef.current) console.error("deep dive submit failed", e);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages.length]
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId("");
    setLoading(false);
    abortRef.current = false;
  }, []);

  return { messages, loading, sessionId, loadSession, startNewSession, submit, cancel, reset };
};
