import { useState, useCallback, useEffect } from "react";
import { Button, Input } from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { ChatHistory } from "@client/entities";
import ChatList from "../ChatList";
import SenderPanel from "../SenderPanel";
import type { ChatMode } from "../SenderPanel";
import styles from "./index.module.less";

/** 按深入会话 id 持久化「追加」区内容，避免刷新或暂离后丢失 */
const EXTRA_CONTEXT_STORAGE_PREFIX = "deepdive:extraContext:";

function readStoredExtraContext(sessionId: string): string {
  if (typeof window === "undefined" || !sessionId) return "";
  try {
    return localStorage.getItem(EXTRA_CONTEXT_STORAGE_PREFIX + sessionId) ?? "";
  } catch {
    return "";
  }
}

function writeStoredExtraContext(sessionId: string, value: string) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    if (value.trim()) {
      localStorage.setItem(EXTRA_CONTEXT_STORAGE_PREFIX + sessionId, value);
    } else {
      localStorage.removeItem(EXTRA_CONTEXT_STORAGE_PREFIX + sessionId);
    }
  } catch {
    /* quota / private mode */
  }
}

export interface DeepDivePanelProps {
  initialContext: string;
  deepDiveSessionId: string;
  messages: ChatHistory[];
  sending?: boolean;
  onBack: () => void;
  onSubmit: (value: string, mode: ChatMode, context: string, deepDiveSessionId: string) => void;
  onCancel: () => void;
}

const DeepDivePanel = ({
  initialContext,
  deepDiveSessionId,
  messages,
  sending,
  onBack,
  onSubmit,
  onCancel,
}: DeepDivePanelProps) => {
  const [extraContext, setExtraContext] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  useEffect(() => {
    if (!deepDiveSessionId) {
      setExtraContext("");
      setShowExtra(false);
      return;
    }
    const stored = readStoredExtraContext(deepDiveSessionId);
    setExtraContext(stored);
    setShowExtra(!!stored.trim());
  }, [deepDiveSessionId]);

  const onExtraContextChange = useCallback(
    (value: string) => {
      setExtraContext(value);
      writeStoredExtraContext(deepDiveSessionId, value);
    },
    [deepDiveSessionId]
  );

  const buildContext = useCallback(() => {
    if (!extraContext.trim()) return initialContext;
    return `${initialContext}\n---\n${extraContext.trim()}`;
  }, [initialContext, extraContext]);

  const handleSubmit = useCallback(
    (value: string, mode: ChatMode) => {
      onSubmit(value, mode, buildContext(), deepDiveSessionId);
    },
    [onSubmit, buildContext, deepDiveSessionId]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className={styles.backBtn}
        >
          返回
        </Button>
        <span className={styles.title}>深入模式</span>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => setShowExtra((v) => !v)}
          className={styles.appendBtn}
        >
          追加
        </Button>
      </div>

      {showExtra && (
        <div className={styles.extraEditor}>
          <Input.TextArea
            value={extraContext}
            onChange={(e) => onExtraContextChange(e.target.value)}
            placeholder="在此粘贴额外文本，AI 将基于原始上下文 + 追加内容回答"
            autoSize={{ minRows: 3, maxRows: 8 }}
          />
        </div>
      )}

      <div className={styles.chatArea}>
        <ChatList
          messages={messages}
          loading={!!sending}
          onRetry={() => {}}
        />
      </div>

      <div className={styles.senderWrap}>
        <SenderPanel
          onSubmit={handleSubmit}
          sending={sending}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export default DeepDivePanel;
