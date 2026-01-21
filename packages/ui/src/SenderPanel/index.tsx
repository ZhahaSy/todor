import { Sender } from "@ant-design/x";

import styles from "./index.module.less";
import { useState } from "react";


export interface SenderPanelProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

const SenderPanel = ({  onSubmit, onCancel, sending }: SenderPanelProps) => {
  const [value, setValue] = useState('');
  return (
    <Sender
      value={value}
      onChange={setValue}
      loading={sending}
      disabled={sending}
      className={styles.sender}
      onSubmit={(value) => {
         setValue('');
         onSubmit(value);
      }}
      onCancel={onCancel}
      placeholder="输入问题或使用技能"
    />
  );
};

export default SenderPanel;
