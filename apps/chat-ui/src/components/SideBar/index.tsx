import styles from "./index.module.less";
import UserSelector from "./UserSelector";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  WechatOutlined,
  ScheduleOutlined,
  SettingOutlined,
  BranchesOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Menu, Tooltip } from "antd";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getDeepDiveSessions } from "@client/api";
import type { DeepDiveSession } from "@client/api";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<DeepDiveSession[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // 加载深度会话列表
  useEffect(() => {
    getDeepDiveSessions()
      .then(setSessions)
      .catch(() => {});
  }, [location.pathname]); // 每次导航时刷新

  const activeSessionId = new URLSearchParams(location.search).get("session");

  const menuItems = [
    {
      label: "Chat",
      icon: <WechatOutlined />,
      key: "chat",
      children: [
        {
          key: "chat-main",
          label: "主对话",
          icon: <WechatOutlined style={{ fontSize: 12 }} />,
        },
        ...sessions.map((s) => ({
          key: `deepdive-${s.sessionId}`,
          label: (
            <Tooltip title={s.title} placement="right">
              <span className={styles.sessionLabel}>{s.title}</span>
            </Tooltip>
          ),
          icon: <BranchesOutlined style={{ fontSize: 12 }} />,
        })),
        {
          key: "deepdive-new",
          label: "新建深入",
          icon: <PlusOutlined style={{ fontSize: 12 }} />,
        },
      ],
    },
    { label: "My Todo", icon: <ScheduleOutlined />, key: "myTodo" },
    { label: "Setting", icon: <SettingOutlined />, key: "setting" },
  ];

  // 计算当前选中 key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith("/todo")) return "myTodo";
    if (path.startsWith("/setting")) return "setting";
    if (path.startsWith("/chat")) {
      if (activeSessionId) return `deepdive-${activeSessionId}`;
      return "chat-main";
    }
    return "chat-main";
  };

  const handleClick = ({ key }: { key: string }) => {
    if (key === "myTodo") return navigate("/todo");
    if (key === "setting") return navigate("/setting");
    if (key === "chat-main") return navigate("/chat");
    if (key === "deepdive-new") return navigate("/chat?new=1");
    if (key.startsWith("deepdive-")) {
      const sid = key.replace("deepdive-", "");
      navigate(`/chat?session=${sid}`);
    }
  };

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.topBar}>
        <UserSelector isShowName={!collapsed} />
      </div>

      <div className={`${styles.conversationList} ${styles.withSubMenu}`}>
        <Menu
          style={{ background: "none", border: "none", flex: 1 }}
          inlineIndent={16}
          mode="inline"
          inlineCollapsed={collapsed}
          items={menuItems}
          selectedKeys={[getSelectedKey()]}
          defaultOpenKeys={["chat"]}
          onClick={handleClick}
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
