import { Button, Card, Col, Flex, Row, Space, Spin, Typography } from "antd";
import LevelTag from "./LevelTag";
import TypeTag from "./TypeTag";
import { EditFilled, CloseCircleFilled } from "@ant-design/icons";
import Styles from "./index.module.less";
import { UseTodoListReturn } from "./hooks/useTodoList";
import { TodoItemEntity } from "@client/entities";

const CardView = (props:UseTodoListReturn & { onEdit: (todo: TodoItemEntity) => void }) => {
  const { todoList, loading, actionLoading, updateTodoStatus, deleteTodo, onEdit } = props;

  if (loading && todoList.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Spin spinning={actionLoading}>
      <Row gutter={10}>
        {todoList.map((todo) => (
          <Col className={Styles.todoCard} span={12}>
            <Card
              onDoubleClick={() =>
                updateTodoStatus(
                  todo.id,
                  todo.status === "completed" ? "active" : "completed"
                )
              }
              className={
                todo.status === "completed" ? Styles.todoCardCompleted : ""
              }
              key={todo.id}
              title={
                <Flex gap={4}>
                  <span>{todo.title}</span>
                  <LevelTag level={todo.priority} />
                  <TypeTag type={todo.type} />
                </Flex>
              }
              extra={
                <Space>
                  <Button danger type="text" onClick={() => onEdit(todo)}>
                    <EditFilled />
                  </Button>
                  <Button onClick={() => deleteTodo(todo.id)} type="text">
                    <CloseCircleFilled />
                  </Button>
                </Space>
              }
            >
              <Card.Meta
                description={
                  <>
                    <Typography.Text ellipsis={{tooltip: todo.content}}>{todo.content}</Typography.Text>
                    <div>{todo.todoTime}</div>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Spin>
  );
};
export default CardView;
