import { Button, Flex, FloatButton, Form, Input, Modal } from "antd";

import { useMemo, useState } from "react";

import Styles from "./index.module.less";
import { SearchOutlined } from "@ant-design/icons";
import useTodoList from "./hooks/useTodoList";
import ViewSelector from "./ViewSelector";
import CardView from "./CardView";
import CalendarView from "./CalendarView";
import TypeSelector from "./TypeSelector";

const Todo = () => {
  const [open, setOpen] = useState(false);

  const [calendarData, setCalendarData] = useState<string>();

  const [form] = Form.useForm();

  const view = Form.useWatch("view", form);
  const type = Form.useWatch("type", form);

  const getListParams = useMemo(() => ({
    todoMonth: view === "calendar" ? calendarData : undefined,
    type: type?.join(','),
  }), [view, calendarData, type]);

  const todoActionsAndData = useTodoList({
    readyOn: !!open,
    getListParams,
  });


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
            height: "900px",
            minWidth: "80%",
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
          <Flex vertical={true}>
            {/* 筛选项 */}
            <Form
              form={form}
              layout="inline"
              style={{ marginBottom: "10px" }}
              initialValues={{ view: "card" }}
            >
              {/* 视图：日历视图/卡片视图 */}
              <Form.Item name="view">
                <ViewSelector className={Styles.viewSelector} />
              </Form.Item>
              {/* 类型：全部/工作/学习/生活 */}
              <Form.Item name="type">
                <TypeSelector
                  className={Styles.viewSelector}
                />
              </Form.Item>
            </Form>
            {view === "card" && (
              <Input.Search
                className={Styles.todoSearch}
                styles={{
                  input: {
                    height: "30px",
                  },
                  suffix: {
                    height: "30px",
                  },
                }}
                enterButton={
                  <Button style={{ height: "30px", width: "30px" }}>
                    <SearchOutlined />
                  </Button>
                }
                placeholder="输入关键词"
              />
            )}

            {/* 状态：全部/未完成/已完成 */}
            {/* 时间：全部/近一周/近一个月/自定义 */}
            {/* 类型: 全部/工作/学习/生活 */}

            {/* 列表 */}
            {view === "card" ? (
              <CardView {...todoActionsAndData} />
            ) : (
              <CalendarView
                onChange={(val) => {
                  setCalendarData(val.format("YYYY-MM"));
                }}
                {...todoActionsAndData}
              />
            )}
          </Flex>
        </div>
      </Modal>
    </>
  );
};
export default Todo;
