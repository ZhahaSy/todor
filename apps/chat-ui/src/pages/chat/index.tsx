import React from "react";
import { ChatList, SenderPanel } from "@client/ui";
import styles from "./index.module.less";
import { useChat, useSendMessage } from "@client/hooks";
import Todo from "@/components/Todo";
const Independent: React.FC = () => {


  // ==================== State =================

  const { messages, addMessage } = useChat();

  // ==================== Logic =================
  const { handleSubmit, handleCancel, handleRetry, loading } =
    useSendMessage(addMessage);

  // ==================== Render =================
  return (
    <>
      <div className={styles.chat}>
        <ChatList messages={messages} loading={loading} onRetry={handleRetry} />
        <SenderPanel
          onSubmit={handleSubmit}
          sending={loading}
          onCancel={handleCancel}
        />
      </div>
      <Todo />
    </>
  );
};

export default Independent;
