import { useState, useCallback, useEffect, useRef } from "react";
import { Button, Input } from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { ChatHistory } from "@client/entities";
import ChatList from "../ChatList";
import SenderPanel from "../SenderPanel";
import type { ChatMode } from "../SenderPanel";
import styles from "./index.module.less";
import {
  getDeepDiveExtraContext,
  upsertDeepDiveExtraContext,
} from "@client/api";

const SAVE_DEBOUNCE_MS = 500;

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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extraContextRef = useRef("");
  extraContextRef.current = extraContext;

  useEffect(() => {
    if (!deepDiveSessionId) {
      setExtraContext("");
      setShowExtra(false);
      return;
    }
    let cancelled = false;
    getDeepDiveExtraContext(deepDiveSessionId)
      .then((res) => {
        if (cancelled) return;
        const text = res.extraContext ?? "";
        setExtraContext(text);
        setShowExtra(!!text.trim());
      })
      .catch(() => {
        if (!cancelled) {
          setExtraContext("");
          setShowExtra(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deepDiveSessionId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const scheduleSave = useCallback(
    (value: string) => {
      if (!deepDiveSessionId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void upsertDeepDiveExtraContext(deepDiveSessionId, value).catch(console.error);
      }, SAVE_DEBOUNCE_MS);
    },
    [deepDiveSessionId]
  );

  const onExtraContextChange = useCallback(
    (value: string) => {
      setExtraContext(value);
      scheduleSave(value);
    },
    [scheduleSave]
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
            onBlur={() => {
              if (deepDiveSessionId) {
                if (saveTimerRef.current) {
                  clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = null;
                }
                void upsertDeepDiveExtraContext(
                  deepDiveSessionId,
                  extraContextRef.current
                ).catch(console.error);
              }
            }}
            placeholder="在此粘贴额外文本，AI 将基于原始上下文 + 追加内容回答（已保存到云端）"
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
