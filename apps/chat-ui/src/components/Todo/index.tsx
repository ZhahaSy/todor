import {
  Button,
  Card,
  Col,
  Flex,
  FloatButton,
  Input,
  Modal,
  Row,
  Space,
} from "antd";

import { useState } from "react";

import Styles from "./index.module.less";
import {
  CloseCircleFilled,
  EditFilled,
  SearchOutlined,
} from "@ant-design/icons";
import useTodoList from "./hooks/useTodoList";
import LevelTag from "./LevelTag";
import TypeTag from "./TypeTag";

const Todo = () => {
  const [open, setOpen] = useState(false);
  const { todoList, updateTodoStatus, deleteTodo } =
    useTodoList({ dependencies: [open] });
  return (
    <>
      <FloatButton
        onClick={() => {
          setOpen((preState) => !preState);
        }}
        icon={null}
        style={{ width: 40, height: 40, left: 80, bottom: "20%" }}
        description="待办列表"
      ></FloatButton>
      <Modal
        styles={{
          content: {
            background: "rgba(0,0,0,0)",
            boxShadow: "none",
            height: "800px",
          },
        }}
        maskClosable
        onClose={() => {
          setOpen(false);
        }}
        onCancel={() => {
          setOpen(false);
        }}
        open={open}
        centered
        closable={false}
        footer={null}
        width={"80%"}
      >
        <div
          className={`layout-center ${Styles.todoWrapper}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Flex vertical={true} gap={30}>
            <Input.Search
              className={Styles.todoSearch}
              styles={{
                input: {
                  height: "60px",
                },
                suffix: {
                  height: "60px",
                },
              }}
              size="large"
              enterButton={
                <Button style={{ height: "60px", width: "80px" }}>
                  <SearchOutlined />
                </Button>
              }
              placeholder="输入关键词"
            />
            {/* 筛选项 */}
            {/* 视图：列表视图/卡片视图 */}
            {/* 状态：全部/未完成/已完成 */}
            {/* 时间：全部/近一周/近一个月/自定义 */}
            {/* 类型: 全部/工作/学习/生活 */}

            {/* 列表 */}

            <Row gutter={20}>
              {todoList.map((todo) => (
                <Col className={Styles.todoCard} span={12}>
                  <Card
                    onDoubleClick={() => updateTodoStatus(todo.id, todo.status === 'completed' ? 'active' : 'completed')}
                    className={todo.status === 'completed' ? Styles.todoCardCompleted : ''}
                    key={todo.id}
                    title={<Flex gap={4}>
                    <span>{todo.title}</span>
                    <LevelTag level={todo.priority}/>
                    <TypeTag type={todo.type} />
                    </Flex>}
                    extra={
                      <Space>
                        <Button danger type="text">
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
                          <div>{todo.content}</div>
                          <div>{todo.todoTime}</div>
                        </>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Flex>
        </div>
      </Modal>
    </>
  );
};
export default Todo;
