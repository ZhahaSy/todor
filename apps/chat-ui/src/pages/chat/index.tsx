import React from "react";
import { ChatList, SenderPanel } from "@client/ui";
import styles from "./index.module.less";
import { useChat, useSendMessage } from "@client/hooks";

const Independent: React.FC = () => {
  const { messages, addMessage, loadingMore, hasMore, loadMore } = useChat();
  const { handleSubmit, handleCancel, handleRetry, loading } =
    useSendMessage(addMessage);

  return (
    <div className={styles.chat}>
      <ChatList
        messages={messages}
        loading={loading}
        onRetry={handleRetry}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
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

export default Independent;
