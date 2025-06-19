import { Button, Flex, FloatButton, Form, Input, Modal } from "antd";

import { useState } from "react";

import Styles from "./index.module.less";
import { SearchOutlined } from "@ant-design/icons";
import useTodoList from "./hooks/useTodoList";
import ViewSelector from "./ViewSelector";
import CardView from "./CardView";
import CalendarView from "./CalendarView";

const Todo = () => {
  const [open, setOpen] = useState(false);
  const todoActionsAndData = useTodoList({ dependencies: [open] });

  const [form] = Form.useForm()

  const view = Form.useWatch('view', form)
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
            <Form>
              <Form form={form} initialValues={{view: 'card'}}>
                {/* 视图：日历视图/卡片视图 */}
                <Form.Item name="view">
                  <ViewSelector />
                </Form.Item>
              </Form>
            </Form>
            {/* 状态：全部/未完成/已完成 */}
            {/* 时间：全部/近一周/近一个月/自定义 */}
            {/* 类型: 全部/工作/学习/生活 */}

            {/* 列表 */}
            {view === 'card' ? <CardView {...todoActionsAndData} /> : <CalendarView {...todoActionsAndData} />}
          </Flex>
        </div>
      </Modal>
    </>
  );
};
export default Todo;
