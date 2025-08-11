import { Sender } from "@ant-design/x";

import styles from "./index.module.less";


export interface SenderPanelProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

const SenderPanel = ({  onSubmit, onCancel, sending }: SenderPanelProps) => {
  return (
    <Sender
      loading={sending}
      disabled={sending}
      className={styles.sender}
      onSubmit={onSubmit}
      onCancel={onCancel}
      placeholder="输入问题或使用技能"
    />
  );
};

export default SenderPanel;
