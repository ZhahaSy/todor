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
import logo from "@/assets/todor-text-no-bg.png";
import { useNavigate } from "react-router-dom";

interface SidebarProps {}

const Sidebar = (props: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const navigate = useNavigate();

  const items = [
    {
      label: "chat",
      icon: <WechatOutlined />,
      key: "chat",
      path: "/chat",
    },
    {
      label: "my todo",
      icon: <ScheduleOutlined />,
      key: "myTodo",
      path: "/todo",
    },
    {
      label: "setting",
      icon: <SettingOutlined />,
      key: "setting",
      path: "/setting",
    },
  ];

  return (
    <div className={styles.sidebar}>
      {/* top 栏 */}
      <div className={styles.topBar}>
        {/* 增加用户选择器 */}
        <UserSelector />
        {/* <Button icon={<QuestionCircleOutlined />} /> */}
      </div>

      {/* 菜单 */}
      <div
        className={styles.conversationList}
        style={{ display: 'flex' ,flexDirection: 'column' }}
      >
        <Menu
          style={{ background: "none", flex: 1 }}
          inlineIndent={26}
          mode="inline"
          inlineCollapsed={collapsed}
          items={items}
          onClick={({ key }) => {
            navigate(items.find((item) => item.key === key)?.path || '/');
          }}
        />
        <Button
          type="text"
          onClick={toggleCollapsed}
          style={{ marginBottom: 16, width: collapsed ? 'auto' : 200 }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
