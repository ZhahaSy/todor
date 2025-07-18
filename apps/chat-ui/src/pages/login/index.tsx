import React from "react";
import type { FormProps } from "antd";
import { Button, Form, Input, Space } from "antd";
import styles from "./index.module.less";
import { login } from "@/api/user";
import { setCookie } from "@/utils/cookie";

type FieldType = {
  username: string;
  password: string;
};

const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
  const res = await login(values);
  setCookie("token", res.token, 7);
  window.location.href = "/";
};

const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (errorInfo) => {
  console.log("Failed:", errorInfo);
};

const App: React.FC = () => (
  <div className={styles.loginLayout}>
    <Form
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 1200 }}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item<FieldType>
        label="用户名"
        name="username"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item<FieldType>
        label="密码"
        name="password"
        rules={[{ required: true, message: "请输入密码" }]}
      >
        <Input.Password placeholder="请输入密码" />
      </Form.Item>

      <Form.Item label={null}>
        <Space>
          <Button>注册</Button>

          <Button type="primary" htmlType="submit">
            登录
          </Button>
        </Space>
      </Form.Item>
    </Form>
  </div>
);

export default App;
