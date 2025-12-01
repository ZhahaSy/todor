import styles from "./index.module.less";
import { Actions } from "@ant-design/x";
import { EditOutlined } from "@ant-design/icons";
import { Form, Modal } from "antd";
import EditTodoForm from "../../EditTodoForm";
import { updateTodo } from "../../../../api";
import useEditForm from "../../EditTodoForm/useEditForm";

interface MessageFooterProps {
  curMessage: {
    date: string;
    todoId: string;
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
  const { onEdit, contextHolder } = useEditForm();

  
  return (
    <div className={styles.messageFooter}>
      <Actions
        items={[
          {
            key: "eidt",
            icon: <EditOutlined />,
            label: "修改",
            onItemClick: () => onEdit(curMessage.todoId),
          },
        ]}
      />
      <div>{isToday(date) ? date.slice(10, 16) : date.slice(0, 10)}</div>
      {contextHolder}
    </div>
  );
};

export default MessageFooter;
