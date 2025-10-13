import type { FormProps } from "antd";
import { Button, Form, Input, InputNumber, Radio, Space } from "antd";
import styles from "./index.module.less";
import { createUser } from "@client/api";
import { setCookie } from "@client/utils";
import todor from "../assets/todor-3d-no-bg.png";
import todorText from "../assets/todor-text-no-bg.png";
import { CreateUserDto } from "../../../entities";


const onFinish: FormProps<CreateUserDto>["onFinish"] = async (values) => {
  const res = await createUser(values);
  setCookie("token", res.token, 7);
  window.location.replace("/");
};

const onFinishFailed: FormProps<CreateUserDto>["onFinishFailed"] = (errorInfo) => {
  console.log("Failed:", errorInfo);
};

const App = () => (
  <div className={styles.loginLayout}>
    <img
      src={todor}
      width={100}
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
      }}
      alt="logo"
    />

    <Form
      name="basic"
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 16 }}
      style={{
        margin: "20px 60px 0px",
        borderRadius: 10,
        position: "relative",
      }}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      layout="vertical"
      autoComplete="off"
      size="large"
    >
      <img
        src={todorText}
        width={150}
        style={{
          position: "absolute",
          top: -50,
          left: -5,
        }}
        alt="logo"
      />
      <Form.Item<CreateUserDto>
        label="用户名"
        name="name"
        required={false}
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input style={{ width: 200 }} placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item<CreateUserDto>
        label="密码"
        name="password"
        required={false}
        rules={[{ required: true, message: "请输入密码" }]}
      >
        <Input.Password style={{ width: 200 }} placeholder="请输入密码" />
      </Form.Item>
      <Form.Item<CreateUserDto>
        label="确认密码"
        name="confirm_password"
        required={false}
        rules={[{ required: true, message: "请输入确认密码" }]}
      >
        <Input.Password style={{ width: 200 }} placeholder="请输入确认密码" />
      </Form.Item>

      <Form.Item<CreateUserDto>
        label="邮箱"
        name="email"
        required={false}
        rules={[{ required: true, message: "请输入邮箱" }]}
      >
        <Input style={{ width: 200 }} placeholder="请输入邮箱" />
      </Form.Item>

      <Form.Item<CreateUserDto>
        label="手机号"
        name="phone"
        required={false}
        rules={[{ required: true, message: "请输入手机号" }]}
      >
        <Input style={{ width: 200 }} placeholder="请输入手机号" />
      </Form.Item>
      <Form.Item<CreateUserDto>
        label="性别"
        name="gender"
        required={false}
        rules={[{ required: true, message: "请选择性别" }]}
      >
        <Space>
          <Radio.Group>
            <Radio value="male">男</Radio>
            <Radio value="female">女</Radio>
          </Radio.Group>
        </Space>
      </Form.Item>

      <Form.Item<CreateUserDto>
        label="年龄"
        name="age"
        required={false}
        rules={[{ required: true, message: "请输入年龄" }]}
      >
        <InputNumber style={{ width: 200 }} placeholder="请输入年龄" />
      </Form.Item>

      <Form.Item label={null}>
        <Button style={{ width: "100%" }} type="primary" htmlType="submit">
          注册
        </Button>
      </Form.Item>
    </Form>
  </div>
);

export default App;
