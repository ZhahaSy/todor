import { Button } from "antd";
import { PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import Conversations, { Conversation } from "@ant-design/x/es/conversations";

import styles from "./index.module.less";
import UserSelector from "./UserSelector";
import logo from "@/assets/todor-text-no-bg.png";

interface SidebarProps {
  conversations: Conversation[];
  activeKey: string;
  onConversationChange: (key: string) => void;
  onAddConversation: () => void;
}

const Sidebar = ({
  conversations,
  activeKey,
  onConversationChange,
  onAddConversation,
}: SidebarProps) => (
  <div className={styles.sidebar}>
    <img src={logo} width={'100%'} alt="logo" />
    {/* Logo 和新建会话按钮 */}
    <Button onClick={onAddConversation} icon={<PlusOutlined />}>
      新建会话
    </Button>

    {/* 会话列表 */}
    <Conversations
      className={styles.conversationList}
      items={conversations}
      activeKey={activeKey}
      onActiveChange={onConversationChange}
    />

    {/* 底部栏 */}
    <div className={styles.footerBar}>
      {/* 增加用户选择器 */}
      <UserSelector />
      <Button icon={<QuestionCircleOutlined />} />
    </div>
  </div>
);

export default Sidebar;
