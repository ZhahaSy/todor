import FastChat from "@/components/FastChat";
import CardView from "@/components/Todo/CardView";
import useTodoList from "@/components/Todo/hooks/useTodoList";
import SearchForm from "./SearchForm";

import { Form } from "antd";
import { useEditForm } from "@client/ui";

const Todo = () => {
  const [formRef] = Form.useForm();

  const todoActionsAndData = useTodoList({
    readyOn: true,
  });

  const { onEdit, contextHolder } = useEditForm();
  return (
    <div style={{ marginRight: 20, paddingTop: 12, overflow: "auto", width: '100%' }}>
      <SearchForm form={formRef} onValuesChange={(value) => todoActionsAndData.getTodoList(value)} />
      <CardView onEdit={(todo) => onEdit(todo.id)} {...todoActionsAndData} />
      <FastChat />
      {contextHolder}
    </div>
  );
};
export default Todo;
