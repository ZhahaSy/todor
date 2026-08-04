import React, { useMemo } from "react";
import { ChatHistory } from "@client/entities";
import { ChatMode, SenderPanel } from "@client/ui";
import PresenceScene, { PresenceMode } from "../PresenceScene";
import styles from "./index.module.less";

interface ImmersiveModeProps {
  messages: ChatHistory[];
  loading: boolean;
  presenceMode: PresenceMode;
  onSubmit: (value: string, mode: ChatMode) => void;
  onCancel: () => void;
  onExit: () => void;
}

const ImmersiveMode: React.FC<ImmersiveModeProps> = ({
  messages,
  loading,
  presenceMode,
  onSubmit,
  onCancel,
  onExit,
}) => {
  const recent = useMemo(() => {
    const latestUser = [...messages].reverse().find((message) => message.role === "local");
    const latestAi = [...messages].reverse().find((message) => message.role === "ai");
    return { user: latestUser?.content ?? "", ai: latestAi?.content ?? "" };
  }, [messages]);

  const history = useMemo(
    () => messages.filter((message) => message.content?.trim()).slice(-12),
    [messages]
  );

  return (
    <div className={styles.immersive}>
      <PresenceScene
        immersive
        mode={presenceMode}
        lastUserMessage={recent.user}
        speechContent={recent.ai}
        actionLabel="退出沉浸"
        onAction={onExit}
      />
      <div className={styles.overlay}>
        <div className={styles.history} aria-label="历史聊天记录">
          <div className={styles.historyTitle}>历史</div>
          {history.map((message, index) => (
            <div
              key={`${message.date}-${index}`}
              className={`${styles.historyMessage} ${message.role === "local" ? styles.historyUser : styles.historyAi}`}
            >
              <span className={styles.historySpeaker}>
                {message.role === "local" ? "我" : "元"}
              </span>
              <span className={styles.historyContent}>{message.content}</span>
            </div>
          ))}
        </div>
        <div className={styles.senderWrap}>
          <SenderPanel onSubmit={onSubmit} sending={loading} onCancel={onCancel} />
        </div>
      </div>
    </div>
  );
};

export default ImmersiveMode;
