import styles from "./index.module.less";
import { Actions } from "@ant-design/x";
import { EditOutlined } from "@ant-design/icons";

interface MessageFooterProps {
  curMessage: {
    date: string;
  };
}

const isToday = (date: string) => {
  const today = new Date();
  const messageDate = new Date(date);
  return (
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear()
  );
};

const MessageFooter = (props: MessageFooterProps) => {
  const { curMessage } = props;
  const { date = '' } = curMessage;
  const onEdit = () => {
    console.log("修改", curMessage);
  };
  return (
    <div className={styles.messageFooter}>
      <Actions
        items={[
          {
            key: "eidt",
            icon: <EditOutlined />,
            label: "修改",
            onItemClick: onEdit,
          },
        ]}
      />
      <div>{isToday(date) ? date.slice(10, 16) : date.slice(0, 10)}</div>
    </div>
  );
};

export default MessageFooter;
