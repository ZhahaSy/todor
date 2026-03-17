import React, { useEffect, useCallback, useRef } from "react";
import { ChatList, SenderPanel, DeepDivePanel } from "@client/ui";
import styles from "./index.module.less";
import { useChat, useSendMessage, useDeepDiveChat } from "@client/hooks";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChatHistory } from "@client/entities";

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
  const { messages, addMessage, loadingMore, hasMore, loadMore } = useChat();
  const { handleSubmit, handleCancel, handleRetry, loading } = useSendMessage(addMessage);

  // 深度对话
  const deepDive = useDeepDiveChat();
  const contextRef = useRef("");

  // 进入已有 session
  useEffect(() => {
    if (sessionParam) {
      deepDive.loadSession(sessionParam);
    }
  }, [sessionParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // 新建深度会话（从侧边栏 or 从消息「深入」按钮）
  useEffect(() => {
    if (isNewDeepDive) {
      contextRef.current = serializeMessages(messages);
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

  const handleDeepDiveSubmit = useCallback(
    (value: string) => {
      deepDive.submit(value, contextRef.current, deepDive.sessionId || sessionParam || "");
    },
    [deepDive, sessionParam]
  );

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

  return (
    <div className={styles.chat}>
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
    </div>
  );
};

export default ChatPage;
