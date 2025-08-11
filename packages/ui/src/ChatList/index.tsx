import { Bubble, BubbleProps, Welcome } from "@ant-design/x";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";

import styles from "./index.module.less";
import { GetProp, Typography } from "antd";
import markdownit from "markdown-it";

import aiAvatar from "../assets/todor-2d-no-bg.png";

export interface ChatListProps {
  messages: BubbleDataType[];
  loading: boolean;
  onRetry: () => void;
}

const md = markdownit({ html: true, breaks: true });
const renderMarkdown: BubbleProps["messageRender"] = (content) => (
  <Typography>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
);

const roles: GetProp<typeof Bubble.List, "roles"> = {
  ai: {
    avatar: <img src={aiAvatar} width={40} height={40} />,
    placement: "start",
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 16,
      },
    },
  },
  local: {
    placement: "end",
    variant: "shadow",
    styles: {
      content: {
        borderRadius: 16,
        background: "yellowGreen",
      },
    },
  },
};

const ChatList = ({ messages }: ChatListProps) => (
  <div className={styles.chatList}>
    {messages?.length ? (
      <Bubble.List
        style={{ overflowY: "auto", height: "100%" }}
        items={messages.map((message) => ({
          ...message,
          messageRender: renderMarkdown,
        }))}
        roles={roles}
        autoScroll
      />
    ) : (
      <Welcome
        title="你好，我是你的私人助手。"
        description="你可以和我聊天。也可以让我帮你解决问题。"
      />
    )}
  </div>
);

export default ChatList;
