import { Badge, Calendar, Popover, Typography } from "antd";
import { UseTodoListReturn } from "./hooks/useTodoList";
import dayjs from "dayjs";

const statusMap: Record<
  "low" | "medium" | "high",
  "success" | "warning" | "error"
> = {
  low: "success",
  medium: "warning",
  high: "error",
};

const CalendarView = (
  props: UseTodoListReturn & { onChange: (date: dayjs.Dayjs) => void }
) => {
  const { todoList, onChange } = props;

  const cellRender = (value: dayjs.Dayjs) => {
    const date = value.date();
    const todos = todoList.filter(
      (todo) => dayjs(todo.todoTime).date() === date
    );
    if (!todos.length) return null;

    const listContent = (
      <>
        {todos.map((todo) => (
          <li
            style={{ whiteSpace: "nowrap", gap: 4, display: "flex" }}
            key={todo.id}
          >
            <Badge status={statusMap[todo.priority]} />
            <Typography.Text ellipsis>{todo.title}</Typography.Text>
          </li>
        ))}
      </>
    );
    return (
      <Popover trigger="click" content={listContent}>
        <ul style={{ height: "100%" }}>{listContent}</ul>
      </Popover>
    );
  };
  return (
    <div style={{ width: "800px", borderRadius: 12 }}>
      <Calendar
        style={{
          width: "100%",
          padding: "12px",
          overflow: "scroll",
        }}
        cellRender={cellRender}
        onChange={onChange}
      />
    </div>
  );
};
export default CalendarView;
