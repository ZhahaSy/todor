import { Calendar } from "antd";
import { UseTodoListReturn } from "./hooks/useTodoList";

const CalendarView = (props: UseTodoListReturn) => {
  const { todoList, updateTodoStatus, deleteTodo } = props;
  return (
    <div style={{ width: "800px" }}>
      <Calendar fullscreen={false} />
    </div>
  );
};
export default CalendarView;
