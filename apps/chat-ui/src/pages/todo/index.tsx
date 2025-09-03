import FastChat from "@/components/FastChat";
import CardView from "@/components/Todo/CardView";
import useTodoList from "@/components/Todo/hooks/useTodoList";
import TypeSelector from "@/components/Todo/TypeSelector";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";

const todo = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const todoActionsAndData = useTodoList({
    readyOn: true,
  });
  return (
    <div style={{ paddingTop: 12, overflow: "auto" }}>
      <TypeSelector variant="borderless" mode="tags" />
      <Input.Search
        style={{ position: "sticky", top: 12, marginBottom: 30, zIndex: 1 }}
        styles={{
          input: {
            height: "50px",
          },
          suffix: {
            height: "50px",
          },
        }}
        enterButton={
          <Button style={{ height: "50px", width: "50px" }}>
            <SearchOutlined />
          </Button>
        }
        placeholder="输入关键词"
      />
      <CardView {...todoActionsAndData} />
      <FastChat />
    </div>
  );
};
export default todo;
