import React from "react";
import ChatList from "./components/ChatList";
import SenderPanel from "./components/SenderPanel";
import styles from "./App.module.less";
import Sidebar from "./components/SideBar";
import { Conversation } from "@ant-design/x/es/conversations";
import { useChat } from "./hooks/useChat";
import { sendMessage } from "./api/ai";
import Todo from "./components/Todo";
const Independent: React.FC = () => {
  // ==================== State =================
  const [loading, setLoading] = React.useState(false);

  const { messages, addMessage } = useChat();

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [curConversation, setCurConversation] = React.useState("");
  // ==================== Logic =================
  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (value: string) => {
    setLoading(true); // 立即显示加载状态

    if(loading) return;
    
    try {
      // 先添加用户消息
      await addMessage(value, "local");

      // 发送消息到服务器
      const answer = await sendMessage({ input: value });

      // 添加AI回复
      await addMessage(answer as string, "ai");
    } catch (error) {
      console.error("Message send failed:", error);
    } finally {
      setLoading(false); // 无论成功失败都关闭加载状态
    }
  };

  const handleCancel = () => {
    console.log("cancel");
    // TODO: 取消发送消息 暂时不做
    // 取消发送消息的逻辑
  };

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
        <SenderPanel onSubmit={handleSubmit} sending={loading} onCancel={handleCancel} />
      </div>
      <Todo />
    </div>
  );
};

export default Independent;
