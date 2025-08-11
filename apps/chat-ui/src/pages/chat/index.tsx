import React, { useEffect } from "react";
import { ChatList, SenderPanel } from "@client/ui";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import { Conversation } from "@ant-design/x/es/conversations";
import { useChat, useSendMessage } from "@client/hooks";
import Todo from "@/components/Todo";
import useUserStore from "@/store/useUserStore";
const Independent: React.FC = () => {
  const { getUserList } = useUserStore();
  useEffect(() => {
    getUserList();
  }, []);

  // ==================== State =================

  const { messages, addMessage } = useChat();

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [curConversation, setCurConversation] = React.useState("");
  // ==================== Logic =================
  const { handleSubmit, handleCancel, handleRetry, loading } = useSendMessage(addMessage);

  const handleAddConversation = () => {
    setConversations([
      ...conversations,
      { title: "New Conversation", key: Date.now().toString() },
    ]);
    setCurConversation(Date.now().toString());
  };

  // ==================== Render =================
  return (
    <div className={styles.layout}>
      <Sidebar
        conversations={conversations}
        activeKey={curConversation}
        onConversationChange={setCurConversation}
        onAddConversation={handleAddConversation}
      />

      <div className={styles.chat}>
        <ChatList messages={messages} loading={loading} onRetry={handleRetry} />
        <SenderPanel
          onSubmit={handleSubmit}
          sending={loading}
          onCancel={handleCancel}
        />
      </div>
      <Todo />
    </div>
  );
};

export default Independent;
