import { useState, useCallback, useRef } from "react";
import { addChatHistory, getChatHistory, sendMessageStream } from "@client/api";
import type { ChatHistory } from "@client/entities";

/** 纯 HTTP（非安全上下文）下 randomUUID 不可用；会话 id 只用 getRandomValues，避免打包/运行环境差异 */
function newDeepDiveSessionId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const h = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return `dd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

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
    const sid = newDeepDiveSessionId();
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

      const aiDate = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "", date: aiDate, todoId: "" } as ChatHistory,
      ]);

      try {
        await sendMessageStream(
          {
            input: value,
            mode: "deepdive",
            context,
            deepDiveSessionId: sid,
          },
          {
            onToken: (t) => {
              if (abortRef.current) return;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                if (last.role !== "ai") return prev;
                const next = [...prev];
                next[next.length - 1] = {
                  ...last,
                  content: last.content + t,
                };
                return next;
              });
            },
            onDone: ({ output }) => {
              if (abortRef.current) return;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                if (last.role !== "ai") return prev;
                const next = [...prev];
                next[next.length - 1] = { ...last, content: output };
                return next;
              });
              addChatHistory({
                content: output,
                role: "ai",
                date: aiDate,
                sessionId: sid,
              }).catch(console.error);
            },
            onError: (msg) => {
              console.error("deep dive stream:", msg);
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                if (last.role !== "ai") return prev;
                const next = [...prev];
                next[next.length - 1] = { ...last, content: "⚠️ 消息发送失败，请重试" };
                return next;
              });
            },
          }
        );
      } catch (e) {
        if (!abortRef.current) {
          console.error("deep dive submit failed", e);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.role !== "ai") return prev;
            const next = [...prev];
            next[next.length - 1] = { ...last, content: "⚠️ 消息发送失败，请重试" };
            return next;
          });
        }
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
