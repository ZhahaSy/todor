import { useState, useCallback, useRef } from "react";
import { Sender } from "@ant-design/x";
import { Button, Tooltip, message } from "antd";
import { AudioOutlined, KeyOutlined } from "@ant-design/icons";
import { useVoiceInput } from "@client/hooks";
import styles from "./index.module.less";

export interface SenderPanelProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

const isMobileDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const SenderPanel = ({ onSubmit, onCancel, sending }: SenderPanelProps) => {
  const [value, setValue] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const isListeningRef = useRef(false);
  const isMobile = isMobileDevice();

  const { isListening, isProcessing, startListening, stopListening, cancelListening } =
    useVoiceInput({
      onTranscript: (text) => {
        if (text.trim()) onSubmit(text.trim());
      },
      onError: (err) => messageApi.error(err),
    });

  isListeningRef.current = isListening;

  // PC端：点击切换开始/停止
  const handleClick = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // 移动端：按住说话
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsCanceling(false);
      startListening();
    },
    [startListening]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isListeningRef.current) return;
      if (isCanceling) {
        cancelListening();
        messageApi.info("已取消");
      } else {
        stopListening();
      }
      setIsCanceling(false);
    },
    [isCanceling, stopListening, cancelListening, messageApi]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isListeningRef.current) return;
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const outside =
      touch.clientX < rect.left ||
      touch.clientX > rect.right ||
      touch.clientY < rect.top ||
      touch.clientY > rect.bottom;
    setIsCanceling(outside);
  }, []);

  const handleSubmit = useCallback(
    (val: string) => {
      onSubmit(val);
      setValue("");
    },
    [onSubmit]
  );

  const voiceBtnText = isProcessing
    ? "识别中…"
    : isMobile
      ? isCanceling
        ? "松开取消"
        : isListening
          ? "松开 发送"
          : "按住 说话"
      : isListening
        ? "点击停止"
        : "点击说话";

  return (
    <>
      {contextHolder}

      {voiceMode ? (
        <div className={styles.voiceBar}>
          <Tooltip title="切换到键盘输入">
            <Button
              type="text"
              className={styles.toggleBtn}
              icon={<KeyOutlined />}
              onClick={() => setVoiceMode(false)}
            />
          </Tooltip>

          <button
            className={`${styles.holdBtn} ${isListening ? (isCanceling ? styles.canceling : styles.recording) : ""}`}
            disabled={isProcessing || !!sending}
            {...(isMobile
              ? {
                  onTouchStart: handleTouchStart,
                  onTouchEnd: handleTouchEnd,
                  onTouchMove: handleTouchMove,
                }
              : {
                  onClick: handleClick,
                })}
          >
            {isListening && !isProcessing && (
              <span className={styles.waves}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={styles.wave}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </span>
            )}
            <span>{voiceBtnText}</span>
          </button>
        </div>
      ) : (
        <Sender
          value={value}
          onChange={setValue}
          loading={sending}
          disabled={sending}
          className={styles.sender}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          placeholder="输入问题或使用技能"
          actions={(defaultActions) => (
            <>
              <Tooltip title="切换到语音输入">
                <Button
                  type="text"
                  className={styles.toggleBtn}
                  icon={<AudioOutlined />}
                  onClick={() => setVoiceMode(true)}
                />
              </Tooltip>
              {defaultActions}
            </>
          )}
        />
      )}
    </>
  );
};

export default SenderPanel;
