import { useRequest } from "ahooks";
import { Form, Input, Radio, Switch, DatePicker, FormInstance, Checkbox } from "antd";
import { getTodoById } from "../../../api";
import dayjs from "dayjs";

const Textarea = Input.TextArea;


interface EditTodoFormProps {
  todoId: string;
  form: FormInstance;
}
const EditTodoForm = (props: EditTodoFormProps) => {
  const { todoId, form } = props;

  const { data } = useRequest(async () => await getTodoById(todoId));

  form.setFieldsValue({
    ...data,
    todoTime: data?.todoTime ? dayjs(data?.todoTime) : undefined,
  });
  return (
    <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
      <Form.Item noStyle name="id" />
      <Form.Item label="标题" name="title">
        <Input />
      </Form.Item>
      <Form.Item label="内容" name="content">
        <Textarea />
      </Form.Item>
      <Form.Item label="类型" name="type">
        <Checkbox.Group
          options={[
            { label: "工作", value: "work" },
            { label: "生活", value: "life" },
            { label: "学习", value: "study" },
          ]}
        />
      </Form.Item>
      <Form.Item label="是否紧急" name="isUrgent">
        <Switch />
      </Form.Item>
      <Form.Item label="状态" name="status">
        <Radio.Group
          options={[
            { label: "未完成", value: "active" },
            { label: "已完成", value: "completed" },
          ]}
        />
      </Form.Item>
      <Form.Item label="截止时间" name="todoTime">
        <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
      </Form.Item>
    </Form>
  );
};

export default EditTodoForm;
