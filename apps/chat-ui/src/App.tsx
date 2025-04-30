import React, {  } from 'react';
import ChatList from './components/ChatList';
import SenderPanel from './components/SenderPanel';
import styles from './App.module.less';
import Sidebar from './components/SideBar';
import { Conversation } from '@ant-design/x/es/conversations';
import { useChat } from './hooks/useChat';
import { sendMessage } from '../../../packages/aiService';

const Independent: React.FC = () => {

  // ==================== State =================
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const {messages, addMessage} = useChat('test-01')

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [curConversation, setCurConversation] = React.useState('');
  // ==================== Logic =================
  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleSubmit = async (value: string) => {
    setInputValue('');
    // 添加消息到消息列表
    addMessage(value,'local');
    
    // 发送消息到服务器
    const answer = await sendMessage(value);

    console.log(answer);
    
    addMessage(answer as unknown as string,'ai');

    setLoading(true);
  }

  const handleCancel = () => {
    setInputValue('');
  }

  const handleAddConversation = () => {
    setConversations([...conversations, { title: 'New Conversation', key: Date.now().toString() }]);
    setCurConversation(Date.now().toString());
  }

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
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default Independent;