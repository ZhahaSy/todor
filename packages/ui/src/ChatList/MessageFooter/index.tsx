import styles from "./index.module.less";
import { Actions } from "@ant-design/x";
import { EditOutlined, BranchesOutlined } from "@ant-design/icons";
import useEditForm from "../../EditTodoForm/useEditForm";
import { ChatHistory } from "@client/entities";

interface MessageFooterProps {
  curMessage: ChatHistory;
  onDeepDive?: () => void;
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
  const { curMessage, onDeepDive } = props;
  const { date = "", todoId } = curMessage;
  const { onEdit, contextHolder } = useEditForm();

  const actionItems = [];
  if (curMessage.role === "ai" && todoId) {
    actionItems.push({
      key: "edit",
      icon: <EditOutlined />,
      label: "修改",
      onItemClick: () => onEdit(todoId),
    });
  }
  if (curMessage.role === "ai") {
    actionItems.push({
      key: "deepdive",
      icon: <BranchesOutlined />,
      label: "深入",
      onItemClick: () => onDeepDive?.(),
    });
  }

  return (
    <div className={styles.messageFooter}>
      {actionItems.length > 0 ? <Actions items={actionItems} /> : null}
      <div>{isToday(date) ? date.slice(10, 16) : date.slice(0, 10)}</div>
      {contextHolder}
    </div>
  );
};

export default MessageFooter;
