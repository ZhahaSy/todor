import styles from "./index.module.less";
import UserSelector from "./UserSelector";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  WechatOutlined,
  ScheduleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Menu } from "antd";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: "Chat", icon: <WechatOutlined />, key: "chat", path: "/chat" },
    { label: "My Todo", icon: <ScheduleOutlined />, key: "myTodo", path: "/todo" },
    { label: "Setting", icon: <SettingOutlined />, key: "setting", path: "/setting" },
  ];

  const selectedKey = items.find((item) => location.pathname.startsWith(item.path))?.key;

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.topBar}>
        <UserSelector isShowName={!collapsed} />
      </div>

      <div className={styles.conversationList}>
        <Menu
          style={{ background: "none", border: "none", flex: 1 }}
          inlineIndent={20}
          mode="inline"
          inlineCollapsed={collapsed}
          items={items}
          selectedKeys={selectedKey ? [selectedKey] : []}
          onClick={({ key }) => {
            navigate(items.find((item) => item.key === key)?.path || "/");
          }}
        />
      </div>

      <Button
        type="text"
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        block={!collapsed}
      >
        {!collapsed && "收起"}
      </Button>
    </div>
  );
};

export default Sidebar;
