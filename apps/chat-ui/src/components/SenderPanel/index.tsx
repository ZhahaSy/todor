import { Sender } from "@ant-design/x";

import styles from "./index.module.less";

interface SenderPanelProps {
  value: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onChange?: (value: string) => void;
}

const SenderPanel = ({ value, onSubmit, onCancel, onChange }: SenderPanelProps) => {
  return (
    <Sender
      className={styles.sender}
      value={value}
      onSubmit={onSubmit}
      onCancel={onCancel}
      placeholder="输入问题或使用技能"
      onChange={onChange}
    />
  );
};

export default SenderPanel;
