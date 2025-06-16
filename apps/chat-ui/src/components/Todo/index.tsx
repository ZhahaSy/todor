import {
  Button,
  Drawer,
  Flex,
  FloatButton,
  Form,
  Input,
  List,
  Modal,
  Radio,
  Space,
} from "antd";

import * as TodoApi from "../../api/todo";
import { useEffect, useState } from "react";
import { TodoItemEntity } from "../../entities/todo";

import Styles from "./index.module.less";
import { SearchOutlined } from "@ant-design/icons";
import useTodoList from "./hooks/useTodoList";

const Todo = () => {
  const [open, setOpen] = useState(false);
  const { todoList, getTodoList, addTodo, updateTodoStatus, deleteTodo } =
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
          <Input.Search
            styles={{
              input: {
                height: "80px",
              },
              suffix: {
                height: "80px",
              },
            }}
            size="large"
            enterButton={
              <Button style={{ height: "80px", width: "80px" }}>
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
            <Form>
              <Form.Item>
                <Radio.Group>
                  <Radio value={1}>列表视图</Radio>
                  <Radio value={2}>卡片视图</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          {/* 列表 */}
          
        </div>
        {/*  */}
      </Modal>
    </>
  );
};
export default Todo;
