import FastChat from "@/components/FastChat";
import CardView from "@/components/Todo/CardView";
import useTodoList from "@/components/Todo/hooks/useTodoList";
import SearchForm from "./SearchForm";

import { Form } from "antd";

const Todo = () => {
  const [formRef] = Form.useForm();

  const todoActionsAndData = useTodoList({
    readyOn: true,
  }, formRef);
  return (
    <div style={{ marginRight: 20, paddingTop: 12, overflow: "auto", width: '100%' }}>
      <SearchForm formRef={formRef} onValuesChange={(value) => todoActionsAndData.getTodoList(value)} />
      <CardView {...todoActionsAndData} />
      <FastChat />
    </div>
  );
};
export default Todo;
