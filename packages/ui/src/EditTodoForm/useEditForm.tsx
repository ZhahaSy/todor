import { Form, Modal } from "antd";
import EditTodoForm from ".";
import { updateTodo } from "../../../api";

const useEditForm = () => {
  const [editForm] = Form.useForm();

  const [modal, contextHolder] = Modal.useModal();

  const onEditOk = async () => {
    const res = await editForm?.validateFields();
    await updateTodo(res);
  };
  const onEdit = (todoId: string) => {
    modal.confirm({
      centered: false,
      icon: null,
      title: "修改信息",
      content: <EditTodoForm todoId={todoId} form={editForm} />,
      okText: "确认",
      okType: "primary",
      onOk: onEditOk,
      width: '80%',
    });
  };
  return {
    onEdit,
    contextHolder,
  };
};
export default useEditForm;
