import { Bubble, BubbleProps, Welcome } from "@ant-design/x";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";
import styles from "./index.module.less";
import { Typography } from "antd";
import markdownit from "markdown-it";
import { RobotOutlined } from "@ant-design/icons";

interface ChatListProps {
  messages: BubbleDataType[];
  loading: boolean;
  onRetry: () => void;
}

const md = markdownit({ html: true, breaks: true });
const renderMarkdown: BubbleProps["messageRender"] = (content) => (
  <Typography>
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
);

const AiAvatar = () => (
  <div className={styles.aiAvatar}>
    <RobotOutlined />
  </div>
);

const roles: Parameters<typeof Bubble.List>[0]["roles"] = {
  ai: {
    avatar: <AiAvatar />,
    placement: "start",
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 16,
        background: "#f7f8fc",
        border: "1px solid #eef0f8",
        color: "#1a1d2e",
      },
    },
  },
  local: {
    placement: "end",
    variant: "shadow",
    styles: {
      content: {
        borderRadius: 16,
        background: "linear-gradient(135deg, #5B6EF5 0%, #7C8FF7 100%)",
        color: "#fff",
        border: "none",
        boxShadow: "0 2px 12px rgba(91,110,245,0.25)",
      },
    },
  },
};

const ChatList = ({ messages }: ChatListProps) => (
  <div className={styles.chatList}>
    {messages?.length ? (
      <Bubble.List
        style={{ overflowY: "auto", height: "100%", padding: "24px 0 8px" }}
        items={messages.map((message) => ({
          ...message,
          messageRender: renderMarkdown,
        }))}
        roles={roles}
        autoScroll
      />
    ) : (
      <div className={styles.welcome}>
        <Welcome
          icon={<AiAvatar />}
          title="你好，我是 Todor"
          description="你的 AI 私人助手。可以帮你聊天、创建待办、发送提醒邮件，或使用 Agent 完成更复杂的任务。"
          className={styles.welcomeCard}
        />
      </div>
    )}
  </div>
);

export default ChatList;
