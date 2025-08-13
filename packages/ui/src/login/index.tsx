import React from "react";
import type { FormProps } from "antd";
import { Button, Form, Input } from "antd";
import styles from "./index.module.less";
import { login } from "@client/api";
import { setCookie } from "@client/utils";
import todor from "../assets/todor-3d-no-bg.png";
import todorText from "../assets/todor-text-no-bg.png";
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
        }}
        alt="logo"
      />
      <Form.Item<FieldType>
        label="用户名"
        name="username"
        required={false}
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input style={{ width: 200 }} placeholder="请输入用户名" />
      </Form.Item>

      <Form.Item<FieldType>
        label="密码"
        name="password"
        required={false}
        rules={[{ required: true, message: "请输入密码" }]}
      >
        <Input.Password style={{ width: 200 }} placeholder="请输入密码" />
      </Form.Item>

      <Form.Item label={null}>
        <Button style={{ width: "100%" }}>注册</Button>

        <Button style={{ width: "100%" }} type="primary" htmlType="submit">
          登录
        </Button>
      </Form.Item>
    </Form>
  </div>
);

export default App;
