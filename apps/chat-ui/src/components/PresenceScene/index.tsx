import React, { useEffect, useMemo, useState } from "react";
import avatar from "@/assets/todor-3d-no-bg.png";
import styles from "./index.module.less";

export type PresenceMode = "idle" | "listening" | "thinking";

interface PresenceSceneProps {
  mode: PresenceMode;
  lastUserMessage?: string;
  speechContent?: string;
  immersive?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const getRoomTone = (message: string) => {
  if (/累|困|休息|晚安|难过|烦/.test(message)) return "warm";
  if (/开心|高兴|好消息|阳光|出去玩/.test(message)) return "sunny";
  return "normal";
};

const PresenceScene: React.FC<PresenceSceneProps> = ({
  mode,
  lastUserMessage = "",
  speechContent,
  immersive = false,
  actionLabel,
  onAction,
}) => {
  const [isAwake, setIsAwake] = useState(false);
  const roomTone = useMemo(() => getRoomTone(lastUserMessage), [lastUserMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsAwake(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const copy = {
    idle: "我在这里。",
    listening: "我听见了。",
    thinking: "让我想一想。",
  }[mode];
  const speech = speechContent?.trim() || copy;

  return (
    <section
      className={`${styles.scene} ${styles[roomTone]} ${immersive ? styles.immersive : ""} ${isAwake ? styles.awake : ""}`}
      aria-label="元的在场空间"
    >
      <div className={styles.sceneHeader}>
        <div>
          <span className={styles.eyebrow}>元 · 在场实验</span>
          <h1>他住在这里</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.statusDot} aria-label={mode} />
          {actionLabel && onAction && (
            <button type="button" className={styles.sceneAction} onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      <div className={styles.room}>
        <div className={styles.window}>
          <span />
          <span />
          <i />
        </div>
        <div className={styles.shelf}>
          <b />
          <b />
          <b />
        </div>
        <div className={styles.floor} />
        <button
          type="button"
          className={`${styles.character} ${styles[mode]}`}
          onClick={() => {
            setIsAwake(true);
          }}
          aria-label="和他打个招呼"
        >
          <img src={avatar} alt="" />
          <span className={styles.speech}>{speech}</span>
        </button>
        <div className={styles.plant} aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
      </div>

      <p className={styles.caption}>不必先想好要说什么，进来坐一会儿。</p>
    </section>
  );
};

export default PresenceScene;
