import React, { useState, useCallback, useRef } from "react";
import { ChatList, SenderPanel, DeepDivePanel } from "@client/ui";
import type { ChatMode } from "@client/ui";
import styles from "./index.module.less";
import { useChat, useSendMessage } from "@client/hooks";
import { sendMessage } from "@client/api";
import { ChatHistory } from "@client/entities";

const serializeMessages = (messages: ChatHistory[]): string => {
  return messages
    .map((m) => {
      const role = m.role === "ai" ? "AI" : "用户";
      return `${role}: ${m.content ?? ""}`;
    })
    .join("\n");
};

const Independent: React.FC = () => {
  const { messages, addMessage, loadingMore, hasMore, loadMore } = useChat();
  const { handleSubmit, handleCancel, handleRetry, loading } =
    useSendMessage(addMessage);

  // 深入模式状态
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveContext, setDeepDiveContext] = useState("");
  const [deepDiveSessionId, setDeepDiveSessionId] = useState("");
  const [deepDiveMessages, setDeepDiveMessages] = useState<ChatHistory[]>([]);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const deepDiveLoadingRef = useRef(false);

  const handleEnterDeepDive = useCallback(
    async (_index: number) => {
      const sessionId = crypto.randomUUID();
      const context = serializeMessages(messages);

      setDeepDiveContext(context);
      setDeepDiveSessionId(sessionId);
      setDeepDiveMessages([]);
      setDeepDiveOpen(true);

      // 新 session 不需要加载历史（全新会话）
    },
    [messages]
  );

  const handleDeepDiveSubmit = useCallback(
    async (value: string, _mode: ChatMode, context: string, sessionId: string) => {
      if (deepDiveLoadingRef.current) return;
      deepDiveLoadingRef.current = true;
      setDeepDiveLoading(true);

      const userMsg: ChatHistory = {
        role: "local",
        content: value,
        date: new Date().toISOString(),
        todoId: "",
      };
      setDeepDiveMessages((prev) => [...prev, userMsg]);

      try {
        const answer = await sendMessage({
          input: value,
          mode: "deepdive",
          context,
          deepDiveSessionId: sessionId,
        });

        const aiMsg: ChatHistory = {
          role: "ai",
          content: answer,
          date: new Date().toISOString(),
          todoId: "",
        };
        setDeepDiveMessages((prev) => [...prev, aiMsg]);
      } catch (error) {
        console.error("DeepDive message send failed:", error);
      } finally {
        deepDiveLoadingRef.current = false;
        setDeepDiveLoading(false);
      }
    },
    []
  );

  const handleDeepDiveBack = useCallback(() => {
    setDeepDiveOpen(false);
  }, []);

  return (
    <div className={styles.chat} style={{ position: "relative" }}>
      <ChatList
        messages={messages}
        loading={loading}
        onRetry={handleRetry}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onDeepDive={handleEnterDeepDive}
      />
      <div className={styles.senderWrap}>
        <SenderPanel
          onSubmit={handleSubmit}
          sending={loading}
          onCancel={handleCancel}
        />
      </div>

      {deepDiveOpen && (
        <DeepDivePanel
          initialContext={deepDiveContext}
          deepDiveSessionId={deepDiveSessionId}
          messages={deepDiveMessages}
          sending={deepDiveLoading}
          onBack={handleDeepDiveBack}
          onSubmit={handleDeepDiveSubmit}
          onCancel={() => { deepDiveLoadingRef.current = false; setDeepDiveLoading(false); }}
        />
      )}
    </div>
  );
};

export default Independent;
