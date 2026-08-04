import React, { useEffect, useCallback, useRef, useState } from "react";
import { ChatList, SenderPanel, DeepDivePanel } from "@client/ui";
import type { ChatMode } from "@client/ui";
import styles from "./index.module.less";
import { useChat, useSendMessage, useDeepDiveChat } from "@client/hooks";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChatHistory } from "@client/entities";
import PresenceScene, { PresenceMode } from "@/components/PresenceScene";
import ImmersiveMode from "@/components/ImmersiveMode";

const serializeMessages = (messages: ChatHistory[]): string =>
  messages
    .map((m) => `${m.role === "ai" ? "AI" : "用户"}: ${m.content ?? ""}`)
    .join("\n");

const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionParam = searchParams.get("session"); // 已有深度会话
  const isNewDeepDive = searchParams.get("new") === "1"; // 新建深度会话（从侧边栏点「新建深入」）

  // 主对话
  const {
    messages,
    addMessage,
    appendToLastAiContent,
    replaceLastAiContent,
    initialLoading,
    error,
    reload,
    loadingMore,
    hasMore,
    loadMore,
  } = useChat();
  const { handleSubmit, handleCancel, loading } = useSendMessage({
    addMessage,
    appendToLastAiContent,
    replaceLastAiContent,
  });
  const [presenceMode, setPresenceMode] = useState<PresenceMode>("idle");
  const [immersive, setImmersive] = useState(false);

  const handlePresenceSubmit = useCallback(
    async (value: string, mode: ChatMode = "chat") => {
      setPresenceMode("listening");
      await handleSubmit(value, mode);
    },
    [handleSubmit]
  );

  useEffect(() => {
    if (loading) setPresenceMode("thinking");
    else if (presenceMode === "thinking") setPresenceMode("idle");
  }, [loading, presenceMode]);

  // 深度对话
  const deepDive = useDeepDiveChat();
  const contextRef = useRef("");

  // 进入已有 session
  useEffect(() => {
    if (sessionParam) {
      deepDive.loadSession(sessionParam);
    }
  }, [sessionParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // 新建深度会话：侧边栏「新建深入」不带主对话背景；消息「深入」用 handleEnterDeepDive
  useEffect(() => {
    if (isNewDeepDive) {
      contextRef.current = "";
      const sid = deepDive.startNewSession(contextRef.current);
      // 将 URL 切换到新 session，去掉 ?new=1
      navigate(`/chat?session=${sid}`, { replace: true });
    }
  }, [isNewDeepDive]); // eslint-disable-line react-hooks/exhaustive-deps

  // 消息「深入」按钮：用当前消息列表生成 context，新建 session
  const handleEnterDeepDive = useCallback(() => {
    contextRef.current = serializeMessages(messages);
    const sid = deepDive.startNewSession(contextRef.current);
    navigate(`/chat?session=${sid}`);
  }, [messages, deepDive, navigate]);

  const handleDeepDiveBack = useCallback(() => {
    deepDive.reset();
    navigate("/chat");
  }, [deepDive, navigate]);

  // 判断当前是否在深度模式
  const isDeepDive = !!(sessionParam || isNewDeepDive);

  if (isDeepDive) {
    return (
      <div className={styles.chat}>
        <DeepDivePanel
          initialContext={contextRef.current}
          deepDiveSessionId={deepDive.sessionId || sessionParam || ""}
          messages={deepDive.messages}
          sending={deepDive.loading}
          onBack={handleDeepDiveBack}
          onSubmit={(_value, _mode, context, sid) => deepDive.submit(_value, context, sid)}
          onCancel={deepDive.cancel}
        />
      </div>
    );
  }

  if (immersive) {
    return (
      <div className={styles.chat}>
        <ImmersiveMode
          messages={messages}
          loading={loading}
          presenceMode={presenceMode}
          onSubmit={handlePresenceSubmit}
          onCancel={handleCancel}
          onExit={() => setImmersive(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.chat}>
      <PresenceScene
        mode={presenceMode}
        lastUserMessage={messages.filter((message) => message.role === "local").at(-1)?.content}
        actionLabel="沉浸"
        onAction={() => setImmersive(true)}
      />
      <ChatList
        messages={messages}
        loading={loading}
        initialLoading={initialLoading}
        error={error}
        onRetry={reload}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onDeepDive={handleEnterDeepDive}
      />
      <div className={styles.senderWrap}>
        <SenderPanel
          onSubmit={handlePresenceSubmit}
          sending={loading}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default ChatPage;
