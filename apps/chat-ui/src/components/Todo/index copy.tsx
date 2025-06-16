import { Button, Drawer, Flex, FloatButton, List, Radio, Space } from "antd";

import * as TodoApi from "../../api/todo";
import { useEffect, useState } from "react";
import { TodoItemEntity } from "../../entities/todo";

import Styles from "./index.module.less";

const Todo = () => {
  const [open, setOpen] = useState(false);
  const [todoList, setTodoList] = useState<TodoItemEntity[]>([]);
  const getTodoList = async () => {
    const res = await TodoApi.getTodoList();
    setTodoList(res);
  };

  const addTodo = async () => {
    await TodoApi.addTodo({
      title: "新任务",
      content: "新任务内容",
      type: "life",
    });
    getTodoList();
  };
  const updateTodoStatus = async (
    id: string,
    status: "active" | "completed"
  ) => {
    await TodoApi.updateTodo({
      id,
      status,
    });
    getTodoList();
  };

  const deleteTodo = async (id: string) => {
    await TodoApi.deleteTodo(id);
    getTodoList();
  };
  useEffect(() => {
    if (open) {
      getTodoList();
    }
  }, [open]);
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
      <Drawer
        width="60%"
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="待办列表"
      >
        <Flex>
          <Button type="primary" onClick={addTodo}>
            新增
          </Button>
        </Flex>
        <List
          className={Styles.todoWrap}
          dataSource={todoList}
          renderItem={(item) => (
            <List.Item
              className={Styles.todoItem}
              key={item.id}
              extra={
                <Space direction="vertical">
                  <Button
                    size="small"
                    type="link"
                    onClick={() => updateTodoStatus(item.id, "completed")}
                  >
                    完成
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    danger
                    onClick={() => deleteTodo(item.id)}
                  >
                    删除
                  </Button>
                </Space>
              }
            >
              <List.Item.Meta
                title={
                  <>
                    {item.title} | {item.type} |{ item.todoTime}
                  </>
                }
                description={item.content}
              ></List.Item.Meta>
            </List.Item>
          )}
        ></List>
      </Drawer>
    </>
  );
};
export default Todo;
