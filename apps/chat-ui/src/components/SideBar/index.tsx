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
  AppstoreOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Button, Menu, Tooltip, Popconfirm, message } from "antd";
import type { MenuProps } from "antd";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { deleteDeepDiveSession, getDeepDiveSessions } from "@client/api";
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
            <div className={styles.sessionRow}>
              <Tooltip title={s.title} placement="right">
                <span className={styles.sessionLabel}>{s.title}</span>
              </Tooltip>
              <span
                data-dd-delete
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Popconfirm
                  title="删除此深入会话？"
                  description="将删除该会话下所有消息与追加内容，不可恢复。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={async () => {
                    try {
                      await deleteDeepDiveSession(s.sessionId);
                      message.success("已删除");
                      const list = await getDeepDiveSessions();
                      setSessions(list);
                      const cur = new URLSearchParams(location.search).get("session");
                      const norm = (x: string) => x.replace(/^deepdive:/, "");
                      if (cur && norm(cur) === norm(s.sessionId)) {
                        navigate("/chat");
                      }
                    } catch {
                      message.error("删除失败");
                    }
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                  />
                </Popconfirm>
              </span>
            </div>
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
    { label: "技能库", icon: <AppstoreOutlined />, key: "skillHub" },
    { label: "Setting", icon: <SettingOutlined />, key: "setting" },
  ];

  // 计算当前选中 key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith("/todo")) return "myTodo";
    if (path.startsWith("/skill-hub")) return "skillHub";
    if (path.startsWith("/setting")) return "setting";
    if (path.startsWith("/chat")) {
      if (activeSessionId) return `deepdive-${activeSessionId}`;
      return "chat-main";
    }
    return "chat-main";
  };

  const handleMenuClick: MenuProps["onClick"] = ({ key, domEvent }) => {
    if ((domEvent.target as HTMLElement).closest("[data-dd-delete]")) {
      return;
    }
    if (key === "myTodo") return navigate("/todo");
    if (key === "skillHub") return navigate("/skill-hub");
    if (key === "setting") return navigate("/setting");
    if (key === "chat-main") return navigate("/chat");
    if (key === "deepdive-new") return navigate("/chat?new=1");
    if (key.startsWith("deepdive-")) {
      const sid = key.replace("deepdive-", "");
      navigate(`/chat?session=${encodeURIComponent(sid)}`);
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
          onClick={handleMenuClick}
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
