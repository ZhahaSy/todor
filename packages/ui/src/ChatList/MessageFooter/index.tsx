import styles from "./index.module.less";
import { Actions } from "@ant-design/x";
import { EditOutlined } from "@ant-design/icons";

interface MessageFooterProps {
  curMessage: {
    date: string;
  };
}

const MessageFooter = (props: MessageFooterProps) => {
  const { curMessage } = props;
  const { date } = curMessage;
  return (
    <div className={styles.messageFooter}>
      <Actions
        items={[
          {
            key: "eidt",
            icon: <EditOutlined />,
            label: "修改",
          },
        ]}
      />
      <div>{date}</div>
    </div>
  );
};

export default MessageFooter;
