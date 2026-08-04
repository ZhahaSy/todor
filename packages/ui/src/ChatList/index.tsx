import { Bubble, BubbleProps, Welcome } from "@ant-design/x";
import type { BubbleListRef } from "@ant-design/x/es/bubble/BubbleList";
import { Spin, Result, Button } from "antd";
import { useRef, useEffect, useCallback } from "react";

import styles from "./index.module.less";
import { GetProp } from "antd";
import markdownit from "markdown-it";

import MessageFooter from "./MessageFooter";

import aiAvatar from "../assets/todor-2d-no-bg.png";

import { ChatHistory } from "@client/entities";

export interface ChatListProps {
  messages: ChatHistory[];
  loading: boolean;
  initialLoading?: boolean;
  error?: string | null;
  loadingMore?: boolean;
  hasMore?: boolean;
  onRetry: () => void;
  onLoadMore?: () => void;
  onDeepDive?: () => void;
}

const md = markdownit({ html: true, breaks: true });
const renderMarkdown: BubbleProps["messageRender"] = (content) => (
  // {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
  <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
);

const roles: GetProp<typeof Bubble.List, "roles"> = {
  ai: {
    avatar: <img src={aiAvatar} width={40} height={40} />,
    placement: "start",
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        textAlign: "left",
        borderRadius: 16,
      },
    },
  },
  local: {
    placement: "end",
    variant: "shadow",
    styles: {
      content: {
        textAlign: "left",
        borderRadius: 16,
        background: "linear-gradient(135deg, #5B6EF5 0%, #7C8FF7 100%)",
        color: "#fff",
      },
    },
  },
};

const ChatList = ({
  messages,
  initialLoading = false,
  error,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onDeepDive,
  onRetry,
}: ChatListProps) => {
  const listRef = useRef<BubbleListRef>(null);
  // 记录触顶加载前的 scrollHeight，加载后恢复滚动位置
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  // 触顶加载时保存滚动位置
  const handleScroll = useCallback(() => {
    const el = listRef.current?.nativeElement;
    if (!el) return;

    if (el.scrollTop === 0 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
      onLoadMore?.();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // 加载完成后恢复滚动位置，避免跳屏
  useEffect(() => {
    const el = listRef.current?.nativeElement;
    if (!el || loadingMore) return;
    if (prevScrollHeightRef.current > 0) {
      const diff = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = prevScrollTopRef.current + diff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length, loadingMore]);

  if (initialLoading) {
    return (
      <div className={styles.chatList}>
        <div className={styles.centerTip}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatList}>
        <div className={styles.centerTip}>
          <Result
            status="error"
            title="加载失败"
            subTitle={error}
            extra={<Button type="primary" onClick={onRetry}>重试</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatList}>
      {messages?.length ? (
        <>
          {loadingMore && (
            <div className={styles.loadMoreTip}>
              <Spin size="small" />
            </div>
          )}
          {!hasMore && messages.length > 0 && (
            <div className={styles.noMoreTip}>没有更早的记录了</div>
          )}
          <Bubble.List
            ref={listRef}
            className={styles.bubbleList}
            onScroll={handleScroll}
            items={messages.map((message) => ({
              ...message,
              messageRender: renderMarkdown,
              footer: () => {
                return (
                  <MessageFooter
                    curMessage={message}
                    onDeepDive={onDeepDive}
                  />
                );
              },
            }))}
            roles={roles}
            autoScroll
          />
        </>
      ) : (
        <Welcome
          title="和他打个招呼。"
          description="他住在上面的空间里，你可以随时进去坐一会儿。"
        />
      )}
    </div>
  );
};

export default ChatList;
